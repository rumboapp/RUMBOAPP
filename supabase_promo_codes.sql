-- ============================================================
-- Sistema de códigos de prueba gratuita (15 días de Plan Premium)
-- Ejecutar completo en el SQL Editor de Supabase.
-- No modifica nada de las tablas/funciones de Mercado Pago.
-- ============================================================

-- 1. Columna de expiración del trial en agencies
alter table agencies add column if not exists trial_expires_at timestamptz;

-- 2. Catálogo de códigos promocionales
create table if not exists promo_codes (
  code text primary key,
  plan text not null check (plan in ('premium', 'pro')),
  duration_days int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Registro de qué agencia ya usó qué código (evita reuso por la misma agencia)
create table if not exists promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  code text not null references promo_codes(code),
  redeemed_at timestamptz not null default now(),
  unique (agency_id, code)
);

alter table promo_codes enable row level security;
alter table promo_code_redemptions enable row level security;

-- Nadie accede directo a estas tablas desde el cliente; todo pasa por la RPC de abajo.
revoke all on promo_codes from anon, authenticated;
revoke all on promo_code_redemptions from anon, authenticated;

-- 4. Tu código de prueba: 15 días de Plan Premium
insert into promo_codes (code, plan, duration_days, active)
values ('PRUEBA15', 'premium', 15, true)
on conflict (code) do nothing;

-- 5. RPC que valida y aplica el código (llamada desde la app)
create or replace function redeem_promo_code(p_agency_id uuid, p_code text)
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

  insert into promo_code_redemptions (agency_id, code) values (p_agency_id, v_code);

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

grant execute on function redeem_promo_code(uuid, text) to authenticated;

-- 6. Función que revierte trials vencidos a Free y pausa el excedente,
--    igual que una baja de plan real (misma lógica que enforcePlanLimits
--    en los Edge Functions, pero en SQL para correr por cron).
create or replace function revert_expired_trials()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  activity_limit int := 3; -- límite del Plan Free
  guide_limit int := 2;    -- límite del Plan Free
begin
  for r in
    select id from agencies
    where trial_expires_at is not null
      and trial_expires_at < now()
      and subscription_plan != 'free'
  loop
    update agencies
    set subscription_plan = 'free',
        subscription_status = 'free',
        trial_expires_at = null,
        updated_at = now()
    where id = r.id;

    update activities set active = false
    where id in (
      select id from activities
      where agency_id = r.id and active = true
      order by created_at desc
      offset activity_limit
    );

    update guides set active = false
    where id in (
      select id from guides
      where agency_id = r.id and active = true
      order by created_at desc
      offset guide_limit
    );
  end loop;
end;
$$;

-- 7. Programar la reversión automática diaria (requiere extensión pg_cron,
--    activable en Database > Extensions en el dashboard de Supabase).
-- Ejecutar UNA SOLA VEZ después de activar la extensión:
-- select cron.schedule('revert-expired-trials', '0 3 * * *', $$select revert_expired_trials();$$);
