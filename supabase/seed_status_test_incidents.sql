-- Run after migrations 0001 and 0002.
-- Creates 3 test incidents for every operational status.

with status_cases(status, base_id, assigned_responder_name, assigned_unit) as (
  values
    ('new_alert'::public.incident_status, 101, null, 'Unassigned'),
    ('assigned'::public.incident_status, 111, 'Ronie Delos Santos', 'MDRRMO Rescue Unit'),
    ('en_route'::public.incident_status, 121, 'LT PNP Patrol 2', 'PNP Patrol Unit'),
    ('on_scene'::public.incident_status, 131, 'BFP La Trinidad Unit 1', 'BFP Response Team'),
    ('responding'::public.incident_status, 141, 'EMS Team Alpha', 'EMS Team'),
    ('resolved'::public.incident_status, 151, 'Barangay Pico Response Desk', 'Barangay Response Team'),
    ('closed'::public.incident_status, 161, 'MDRRMO Field Team Bravo', 'MDRRMO Rescue Unit'),
    ('need_backup'::public.incident_status, 171, 'Ronie Delos Santos', 'MDRRMO Rescue Unit'),
    ('false_alert'::public.incident_status, 181, 'EMS Team Bravo', 'EMS Team')
),
location_cases(idx, category, device_id, location_name, approximate_address, node_location, coordinates, context) as (
  values
    (0, 'medical'::public.emergency_category, 'LT-NODE-005', 'Km. 5 Pico', 'Km. 5, Barangay Pico, La Trinidad, Benguet', 'Pico roadside node', '16.4558, 120.5892', 'Resident reports a person needing urgent medical assistance near the roadside.'),
    (1, 'security_public_safety'::public.emergency_category, 'LT-NODE-002', 'Public Market', 'La Trinidad Public Market, Km. 5, La Trinidad', 'Market entrance node', '16.4612, 120.5899', 'Public safety concern reported near the produce loading area.'),
    (2, 'fire_disaster'::public.emergency_category, 'LT-NODE-006', 'Transport Terminal', 'Municipal transport terminal, La Trinidad', 'Terminal bay node', '16.4597, 120.5908', 'Possible fire or disaster-related report near the terminal bay.')
)
insert into public.incidents (
  public_id,
  category,
  priority,
  status,
  device_id,
  location_name,
  approximate_address,
  node_location,
  coordinates,
  occurred_at,
  trigger_method,
  voice_context_available,
  voice_duration,
  caller_context,
  assigned_unit,
  assigned_responder_name
)
select
  'NG-2026-' || (status_cases.base_id + location_cases.idx)::text,
  location_cases.category,
  case
    when status_cases.status in ('new_alert', 'assigned') then 'critical'::public.incident_priority
    when location_cases.idx = 0 then 'critical'::public.incident_priority
    else 'high'::public.incident_priority
  end,
  status_cases.status,
  location_cases.device_id,
  location_cases.location_name,
  location_cases.approximate_address,
  location_cases.node_location,
  location_cases.coordinates,
  '2026-07-06 08:42+08'::timestamptz - (((status_cases.base_id - 101) / 10)::int || '0 minutes')::interval - (location_cases.idx || ' minutes')::interval,
  case when location_cases.idx = 1 then 'button' else 'voice' end,
  not (status_cases.status = 'new_alert' and location_cases.idx = 2),
  case location_cases.idx when 0 then '00:12' when 1 then '00:09' else '00:15' end,
  location_cases.context || ' Test case for ' || replace(initcap(status_cases.status::text), '_', ' ') || '.',
  status_cases.assigned_unit,
  status_cases.assigned_responder_name
from status_cases
cross join location_cases
on conflict (public_id) do update set
  category = excluded.category,
  priority = excluded.priority,
  status = excluded.status,
  device_id = excluded.device_id,
  location_name = excluded.location_name,
  approximate_address = excluded.approximate_address,
  node_location = excluded.node_location,
  coordinates = excluded.coordinates,
  occurred_at = excluded.occurred_at,
  trigger_method = excluded.trigger_method,
  voice_context_available = excluded.voice_context_available,
  voice_duration = excluded.voice_duration,
  caller_context = excluded.caller_context,
  assigned_unit = excluded.assigned_unit,
  assigned_responder_name = excluded.assigned_responder_name;
