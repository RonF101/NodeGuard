create extension if not exists pgcrypto;

create type public.user_role as enum ('personnel', 'admin', 'super_admin');
create type public.emergency_category as enum ('medical', 'security_public_safety', 'fire_disaster');
create type public.incident_priority as enum ('critical', 'high', 'medium', 'low');
create type public.incident_status as enum ('new_alert', 'assigned', 'en_route', 'on_scene', 'responding', 'resolved', 'closed', 'need_backup', 'false_alert');
create type public.availability_status as enum ('available', 'dispatched', 'busy', 'offline');
create type public.notification_type as enum ('assignment', 'status_request', 'assignment_changed', 'priority_changed', 'general');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'personnel',
  agency_unit text not null,
  contact_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.responders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  public_code text not null unique,
  name text not null,
  role text not null,
  agency_unit text not null,
  contact_number text,
  availability public.availability_status not null default 'available',
  current_assignment text,
  last_status_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.device_locations (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  name text not null,
  location_name text not null,
  approximate_address text not null,
  coordinates text not null,
  map_x numeric(5,2) not null check (map_x >= 0 and map_x <= 100),
  map_y numeric(5,2) not null check (map_y >= 0 and map_y <= 100),
  zone text not null,
  status text not null default 'online' check (status in ('online', 'maintenance', 'offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  category public.emergency_category not null,
  priority public.incident_priority not null,
  status public.incident_status not null default 'assigned',
  device_id text not null references public.device_locations(device_id),
  location_name text not null,
  approximate_address text not null,
  node_location text not null,
  coordinates text not null,
  occurred_at timestamptz not null,
  trigger_method text not null default 'voice' check (trigger_method in ('button', 'voice')),
  voice_context_available boolean not null default false,
  voice_duration text not null default '00:00',
  caller_context text not null,
  assigned_unit text not null,
  assigned_responder_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incident_assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  responder_id uuid references public.responders(id) on delete set null,
  assigned_unit text not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  notes text
);

create table public.incident_status_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  responder_id uuid references public.responders(id) on delete set null,
  status public.incident_status not null,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  responder_id uuid references public.responders(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete cascade,
  type public.notification_type not null default 'general',
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.voice_contexts (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  storage_path text,
  transcript text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index incidents_status_idx on public.incidents(status);
create index incidents_priority_idx on public.incidents(priority);
create index incidents_occurred_at_idx on public.incidents(occurred_at desc);
create index incidents_device_id_idx on public.incidents(device_id);
create index assignments_incident_idx on public.incident_assignments(incident_id);
create index assignments_responder_idx on public.incident_assignments(responder_id);
create index status_updates_incident_idx on public.incident_status_updates(incident_id, created_at desc);
create index notifications_recipient_idx on public.notifications(recipient_profile_id, is_read, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger responders_set_updated_at before update on public.responders for each row execute function public.set_updated_at();
create trigger device_locations_set_updated_at before update on public.device_locations for each row execute function public.set_updated_at();
create trigger incidents_set_updated_at before update on public.incidents for each row execute function public.set_updated_at();

create or replace function public.apply_incident_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.incidents
  set status = new.status
  where id = new.incident_id;

  update public.responders
  set
    availability = case
      when new.status in ('resolved', 'closed', 'false_alert') then 'available'::public.availability_status
      when new.status = 'need_backup' then 'busy'::public.availability_status
      else 'busy'::public.availability_status
    end,
    last_status_update = now()
  where id = new.responder_id;

  return new;
end;
$$;

create trigger incident_status_updates_apply
after insert on public.incident_status_updates
for each row execute function public.apply_incident_status_update();

alter table public.profiles enable row level security;
alter table public.responders enable row level security;
alter table public.device_locations enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_assignments enable row level security;
alter table public.incident_status_updates enable row level security;
alter table public.notifications enable row level security;
alter table public.voice_contexts enable row level security;

create policy "authenticated profiles can read profiles" on public.profiles
for select to authenticated using (true);

create policy "users can update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "authenticated users can read operational responders" on public.responders
for select to authenticated using (true);

create policy "responders can update own availability" on public.responders
for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "authenticated users can read device locations" on public.device_locations
for select to authenticated using (true);

create policy "authenticated users can read incidents" on public.incidents
for select to authenticated using (true);

create policy "authenticated users can read assignments" on public.incident_assignments
for select to authenticated using (true);

create policy "authenticated users can read status updates" on public.incident_status_updates
for select to authenticated using (true);

create policy "authenticated responders can submit status updates" on public.incident_status_updates
for insert to authenticated with check (created_by = auth.uid());

create policy "users can read own notifications" on public.notifications
for select to authenticated using (recipient_profile_id = auth.uid() or recipient_profile_id is null);

create policy "users can update own notifications" on public.notifications
for update to authenticated using (recipient_profile_id = auth.uid()) with check (recipient_profile_id = auth.uid());

create policy "authenticated users can read voice context metadata" on public.voice_contexts
for select to authenticated using (true);

alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.responders;
alter publication supabase_realtime add table public.incident_assignments;
alter publication supabase_realtime add table public.incident_status_updates;
alter publication supabase_realtime add table public.notifications;

insert into public.device_locations (device_id, name, location_name, approximate_address, coordinates, map_x, map_y, zone, status) values
('LT-NODE-001', 'Pico Alert Node', 'Pico', 'Barangay Pico, La Trinidad, Benguet', '16.4550, 120.5888', 20, 52, 'North corridor', 'online'),
('LT-NODE-002', 'Public Market Alert Node', 'Public Market', 'La Trinidad Public Market, Km. 5, La Trinidad', '16.4612, 120.5899', 56, 38, 'Market area', 'online'),
('LT-NODE-003', 'Km. 4 Alert Node', 'Km. 4', 'Km. 4 commercial strip, La Trinidad', '16.4526, 120.5877', 38, 28, 'Central corridor', 'online'),
('LT-NODE-004', 'School Area Alert Node', 'School Area', 'School zone, Barangay Betag, La Trinidad', '16.4504, 120.5864', 72, 56, 'Institutional area', 'online'),
('LT-NODE-005', 'Km. 5 Pico Alert Node', 'Km. 5 Pico', 'Km. 5, Barangay Pico, La Trinidad, Benguet', '16.4558, 120.5892', 46, 62, 'North corridor', 'online'),
('LT-NODE-006', 'Transport Terminal Alert Node', 'Transport Terminal', 'Municipal transport terminal, La Trinidad', '16.4597, 120.5908', 68, 32, 'Transport area', 'maintenance');

insert into public.responders (public_code, name, role, agency_unit, contact_number, availability, current_assignment, last_status_update) values
('RESP-001', 'MDRRMO Field Team Alpha', 'Rescue Team Lead', 'MDRRMO Rescue Unit', 'Internal Radio CH-01', 'available', 'Standby at MDRRMO Office', '2026-07-06 08:50+08'),
('RESP-002', 'EMS Team Alpha', 'Medical Response Team', 'EMS', '0910-320-7446', 'busy', 'NG-2026-068', '2026-07-06 08:33+08'),
('RESP-003', 'BFP La Trinidad Unit 1', 'Fire Suppression Crew', 'BFP', '(074) 422-1131', 'busy', 'NG-2026-069', '2026-07-06 08:12+08'),
('RESP-004', 'LT PNP Patrol 2', 'Public Safety Patrol', 'PNP', '0907-117-9901', 'busy', 'NG-2026-070', '2026-07-06 08:18+08'),
('RESP-005', 'Barangay Pico Response Desk', 'Barangay First Response', 'Barangay Responders', '0939-350-6636', 'available', 'Area monitoring', '2026-07-06 08:44+08');

insert into public.incidents (
  public_id, category, priority, status, device_id, location_name, approximate_address, node_location,
  coordinates, occurred_at, trigger_method, voice_context_available, voice_duration, caller_context,
  assigned_unit, assigned_responder_name
) values
('NG-2026-071', 'medical', 'critical', 'new_alert', 'LT-NODE-005', 'Km. 5 Pico', 'Km. 5, Barangay Pico, La Trinidad, Benguet', 'Pico roadside node', '16.4558, 120.5892', '2026-07-06 08:42+08', 'voice', true, '00:12', 'Possible medical distress reported near the roadside loading area.', 'Unassigned', null),
('NG-2026-070', 'security_public_safety', 'high', 'en_route', 'LT-NODE-002', 'Public Market', 'La Trinidad Public Market, Km. 5, La Trinidad', 'Market entrance node', '16.4612, 120.5899', '2026-07-06 08:17+08', 'button', true, '00:09', 'Public safety concern flagged near the market entrance.', 'PNP Patrol Unit', 'LT PNP Patrol 2'),
('NG-2026-069', 'fire_disaster', 'high', 'responding', 'LT-NODE-006', 'Transport Terminal', 'Municipal transport terminal, La Trinidad', 'Terminal bay node', '16.4597, 120.5908', '2026-07-06 07:54+08', 'voice', false, '00:00', 'Possible fire or disaster-related report near terminal bay.', 'BFP Response Team', 'BFP La Trinidad Unit 1'),
('NG-2026-068', 'medical', 'medium', 'resolved', 'LT-NODE-004', 'School Area', 'School zone, Barangay Betag, La Trinidad', 'School area node', '16.4504, 120.5864', '2026-07-06 07:28+08', 'button', true, '00:15', 'Student medical assistance request verified and handled.', 'EMS Team', 'EMS Team Alpha'),
('NG-2026-067', 'security_public_safety', 'low', 'closed', 'LT-NODE-003', 'Km. 4', 'Km. 4 commercial strip, La Trinidad', 'Km. 4 commercial node', '16.4526, 120.5877', '2026-07-05 18:20+08', 'button', false, '00:00', 'Routine public assistance request closed after verification.', 'Barangay Response Team', 'Barangay Pico Response Desk');

insert into public.incident_status_updates (incident_id, responder_id, status, remarks)
select i.id, r.id, i.status, 'Initial seeded status.'
from public.incidents i
left join public.responders r on r.name = i.assigned_responder_name;

insert into public.notifications (incident_id, type, title, message, is_read, created_at)
select id, 'assignment', 'New incident assigned: NG-2026-071', 'Medical emergency assigned to MDRRMO Rescue Unit.', false, '2026-07-06 08:43+08'
from public.incidents where public_id = 'NG-2026-071';

insert into public.notifications (incident_id, type, title, message, is_read, created_at)
select id, 'status_request', 'Status update requested', 'Dashboard requested an updated field note for NG-2026-070.', false, '2026-07-06 08:25+08'
from public.incidents where public_id = 'NG-2026-070';

insert into public.notifications (incident_id, type, title, message, is_read, created_at)
select id, 'assignment_changed', 'Responder assignment changed', 'BFP Response Team added to transport terminal incident.', true, '2026-07-06 08:02+08'
from public.incidents where public_id = 'NG-2026-069';

insert into public.notifications (incident_id, type, title, message, is_read, created_at)
select id, 'priority_changed', 'Incident marked as high priority', 'NG-2026-069 priority was raised by MDRRMO dashboard.', true, '2026-07-06 07:59+08'
from public.incidents where public_id = 'NG-2026-069';
