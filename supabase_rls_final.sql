-- ============================================================
-- RUMBO — RLS final aplicado en producción (24/06).
-- Refleja el estado real de las policies tal como quedaron
-- en Supabase tras el proceso de hardening tabla por tabla.
-- Guardar como referencia / para reaplicar en otro entorno.
-- ============================================================

-- ──────────────────────────────────────────────
-- Funciones helper (SECURITY DEFINER para evitar
-- recursión infinita en policies de agency_members,
-- e incluyen también a los owners de agencia,
-- que no tienen fila propia en agency_members)
-- ──────────────────────────────────────────────
create or replace function my_agency_ids() returns setof text
language sql security definer stable as $$
  select agency_id from agency_members where user_id = auth.uid()::text
  union
  select id from agencies where owner_id = auth.uid()::text;
$$;

create or replace function my_admin_agency_ids() returns setof text
language sql security definer stable as $$
  select agency_id from agency_members where user_id = auth.uid()::text and role = 'admin'
  union
  select id from agencies where owner_id = auth.uid()::text;
$$;

-- ──────────────────────────────────────────────
-- 1) agency_members
-- ──────────────────────────────────────────────
drop policy if exists "select_own_memberships" on agency_members;
drop policy if exists "write_own_agency_memberships" on agency_members;
drop policy if exists "self_join_as_member" on agency_members;

create policy "select_own_memberships" on agency_members
for select using (
  user_id = (auth.uid()::text)
  or agency_id in (select my_agency_ids())
);

create policy "write_own_agency_memberships" on agency_members
for all using (
  agency_id in (select my_admin_agency_ids())
)
with check (
  agency_id in (select my_admin_agency_ids())
);

-- Excepción: un guía debe poder insertar su propia fila al unirse con código de invitación
create policy "self_join_as_member" on agency_members
for insert with check (
  user_id = (auth.uid()::text)
);

-- ──────────────────────────────────────────────
-- 2) agencies
-- (SELECT es público a propósito: necesario para que un
-- guía nuevo pueda buscar la agencia por join_code antes
-- de ser miembro. Los datos expuestos -nombre, ciudad,
-- logo, join_code- son de baja sensibilidad).
-- ──────────────────────────────────────────────
drop policy if exists "select_own_agency" on agencies;
drop policy if exists "select_any_agency" on agencies;
drop policy if exists "insert_agency_as_owner" on agencies;
drop policy if exists "write_own_agency" on agencies;
drop policy if exists "delete_own_agency" on agencies;

create policy "select_any_agency" on agencies
for select using (true);

create policy "insert_agency_as_owner" on agencies
for insert with check (
  owner_id = (auth.uid()::text)
);

create policy "write_own_agency" on agencies
for update using (owner_id = (auth.uid()::text))
with check (owner_id = (auth.uid()::text));

create policy "delete_own_agency" on agencies
for delete using (owner_id = (auth.uid()::text));

-- ──────────────────────────────────────────────
-- 3) activities
-- ──────────────────────────────────────────────
drop policy if exists "select_own_agency_activities" on activities;
drop policy if exists "write_own_agency_activities" on activities;

create policy "select_own_agency_activities" on activities
for select using (agency_id in (select my_agency_ids()));

create policy "write_own_agency_activities" on activities
for all using (agency_id in (select my_agency_ids()))
with check (agency_id in (select my_agency_ids()));

-- ──────────────────────────────────────────────
-- 4) guides
-- ──────────────────────────────────────────────
drop policy if exists "select_own_agency_guides" on guides;
drop policy if exists "write_own_agency_guides" on guides;

create policy "select_own_agency_guides" on guides
for select using (agency_id in (select my_agency_ids()));

create policy "write_own_agency_guides" on guides
for all using (agency_id in (select my_agency_ids()))
with check (agency_id in (select my_agency_ids()));

-- ──────────────────────────────────────────────
-- 5) departures
-- ──────────────────────────────────────────────
drop policy if exists "select_own_agency_departures" on departures;
drop policy if exists "write_own_agency_departures" on departures;

