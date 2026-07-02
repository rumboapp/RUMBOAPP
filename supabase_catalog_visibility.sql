-- ============================================================
-- RUMBO — Visibilidad por actividad en el catálogo público
-- Ejecutar completo en el SQL Editor de Supabase.
-- Agrega el switch "visible en catálogo": actividades activas
-- pero excluidas del link público (ej. tours privados).
-- ============================================================

alter table activities add column if not exists show_in_catalog boolean not null default true;

-- Filtrar en el catálogo público
create or replace function get_public_catalog(p_token text)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_agc agencies;
  v_activities json;
begin
  select * into v_agc from agencies where catalog_token = p_token;
  if v_agc.id is null then return null; end if;

  select coalesce(json_agg(act_row order by act_row->>'name'), '[]'::json) into v_activities
  from (
    select json_build_object(
      'id', a.id,
      'name', a.name,
      'description', a.description,
      'photo_url', a.photo_url,
      'price', a.price,
      'currency', a.currency,
      'duration_minutes', a.duration_minutes,
      'meeting_point', a.meeting_point,
      'capacity_max', a.capacity_max,
      'upcoming_departures', (
        select coalesce(json_agg(json_build_object(
          'public_token', d.public_token,
          'departure_date', d.departure_date,
          'departure_time', d.departure_time,
          'spots_left', greatest(a.capacity_max - booked_pax_of(d.id), 0)
        ) order by d.departure_date, d.departure_time), '[]'::json)
        from departures d
        where d.activity_id = a.id
          and d.status = 'programada'
          and d.departure_date::date >= current_date
          and booked_pax_of(d.id) < a.capacity_max
      )
    ) as act_row
    from activities a
    where a.agency_id = v_agc.id and a.active = true and a.show_in_catalog = true
  ) sub;

  return json_build_object(
    'agency_name', v_agc.name,
    'agency_logo', v_agc.logo_url,
    'agency_city', v_agc.city,
    'activities', v_activities
  );
end;
$$;

-- Rechazar solicitudes de fecha para actividades ocultas del catálogo
create or replace function create_date_request(
  p_token text,
  p_activity_id text,
  p_full_name text,
  p_phone text,
  p_pax_count int,
  p_requested_date date,
  p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_agc agencies;
  v_act activities;
  v_request_id uuid;
begin
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Nombre y teléfono son obligatorios.');
  end if;
  if p_pax_count is null or p_pax_count < 1 or p_pax_count > 20 then
    return jsonb_build_object('success', false, 'message', 'Cantidad de personas inválida.');
  end if;
  if p_requested_date is null or p_requested_date < current_date then
    return jsonb_build_object('success', false, 'message', 'Elige una fecha desde hoy en adelante.');
  end if;

  select * into v_agc from agencies where catalog_token = p_token;
  if v_agc.id is null then
    return jsonb_build_object('success', false, 'message', 'Catálogo no disponible.');
  end if;

  select * into v_act from activities
  where id = p_activity_id and agency_id = v_agc.id and active = true and show_in_catalog = true;
  if v_act.id is null then
    return jsonb_build_object('success', false, 'message', 'Esta actividad ya no está disponible.');
  end if;

  if exists (
    select 1 from booking_requests
    where activity_id = v_act.id
      and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
      and status = 'pending' and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'message', 'Ya tienes una solicitud pendiente para esta actividad. La agencia te contactará pronto.');
  end if;

  insert into booking_requests (agency_id, departure_id, activity_id, requested_date, full_name, phone, pax_count, note, expires_at)
  values (v_agc.id, null, v_act.id, p_requested_date, trim(p_full_name), trim(p_phone), p_pax_count,
          nullif(trim(coalesce(p_note, '')), ''), now() + interval '7 days')
  returning id into v_request_id;

  insert into notifications (id, agency_id, kind, title, message, departure_id, read, created_at)
  values (
    'not-' || gen_random_uuid()::text,
    v_agc.id, 'system', 'Nueva solicitud de fecha',
    format('%s solicitó %s cupo(s) para %s el %s. Revísala en el panel.', trim(p_full_name), p_pax_count, v_act.name, p_requested_date),
    null, false, now()
  );

  return jsonb_build_object('success', true, 'request_id', v_request_id);
end;
$$;
