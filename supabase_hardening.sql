-- ============================================================
-- RUMBO — Hardening de seguridad (jul/2026)
-- Ejecutar completo en el SQL Editor de Supabase.
--
-- 1) Bloquea que un cliente cambie su propio plan de suscripción
--    (subscription_plan / subscription_status / trial_expires_at /
--    mp_preapproval_id) vía API. Solo las Edge Functions (service
--    role) y las RPC autorizadas pueden modificarlos.
-- 2) Valida en la base los límites de plan (actividades, guías y
--    salidas semanales del plan Free), que antes solo se chequeaban
--    en el navegador.
-- 3) Verificación / programación del cron que revierte trials
--    vencidos (ver bloque final).
-- ============================================================

-- ──────────────────────────────────────────────
-- Helper: ¿es una escritura privilegiada?
--  - Sin claims JWT (SQL Editor, cron, conexiones directas)
--  - service_role (Edge Functions de Mercado Pago)
--  - GUC rumbo.allow_plan_change activado por una RPC confiable
-- ──────────────────────────────────────────────
create or replace function rumbo_is_privileged() returns boolean
language plpgsql stable as $$
declare
  v_claims text := coalesce(current_setting('request.jwt.claims', true), '');
begin
  if coalesce(current_setting('rumbo.allow_plan_change', true), '') = 'on' then
    return true;
  end if;
  if v_claims = '' then
    return true;
  end if;
  return coalesce((v_claims::jsonb)->>'role', '') = 'service_role';
end;
$$;

-- ──────────────────────────────────────────────
-- 1) Proteger columnas de suscripción en agencies
-- (silenciosamente conserva los valores originales en vez de
-- fallar, para no romper el flujo normal de edición de agencia)
-- ──────────────────────────────────────────────
create or replace function protect_agency_plan_columns() returns trigger
language plpgsql as $$
begin
  if rumbo_is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.subscription_plan := 'free';
    new.subscription_status := 'free';
    new.trial_expires_at := null;
    new.mp_preapproval_id := null;
    return new;
  end if;
  new.subscription_plan := old.subscription_plan;
  new.subscription_status := old.subscription_status;
  new.trial_expires_at := old.trial_expires_at;
  new.mp_preapproval_id := old.mp_preapproval_id;
  return new;
end;
$$;

drop trigger if exists trg_protect_agency_plan on agencies;
create trigger trg_protect_agency_plan
before insert or update on agencies
for each row execute function protect_agency_plan_columns();

-- Autorizar a la RPC de códigos promo a cambiar el plan
-- (misma lógica que antes + set_config local a la transacción)
create or replace function redeem_promo_code(p_agency_id text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_promo promo_codes%rowtype;
begin
  select * into v_promo from promo_codes where code = v_code and active = true;

  if v_promo.code is null then
    return jsonb_build_object('success', false, 'message', 'Código inválido o inactivo.');
  end if;

  if exists (select 1 from promo_code_redemptions where agency_id = p_agency_id and code = v_code) then
    return jsonb_build_object('success', false, 'message', 'Tu agencia ya utilizó este código antes.');
  end if;

  -- Solo el dueño de la agencia puede canjear para su agencia
  if not exists (select 1 from agencies where id = p_agency_id and owner_id = auth.uid()::text) then
    return jsonb_build_object('success', false, 'message', 'No autorizado para esta agencia.');
  end if;

  insert into promo_code_redemptions (agency_id, code) values (p_agency_id, v_code);

  perform set_config('rumbo.allow_plan_change', 'on', true);

  update agencies
  set subscription_plan = v_promo.plan,
      trial_expires_at = now() + (v_promo.duration_days || ' days')::interval,
      updated_at = now()
  where id = p_agency_id;

  return jsonb_build_object(
    'success', true,
    'message', format('¡Listo! Tienes Plan %s gratis por %s días.', initcap(v_promo.plan), v_promo.duration_days)
  );
end;
$$;

grant execute on function redeem_promo_code(text, text) to authenticated;

-- ──────────────────────────────────────────────
-- 2) Límites de plan validados en la base
-- ──────────────────────────────────────────────

create or replace function rumbo_plan_of(p_agency_id text) returns text
language sql stable as $$
  select coalesce(subscription_plan, 'free') from agencies where id = p_agency_id;
$$;

-- 2a) Actividades: free 3 / premium 10 / pro 50
create or replace function enforce_activity_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_limit int;
  v_count int;
begin
  if rumbo_is_privileged() then return new; end if;
  v_plan := rumbo_plan_of(new.agency_id);
  v_limit := case v_plan when 'pro' then 50 when 'premium' then 10 else 3 end;

  if tg_op = 'INSERT' then
    select count(*) into v_count from activities where agency_id = new.agency_id;
    if v_count >= v_limit then
      raise exception 'Tu plan % permite hasta % actividades.', v_plan, v_limit;
    end if;
  elsif tg_op = 'UPDATE' and new.active and not coalesce(old.active, false) then
    select count(*) into v_count from activities where agency_id = new.agency_id and active;
    if v_count >= v_limit then
      raise exception 'Tu plan % permite hasta % actividades activas.', v_plan, v_limit;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_activity_limits on activities;
create trigger trg_enforce_activity_limits
before insert or update on activities
for each row execute function enforce_activity_limits();

-- 2b) Guías: free 2 / premium 20 / pro 100
-- Se valida al ACTIVAR un guía (los guías se registran inactivos a la
-- espera de aprobación, y ese registro no debe bloquearse por límite).
create or replace function enforce_guide_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_limit int;
  v_count int;
begin
  if rumbo_is_privileged() then return new; end if;
  if not (new.active and (tg_op = 'INSERT' or not coalesce(old.active, false))) then
    return new;
  end if;
  v_plan := rumbo_plan_of(new.agency_id);
  v_limit := case v_plan when 'pro' then 100 when 'premium' then 20 else 2 end;
  select count(*) into v_count from guides where agency_id = new.agency_id and active;
  if v_count >= v_limit then
    raise exception 'Tu plan % permite hasta % guías activos.', v_plan, v_limit;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_guide_limits on guides;
create trigger trg_enforce_guide_limits
before insert or update on guides
for each row execute function enforce_guide_limits();

-- 2c) Salidas: plan Free máx. 5 por semana calendario (lunes-domingo),
-- igual que la validación del frontend.
create or replace function enforce_departure_limits() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_count int;
  v_monday date;
  v_sunday date;
begin
  if rumbo_is_privileged() then return new; end if;
  v_plan := rumbo_plan_of(new.agency_id);
  if v_plan <> 'free' then return new; end if;

  v_monday := date_trunc('week', new.departure_date::date)::date;
  v_sunday := v_monday + 6;

  select count(*) into v_count from departures
  where agency_id = new.agency_id
    and departure_date::date between v_monday and v_sunday;

  if v_count >= 5 then
    raise exception 'Tu plan Free permite hasta 5 salidas por semana.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_departure_limits on departures;
create trigger trg_enforce_departure_limits
before insert on departures
for each row execute function enforce_departure_limits();

-- ──────────────────────────────────────────────
-- 3) Cron de reversión de trials vencidos
-- Paso 1: activar la extensión pg_cron en el dashboard
--         (Database > Extensions > pg_cron).
-- Paso 2: verificar si el job ya existe:
--         select * from cron.job;
-- Paso 3: si NO existe, programarlo (descomenta y ejecuta):
-- select cron.schedule('revert-expired-trials', '0 3 * * *', $$select revert_expired_trials();$$);
-- ──────────────────────────────────────────────