create policy "select_own_agency_departures" on departures
for select using (agency_id in (select my_agency_ids()));

create policy "write_own_agency_departures" on departures
for all using (agency_id in (select my_agency_ids()))
with check (agency_id in (select my_agency_ids()));

-- ──────────────────────────────────────────────
-- 6) passengers (sin agency_id propio: se filtra vía departures)
-- ──────────────────────────────────────────────
drop policy if exists "select_own_agency_passengers" on passengers;
drop policy if exists "write_own_agency_passengers" on passengers;

create policy "select_own_agency_passengers" on passengers
for select using (
  departure_id in (select id from departures where agency_id in (select my_agency_ids()))
);

create policy "write_own_agency_passengers" on passengers
for all using (
  departure_id in (select id from departures where agency_id in (select my_agency_ids()))
)
with check (
  departure_id in (select id from departures where agency_id in (select my_agency_ids()))
);

-- ──────────────────────────────────────────────
-- 7) notifications
-- ──────────────────────────────────────────────
drop policy if exists "select_own_agency_notifications" on notifications;
drop policy if exists "write_own_agency_notifications" on notifications;

create policy "select_own_agency_notifications" on notifications
for select using (agency_id in (select my_agency_ids()));

create policy "write_own_agency_notifications" on notifications
for all using (agency_id in (select my_agency_ids()))
with check (agency_id in (select my_agency_ids()));

-- ──────────────────────────────────────────────
-- 8) users (perfil propio + perfiles de compañeros de agencia,
-- incluye owners ademas de agency_members)
-- ──────────────────────────────────────────────
drop policy if exists "select_self_or_agencymates" on users;
drop policy if exists "write_own_profile" on users;
drop policy if exists "update_own_profile" on users;

create policy "select_self_or_agencymates" on users
for select using (
  id = (auth.uid()::text)
  or id in (select user_id from agency_members where agency_id in (select my_agency_ids()))
  or id in (select owner_id from agencies where id in (select my_agency_ids()))
);

create policy "write_own_profile" on users
for insert with check (id = (auth.uid()::text));

create policy "update_own_profile" on users
for update using (id = (auth.uid()::text))
with check (id = (auth.uid()::text));

