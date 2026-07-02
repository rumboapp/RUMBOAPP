-- ============================================================
-- RUMBO — Reservas públicas v1 (link de invitación por salida)
-- Ejecutar completo en el SQL Editor de Supabase.
--
-- 1) agencies.payment_info: datos de pago de la agencia (link de
--    Webpay/MercadoPago o datos de transferencia) que se envían
--    por WhatsApp al confirmar una reserva.
-- 2) departures.public_token: identificador no adivinable para el
--    link público de reserva de cada salida.
-- 3) booking_requests: solicitudes de reserva hechas desde la
--    página pública, pendientes de confirmación del admin.
-- 4) RPCs públicas (anon): ver salida por token y crear solicitud,
--    con bloqueo de cupo, anti-duplicados y expiración a 48h.
-- ============================================================

-- 1) Campo de información de pago de la agencia
alter table agencies add column if not exists payment_info text;

-- 2) Token público por salida (no adivinable, backfill incluido)
alter table departures add column if not exists public_token text unique default gen_random_uuid()::text;
update departures set public_token = gen_random_uuid()::text where public_token is null;

-- 3) Tabla de solicitudes de reserva
create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id text not null references agencies(id) on delete cascade,
  departure_id text not null references departures(id) on delete cascade,
  full_name text not null,
  phone text not null,
  pax_count int not null check (pax_count between 1 and 20),
  note text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  -- Si el admin no resuelve en 48h, la solicitud deja de bloquear cupo
  expires_at timestamptz not null default now() + interval '48 hours',
  resolved_at timestamptz
);

create index if not exists idx_booking_requests_agency on booking_requests(agency_id, status);
create index if not exists idx_booking_requests_departure on booking_requests(departure_id, status);

alter table booking_requests enable row level security;

-- La agencia ve y resuelve sus solicitudes; NADIE inserta directo
-- desde el cliente (solo la RPC create_booking_request).
drop policy if exists "select_own_agency_booking_requests" on booking_requests;
create policy "select_own_agency_booking_requests" on booking_requests
for select using (agency_id in (select my_agency_ids()));

drop policy if exists "update_own_agency_booking_requests" on booking_requests;
create policy "update_own_agency_booking_requests" on booking_requests
for update using (agency_id in (select my_agency_ids()))
with check (agency_id in (select my_agency_ids()));

-- Helper: cupos ocupados de una salida = pasajeros inscritos
-- + solicitudes pendientes no vencidas + confirmadas (aún sin pasajero creado)
create or replace function booked_pax_of(p_departure_id text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(pax_count) from passengers where departure_id = p_departure_id), 0)
       + coalesce((select sum(pax_count) from booking_requests
                   where departure_id = p_departure_id
                     and status = 'pending'
                     and expires_at > now()), 0);
$$;

-- 4a) RPC pública: información de una salida por token
create or replace function get_public_departure(p_token text)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_dep departures;
  v_act activities;
  v_agc agencies;
  v_booked int;
begin
  select * into v_dep from departures where public_token = p_token;
  if v_dep.id is null then return null; end if;

  select * into v_act from activities where id = v_dep.activity_id;
  select * into v_agc from agencies where id = v_dep.agency_id;

  v_booked := booked_pax_of(v_dep.id);

  return json_build_object(
    'departure_date', v_dep.departure_date,
    'departure_time', v_dep.departure_time,
    'status', v_dep.status,
    'activity_name', v_act.name,
    'activity_description', v_act.description,
    'activity_photo', v_act.photo_url,
    'price', v_act.price,
    'currency', v_act.currency,
    'duration_minutes', v_act.duration_minutes,
    'meeting_point', v_act.meeting_point,
    'capacity_max', v_act.capacity_max,
    'spots_left', greatest(v_act.capacity_max - v_booked, 0),
    'agency_name', v_agc.name,
    'agency_logo', v_agc.logo_url,
    'agency_city', v_agc.city
  );
end;
$$;

grant execute on function get_public_departure(text) to anon, authenticated;

-- 4b) RPC pública: crear una solicitud de reserva
create or replace function create_booking_request(
  p_token text,
  p_full_name text,
  p_phone text,
  p_pax_count int,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_dep departures;
  v_act activities;
  v_booked int;
  v_request_id uuid;
begin
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Nombre y teléfono son obligatorios.');
  end if;
  if p_pax_count is null or p_pax_count < 1 or p_pax_count > 20 then
    return jsonb_build_object('success', false, 'message', 'Cantidad de personas inválida.');
  end if;

  -- Bloquear la fila de la salida: dos solicitudes simultáneas por el
  -- último cupo se procesan en serie y la segunda ve el cupo ya tomado.
  select * into v_dep from departures where public_token = p_token for update;
  if v_dep.id is null then
    return jsonb_build_object('success', false, 'message', 'Esta salida ya no está disponible.');
  end if;
  if v_dep.status <> 'programada' or v_dep.departure_date::date < current_date then
    return jsonb_build_object('success', false, 'message', 'Esta salida ya no acepta reservas.');
  end if;

  select * into v_act from activities where id = v_dep.activity_id;

  v_booked := booked_pax_of(v_dep.id);
  if v_booked + p_pax_count > v_act.capacity_max then
    return jsonb_build_object('success', false, 'message',
      format('No quedan cupos suficientes (disponibles: %s).', greatest(v_act.capacity_max - v_booked, 0)));
  end if;

  -- Anti-duplicados: mismo teléfono con solicitud pendiente en esta salida
  if exists (
    select 1 from booking_requests
    where departure_id = v_dep.id
      and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
      and status = 'pending' and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'message', 'Ya tienes una solicitud pendiente para esta salida. La agencia te contactará pronto.');
  end if;

  insert into booking_requests (agency_id, departure_id, full_name, phone, pax_count, note)
  values (v_dep.agency_id, v_dep.id, trim(p_full_name), trim(p_phone), p_pax_count, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_request_id;

  insert into notifications (id, agency_id, kind, title, message, departure_id, read, created_at)
  values (
    'not-' || gen_random_uuid()::text,
    v_dep.agency_id, 'system', 'Nueva solicitud de reserva',
    format('%s solicitó %s cupo(s) para %s del %s. Confírmala en el panel.', trim(p_full_name), p_pax_count, v_act.name, v_dep.departure_date),
    v_dep.id, false, now()
  );

  return jsonb_build_object('success', true, 'request_id', v_request_id);
end;
$$;

grant execute on function create_booking_request(text, text, text, int, text) to anon, authenticated;
