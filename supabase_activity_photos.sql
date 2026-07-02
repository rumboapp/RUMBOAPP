-- ============================================================
-- RUMBO — Hasta 3 fotos por actividad (galería en catálogo público)
-- Ejecutar completo en el SQL Editor de Supabase.
-- photo_url se mantiene como portada (compatibilidad); photo_urls
-- guarda la galería completa (portada incluida).
-- ============================================================

alter table activities add column if not exists photo_urls text[] not null default '{}';

-- Backfill: actividades existentes parten con su foto actual como galería
update activities set photo_urls = array[photo_url]
where (photo_urls is null or cardinality(photo_urls) = 0)
  and photo_url is not null and photo_url <> '';

-- Incluir la galería en el catálogo público
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
      'photo_urls', coalesce(a.photo_urls, '{}'),
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

-- Incluir la galería en la página pública de reserva por salida
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
    'activity_photos', coalesce(v_act.photo_urls, '{}'),
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