-- ──────────────────────────────────────────────
-- 9) Función RPC para completar el registro de un guía
-- (SECURITY DEFINER: corre aunque la sesión todavía no
-- esté activa por falta de confirmación de email; el
-- confirm-email obligatorio se mantiene sin cambios).
-- ──────────────────────────────────────────────
create or replace function complete_guide_signup(
  p_user_id text,
  p_join_code text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_avatar_url text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency record;
  v_member_id text;
  v_guide_id text;
  v_notif_id text;
begin
  if not exists (select 1 from auth.users where id = p_user_id::uuid) then
    raise exception 'Usuario no encontrado';
  end if;

  select id into v_agency from agencies where join_code = upper(trim(p_join_code)) limit 1;
  if v_agency.id is null then
    raise exception 'Código de agencia inválido';
  end if;

  if exists (select 1 from agency_members where agency_id = v_agency.id and user_id = p_user_id) then
    return json_build_object('success', true, 'already_member', true);
  end if;

  v_member_id := 'mem-' || substr(md5(random()::text), 1, 9);
  insert into agency_members (id, agency_id, user_id, role, created_at)
  values (v_member_id, v_agency.id, p_user_id, 'guia', now());

  v_guide_id := 'gd-' || substr(md5(random()::text), 1, 9);
  insert into guides (id, agency_id, user_id, full_name, phone, email, specialties, active, avatar_url, created_at, updated_at)
  values (v_guide_id, v_agency.id, p_user_id, p_full_name, p_phone, lower(trim(p_email)), array['Turismo general'], false, coalesce(p_avatar_url, ''), now(), now());

  v_notif_id := 'not-' || substr(md5(random()::text), 1, 9);
  insert into notifications (id, agency_id, kind, title, message, read, created_at)
  values (v_notif_id, v_agency.id, 'system', 'Nueva solicitud de guía', p_full_name || ' solicitó unirse a tu agencia. Requiere aprobación en el panel de Guías.', false, now());

  return json_build_object('success', true, 'member_id', v_member_id, 'guide_id', v_guide_id);
end;
$$;

grant execute on function complete_guide_signup(text, text, text, text, text, text) to anon, authenticated;

-- ──────────────────────────────────────────────
-- 10) Función RPC para completar el registro de un admin/agencia
-- (SECURITY DEFINER: corre aunque la sesión todavía no esté
-- activa por falta de confirmación de email, igual que
-- complete_guide_signup).
-- ──────────────────────────────────────────────
create or replace function complete_admin_signup(
  p_user_id text,
  p_email text,
  p_full_name text,
  p_agency_name text,
  p_city text,
  p_latitude numeric,
  p_longitude numeric,
  p_logo_url text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id text;
  v_join_code text;
  v_notif_id text;
begin
  if not exists (select 1 from auth.users where id = p_user_id::uuid) then
    raise exception 'Usuario no encontrado';
  end if;

  insert into users (id, email, full_name, avatar_url)
  values (p_user_id, lower(trim(p_email)), p_full_name, coalesce(p_logo_url, ''))
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

  if exists (select 1 from agencies where owner_id = p_user_id) then
    select id into v_agency_id from agencies where owner_id = p_user_id limit 1;
    return json_build_object('success', true, 'already_owner', true, 'agency_id', v_agency_id);
  end if;

  v_agency_id := 'agc-' || substr(md5(random()::text), 1, 9);
  v_join_code := upper(substr(regexp_replace(p_agency_name, '[^A-Za-z0-9]', '', 'g'), 1, 4)) || floor(1000 + random() * 9000)::text;

  insert into agencies (id, owner_id, name, join_code, logo_url, city, latitude, longitude, subscription_plan, created_at, updated_at)
  values (
    v_agency_id, p_user_id, p_agency_name, v_join_code,
    coalesce(nullif(p_logo_url, ''), 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=150'),
    p_city, p_latitude, p_longitude, 'free', now(), now()
  );

  v_notif_id := 'not-' || substr(md5(random()::text), 1, 9);
  insert into notifications (id, agency_id, kind, title, message, read, created_at)
  values (v_notif_id, v_agency_id, 'system', '¡Bienvenido a Rumbo!', 'Tu agencia ' || p_agency_name || ' ha sido creada. Código de guías: ' || v_join_code, false, now());

  return json_build_object('success', true, 'agency_id', v_agency_id, 'join_code', v_join_code);
end;
$$;

grant execute on function complete_admin_signup(text, text, text, text, text, numeric, numeric, text) to anon, authenticated;

-- ──────────────────────────────────────────────
-- 11) Funciones RPC para la página pública de firma de
-- declaración de riesgo (la abre el pasajero vía WhatsApp,
-- sin sesión iniciada, por lo que las policies normales de
-- passengers/departures/activities no aplican).
-- ──────────────────────────────────────────────
create or replace function get_passenger_for_signature(p_passenger_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_passenger passengers;
  v_departure departures;
  v_activity activities;
begin
  select * into v_passenger from passengers where id = p_passenger_id;
  if v_passenger is null then
    return null;
  end if;

  select * into v_departure from departures where id = v_passenger.departure_id;
  select * into v_activity from activities where id = v_departure.activity_id;

  return json_build_object(
    'passenger', row_to_json(v_passenger),
    'departure', row_to_json(v_departure),
    'activity', row_to_json(v_activity)
  );
end;
$$;

grant execute on function get_passenger_for_signature(text) to anon, authenticated;

create or replace function sign_risk_waiver(p_passenger_id text, p_signature text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update passengers
  set signed_risk_waiver = true,
      signature_data = p_signature,
      signed_at = now()
  where id = p_passenger_id;

  if not found then
    raise exception 'Pasajero no encontrado';
  end if;

  return json_build_object('success', true);
end;
$$;

grant execute on function sign_risk_waiver(text, text) to anon, authenticated;
