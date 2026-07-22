-- Barangay-first NodeGuard operational model.
-- This migration preserves legacy roles, statuses and records while adding
-- jurisdiction, escalation and structured-reporting capabilities.

alter type public.user_role add value if not exists 'barangay_admin';
alter type public.user_role add value if not exists 'barangay_personnel';
alter type public.user_role add value if not exists 'mdrrmo_admin';
alter type public.user_role add value if not exists 'mdrrmo_operations';
alter type public.user_role add value if not exists 'field_responder';

alter type public.incident_status add value if not exists 'validated';
alter type public.incident_status add value if not exists 'dispatched';
alter type public.incident_status add value if not exists 'escalated';
alter type public.incident_status add value if not exists 'coordinated_by_mdrrmo';
alter type public.incident_status add value if not exists 'unable_to_respond';

create table if not exists public.barangays (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_participating boolean not null default true,
  emergency_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.barangays (code, name, emergency_contact)
values
  ('PICO', 'Pico', 'Barangay Pico Emergency Desk'),
  ('BETAG', 'Betag', 'Barangay Betag Emergency Desk'),
  ('BALILI', 'Balili', 'Barangay Balili Emergency Desk'),
  ('PUGUIS', 'Puguis', 'Barangay Puguis Emergency Desk')
on conflict (code) do nothing;

alter table public.profiles
  add column if not exists barangay_id uuid references public.barangays(id) on delete restrict,
  add column if not exists organization_type text,
  add column if not exists organization_name text;

update public.profiles
set organization_type = case
  when role::text in ('barangay_admin', 'barangay_personnel') or agency_unit ilike '%barangay%' then 'barangay'
  else 'mdrrmo'
end
where organization_type is null;

update public.profiles
set organization_name = case
  when organization_type = 'barangay' then coalesce(organization_name, agency_unit)
  else 'LT-MDRRMO'
end
where organization_name is null;

alter table public.device_locations
  add column if not exists barangay_id uuid references public.barangays(id) on delete restrict,
  add column if not exists camera_available boolean not null default true,
  add column if not exists device_health text not null default 'healthy',
  add column if not exists category_buttons public.emergency_category[] not null
    default array['medical', 'security_public_safety', 'fire_disaster']::public.emergency_category[];

update public.device_locations d
set barangay_id = b.id
from public.barangays b
where d.barangay_id is null
  and b.code = case
    when d.device_id in ('LT-NODE-001', 'LT-NODE-002', 'LT-NODE-005', 'LT-NODE-007') then 'PICO'
    when d.device_id = 'LT-NODE-004' then 'BETAG'
    when d.device_id = 'LT-NODE-003' then 'BALILI'
    else 'PUGUIS'
  end;

alter table public.responders
  add column if not exists barangay_id uuid references public.barangays(id) on delete restrict,
  add column if not exists organization_type text not null default 'mdrrmo';

update public.responders
set organization_type = case when agency_unit ilike '%barangay%' then 'barangay' else 'mdrrmo' end;

alter table public.response_resources
  add column if not exists barangay_id uuid references public.barangays(id) on delete restrict,
  add column if not exists organization_type text not null default 'mdrrmo';

update public.response_resources
set organization_type = case when agency = 'Barangay Responders' then 'barangay' else 'mdrrmo' end;

alter table public.incidents alter column device_id drop not null;
alter table public.incidents
  add column if not exists source_type text not null default 'node_alert',
  add column if not exists barangay_id uuid references public.barangays(id) on delete restrict,
  add column if not exists incident_description text,
  add column if not exists persons_affected integer check (persons_affected is null or persons_affected >= 0),
  add column if not exists reporting_person_source text,
  add column if not exists camera_capture_path text,
  add column if not exists validation_result text,
  add column if not exists validation_notes text,
  add column if not exists escalation_status text not null default 'not_escalated',
  add column if not exists escalation_reason text,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_by uuid references public.profiles(id) on delete set null,
  add column if not exists mdrrmo_acknowledged_at timestamptz,
  add column if not exists mdrrmo_acknowledged_by uuid references public.profiles(id) on delete set null,
  add column if not exists mdrrmo_acknowledgement_notes text,
  add column if not exists actions_taken text,
  add column if not exists resolution_details text,
  add column if not exists closure_details text,
  add column if not exists assignment_source text,
  add column if not exists assignment_instructions text,
  add column if not exists assignment_acknowledged_at timestamptz,
  add column if not exists assignment_acknowledged_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.incidents i
set barangay_id = d.barangay_id
from public.device_locations d
where i.barangay_id is null and i.device_id = d.device_id;

update public.incidents
set validation_result = case
  when validation_status = 'confirmed' then 'validated'
  when validation_status = 'false_alarm' then 'accidental_activation'
  else 'unverified'
end
where validation_result is null;

alter table public.incident_assignments
  add column if not exists assigned_by_organization text,
  add column if not exists assignment_instructions text,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledgement_note text,
  add column if not exists released_at timestamptz;

alter table public.audit_logs
  add column if not exists barangay_id uuid references public.barangays(id) on delete set null;

create or replace function public.protect_nodeguard_identity_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if tg_table_name = 'profiles' and (
      new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.agency_unit is distinct from old.agency_unit
      or new.barangay_id is distinct from old.barangay_id
      or new.organization_type is distinct from old.organization_type
      or new.organization_name is distinct from old.organization_name
    ) then
      raise exception 'Role, organization, jurisdiction, and active-state changes require an authorized administrator.';
    end if;
    if tg_table_name = 'responders' and (
      new.id is distinct from old.id
      or new.profile_id is distinct from old.profile_id
      or new.public_code is distinct from old.public_code
      or new.name is distinct from old.name
      or new.role is distinct from old.role
      or new.agency_unit is distinct from old.agency_unit
      or new.contact_number is distinct from old.contact_number
      or new.current_assignment is distinct from old.current_assignment
      or new.barangay_id is distinct from old.barangay_id
      or new.organization_type is distinct from old.organization_type
    ) then
      raise exception 'Responder identity, organization, and assignment changes require an authorized controller.';
    end if;
  end if;
  return new;
end;
$$;

create table if not exists public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('camera_capture', 'voice_recording', 'field_attachment', 'report_attachment')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_instructions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  instruction text not null,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_by_organization text not null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_barangay_idx on public.profiles(barangay_id);
create index if not exists devices_barangay_idx on public.device_locations(barangay_id);
create index if not exists incidents_barangay_status_idx on public.incidents(barangay_id, status, occurred_at desc);
create index if not exists incidents_escalation_idx on public.incidents(escalation_status, occurred_at desc);
create index if not exists responders_barangay_idx on public.responders(barangay_id);
create index if not exists resources_barangay_idx on public.response_resources(barangay_id);
create index if not exists incident_attachments_incident_idx on public.incident_attachments(incident_id, created_at desc);
create index if not exists incident_instructions_incident_idx on public.incident_instructions(incident_id, created_at desc);

create or replace function public.route_nodeguard_incident_to_barangay()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_type = 'node_alert' then
    if new.device_id is null then
      raise exception 'A Node Alert requires a registered device.';
    end if;
    select barangay_id into new.barangay_id
    from public.device_locations
    where device_id = new.device_id;
    if new.barangay_id is null then
      raise exception 'The alert node is not assigned to a participating barangay.';
    end if;
  elsif new.barangay_id is null then
    raise exception 'A Barangay Report requires an owning barangay.';
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_route_to_barangay on public.incidents;
create trigger incidents_route_to_barangay
before insert or update of device_id, source_type, barangay_id on public.incidents
for each row execute function public.route_nodeguard_incident_to_barangay();

create or replace function public.is_nodeguard_mdrrmo_user(p_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.is_active
      and p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
  );
$$;

create or replace function public.is_nodeguard_dispatcher(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.is_active
      and p.role::text in (
        'barangay_admin', 'barangay_personnel',
        'mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin'
      )
  );
$$;

create or replace function public.can_read_nodeguard_incident(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.incidents i on i.id = p_incident_id
    where p.id = auth.uid() and p.is_active
      and (
        p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
        or (
          p.role::text in ('barangay_admin', 'barangay_personnel')
          and p.barangay_id = i.barangay_id
        )
        or exists (
          select 1
          from public.responders r
          join public.incident_assignments a on a.responder_id = r.id
          where r.profile_id = p.id
            and a.incident_id = i.id
            and a.released_at is null
        )
      )
  );
$$;

create or replace function public.can_coordinate_nodeguard_incident(
  p_incident_id uuid,
  p_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.incidents i on i.id = p_incident_id
    where p.id = p_profile_id and p.is_active
      and (
        (p.role::text in ('barangay_admin', 'barangay_personnel') and p.barangay_id = i.barangay_id)
        or (
          p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
          and i.escalation_status <> 'not_escalated'
        )
      )
  );
$$;

create or replace function public.can_read_nodeguard_profile(
  p_profile_id uuid,
  p_actor_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles actor
    join public.profiles target on target.id = p_profile_id
    where actor.id = p_actor_id and actor.is_active
      and (
        actor.id = target.id
        or actor.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
        or (actor.role::text = 'barangay_admin' and actor.barangay_id = target.barangay_id)
      )
  );
$$;

create or replace function public.can_contribute_nodeguard_incident(
  p_incident_id uuid,
  p_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_coordinate_nodeguard_incident(p_incident_id, p_profile_id)
    or exists (
      select 1 from public.responders r
      join public.incident_assignments a on a.responder_id = r.id
      where r.profile_id = p_profile_id and a.incident_id = p_incident_id
        and a.released_at is null
    );
$$;

grant execute on function public.is_nodeguard_mdrrmo_user(uuid) to authenticated, service_role;
grant execute on function public.can_read_nodeguard_incident(uuid) to authenticated;
grant execute on function public.can_coordinate_nodeguard_incident(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_read_nodeguard_profile(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_contribute_nodeguard_incident(uuid, uuid) to authenticated, service_role;

alter table public.barangays enable row level security;
alter table public.incident_attachments enable row level security;
alter table public.incident_instructions enable row level security;

drop policy if exists "active users read participating barangays" on public.barangays;
create policy "active users read participating barangays" on public.barangays
for select to authenticated using (public.is_active_nodeguard_user());

drop policy if exists "authenticated profiles can read profiles" on public.profiles;
drop policy if exists "users read own profile and admins read profiles" on public.profiles;
create policy "users read profiles in their administrative scope" on public.profiles
for select to authenticated using (public.can_read_nodeguard_profile(id));

drop policy if exists "admins can read audit logs" on public.audit_logs;
create policy "lt mdrrmo users read audit logs" on public.audit_logs
for select to authenticated using (public.is_nodeguard_mdrrmo_user());

drop policy if exists "operators read authorized incidents" on public.incidents;
create policy "users read jurisdictional or assigned incidents" on public.incidents
for select to authenticated using (public.can_read_nodeguard_incident(id));

drop policy if exists "active users read device locations" on public.device_locations;
create policy "users read jurisdictional device locations" on public.device_locations
for select to authenticated using (
  public.is_nodeguard_mdrrmo_user()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.barangay_id = device_locations.barangay_id
  )
);

drop policy if exists "active users read operational responders" on public.responders;
create policy "users read jurisdictional responders" on public.responders
for select to authenticated using (
  public.is_nodeguard_mdrrmo_user()
  or profile_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.barangay_id = responders.barangay_id
  )
);

drop policy if exists "authenticated users can read resources" on public.response_resources;
create policy "users read jurisdictional resources" on public.response_resources
for select to authenticated using (
  public.is_nodeguard_mdrrmo_user()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.barangay_id = response_resources.barangay_id
  )
);

drop policy if exists "authenticated users can read resource assignments" on public.resource_assignments;
create policy "users read resource assignments for visible incidents" on public.resource_assignments
for select to authenticated using (public.can_read_nodeguard_incident(incident_id));

drop policy if exists "active users read backup requests" on public.backup_requests;
create policy "users read backup requests for visible incidents" on public.backup_requests
for select to authenticated using (public.can_read_nodeguard_incident(incident_id));

drop policy if exists "active users read backup offers" on public.backup_offers;
create policy "users read backup offers for visible incidents" on public.backup_offers
for select to authenticated using (
  exists (
    select 1 from public.backup_requests request
    where request.id = backup_offers.backup_request_id
      and public.can_read_nodeguard_incident(request.incident_id)
  )
);

create policy "users read incident attachments for visible incidents" on public.incident_attachments
for select to authenticated using (public.can_read_nodeguard_incident(incident_id));

create policy "authorized users add incident attachments" on public.incident_attachments
for insert to authenticated with check (
  uploaded_by = auth.uid()
  and public.can_contribute_nodeguard_incident(incident_id, auth.uid())
);

create policy "users read instructions for visible incidents" on public.incident_instructions
for select to authenticated using (public.can_read_nodeguard_incident(incident_id));

grant select on public.barangays, public.incident_attachments, public.incident_instructions to authenticated;
grant insert on public.incident_attachments to authenticated;

create or replace function public.classify_nodeguard_incident(
  p_incident_public_id text,
  p_validation_result text,
  p_notes text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
  v_actor_name text;
begin
  if trim(coalesce(p_notes, '')) = '' then raise exception 'Validation notes are required.'; end if;
  if p_validation_result not in (
    'validated', 'accidental_activation', 'duplicate_report', 'non_emergency',
    'unverified', 'false_or_misleading', 'fraudulent_hoax_prank'
  ) then raise exception 'Unsupported validation result.'; end if;

  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found.'; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor)
     or public.is_nodeguard_mdrrmo_user(v_actor) then
    raise exception 'Only the owning barangay may validate this alert.';
  end if;
  if v_incident.status not in ('new_alert', 'validated')
     and not (v_incident.status = 'closed' and v_incident.validation_status = 'false_alarm') then
    raise exception 'Validation is locked after dispatch or response activity begins.';
  end if;

  select full_name into v_actor_name from public.profiles where id = v_actor;
  update public.incidents
  set validation_result = p_validation_result,
      validation_notes = trim(p_notes),
      validation_status = case
        when p_validation_result = 'validated' then 'confirmed'
        when p_validation_result = 'unverified' then 'pending_review'
        else 'false_alarm'
      end,
      status = case
        when p_validation_result = 'validated' then 'validated'::public.incident_status
        when p_validation_result = 'unverified' then 'new_alert'::public.incident_status
        else 'closed'::public.incident_status
      end,
      validated_by = v_actor,
      validated_at = now(),
      updated_by = v_actor
  where id = v_incident.id;

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'validation', 'Barangay validation recorded: ' || replace(initcap(p_validation_result), '_', ' '),
    v_actor, coalesce(v_actor_name, 'Barangay personnel'), 'Barangay Personnel', 'dashboard', trim(p_notes)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'validate_incident', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('result', p_validation_result, 'notes', trim(p_notes)));
  return jsonb_build_object('ok', true, 'status', p_validation_result);
end;
$$;

create or replace function public.escalate_nodeguard_incident(
  p_incident_public_id text,
  p_reason text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
  v_actor_name text;
begin
  if trim(coalesce(p_reason, '')) = '' then raise exception 'An escalation reason is required.'; end if;
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found.'; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor)
     or public.is_nodeguard_mdrrmo_user(v_actor) then
    raise exception 'Only the owning barangay may escalate this incident.';
  end if;
  if v_incident.validation_result <> 'validated' then raise exception 'Validate the incident before escalation.'; end if;
  if v_incident.escalation_status <> 'not_escalated' then raise exception 'This incident is already escalated.'; end if;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then raise exception 'A completed incident cannot be escalated.'; end if;

  select full_name into v_actor_name from public.profiles where id = v_actor;
  update public.incidents
  set status = 'escalated', escalation_status = 'pending_acknowledgement',
      escalation_reason = trim(p_reason), escalated_at = now(), escalated_by = v_actor, updated_by = v_actor
  where id = v_incident.id;
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'escalation', 'Escalated to LT-MDRRMO with the complete incident history.',
    v_actor, coalesce(v_actor_name, 'Barangay personnel'), 'Barangay Personnel', 'dashboard', trim(p_reason)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'escalate_incident', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('reason', trim(p_reason)));
  return jsonb_build_object('ok', true, 'status', 'pending_acknowledgement');
end;
$$;

create or replace function public.acknowledge_nodeguard_escalation(
  p_incident_public_id text,
  p_notes text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
  v_actor_name text;
begin
  if trim(coalesce(p_notes, '')) = '' then raise exception 'Acknowledgement notes are required.'; end if;
  if not public.is_nodeguard_mdrrmo_user(v_actor) then raise exception 'LT-MDRRMO authorization is required.'; end if;
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found or v_incident.escalation_status = 'not_escalated' then raise exception 'Active escalation not found.'; end if;
  if v_incident.escalation_status = 'coordinating' then
    return jsonb_build_object('ok', true, 'status', 'coordinating');
  end if;
  if v_incident.escalation_status <> 'pending_acknowledgement' then
    raise exception 'This escalation is not awaiting acknowledgement.';
  end if;
  select full_name into v_actor_name from public.profiles where id = v_actor;
  update public.incidents
  set status = 'coordinated_by_mdrrmo', escalation_status = 'coordinating',
      mdrrmo_acknowledged_at = now(), mdrrmo_acknowledged_by = v_actor,
      mdrrmo_acknowledgement_notes = trim(p_notes), updated_by = v_actor
  where id = v_incident.id;
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'escalation_acknowledged', 'LT-MDRRMO acknowledged the escalation and began coordination.',
    v_actor, coalesce(v_actor_name, 'LT-MDRRMO Operations'), 'LT-MDRRMO Operations', 'dashboard', trim(p_notes)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'acknowledge_escalation', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('notes', trim(p_notes)));
  return jsonb_build_object('ok', true, 'status', 'coordinating');
end;
$$;

create or replace function public.create_barangay_incident_report(
  p_barangay_id uuid,
  p_category text,
  p_occurred_at timestamptz,
  p_location_name text,
  p_approximate_address text,
  p_coordinates text,
  p_description text,
  p_persons_affected integer,
  p_reporting_source text,
  p_actions_taken text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_profile public.profiles%rowtype;
  v_incident_id uuid := gen_random_uuid();
  v_public_id text := 'NG-BRGY-' || to_char(coalesce(p_occurred_at, now()), 'YYYYMMDD-HH24MISS-') || upper(substr(replace(v_incident_id::text, '-', ''), 1, 6));
begin
  select * into v_profile from public.profiles where id = v_actor and is_active;
  if not found or v_profile.role::text not in ('barangay_admin', 'barangay_personnel')
     or v_profile.barangay_id <> p_barangay_id then
    raise exception 'Only authorized personnel may create reports for their barangay.';
  end if;
  if trim(coalesce(p_description, '')) = '' or trim(coalesce(p_location_name, '')) = '' then
    raise exception 'Location and incident description are required.';
  end if;

  insert into public.incidents (
    id, public_id, source_type, barangay_id, category, priority, status, device_id,
    location_name, approximate_address, node_location, coordinates, occurred_at,
    trigger_method, voice_context_available, voice_duration, caller_context,
    assigned_unit, assigned_responder_name, created_by, incident_description,
    persons_affected, reporting_person_source, actions_taken, validation_status,
    validation_result, validation_notes, validated_by, validated_at, escalation_status, updated_by
  ) values (
    v_incident_id, v_public_id, 'barangay_report', p_barangay_id,
    p_category::public.emergency_category, 'medium', 'validated', null,
    trim(p_location_name), trim(coalesce(p_approximate_address, p_location_name)), trim(p_location_name),
    trim(coalesce(p_coordinates, 'Not provided')), coalesce(p_occurred_at, now()),
    'button', false, '00:00', trim(p_description), 'Barangay response unit', null, v_actor,
    trim(p_description), greatest(coalesce(p_persons_affected, 0), 0), trim(p_reporting_source),
    trim(coalesce(p_actions_taken, '')), 'confirmed', 'validated',
    'Structured report submitted by authorized barangay personnel.', v_actor, now(), 'not_escalated', v_actor
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'create_barangay_report', 'incident', v_public_id, p_barangay_id,
    jsonb_build_object('public_id', v_public_id, 'source_type', 'barangay_report'));
  return jsonb_build_object('ok', true, 'incident_id', v_public_id);
end;
$$;

grant execute on function public.classify_nodeguard_incident(text, text, text, uuid) to authenticated, service_role;
grant execute on function public.escalate_nodeguard_incident(text, text, uuid) to authenticated, service_role;
grant execute on function public.acknowledge_nodeguard_escalation(text, text, uuid) to authenticated, service_role;
grant execute on function public.create_barangay_incident_report(uuid, text, timestamptz, text, text, text, text, integer, text, text, uuid) to authenticated, service_role;

-- Dispatch and field updates use jurisdiction-aware functions. The new
-- signature also records who issued the assignment and the instructions that
-- must travel with it into the responder application.
revoke execute on function public.assign_nodeguard_responder(text, text, uuid) from authenticated;

create or replace function public.assign_nodeguard_responder(
  p_responder_code text,
  p_incident_public_id text,
  p_assignment_source text default 'NodeGuard Operations',
  p_instructions text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
begin
  select * into v_incident from public.incidents
  where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found: %', p_incident_public_id; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your active coordination scope.';
  end if;
  if v_incident.validation_result <> 'validated' then
    raise exception 'The incident must be validated before dispatch.';
  end if;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'A completed incident cannot be dispatched.';
  end if;

  select * into v_responder from public.responders
  where public_code = p_responder_code for update;
  if not found then raise exception 'Responder/team not found: %', p_responder_code; end if;
  if v_responder.availability <> 'available' then
    raise exception '% is unavailable for dispatch.', v_responder.name;
  end if;
  if public.is_nodeguard_mdrrmo_user(v_actor) then
    if v_responder.organization_type <> 'mdrrmo' then
      raise exception 'LT-MDRRMO may dispatch only municipal response units.';
    end if;
  elsif v_responder.organization_type <> 'barangay'
     or v_responder.barangay_id is distinct from v_incident.barangay_id then
    raise exception 'Barangay personnel may dispatch only their own response units.';
  end if;

  update public.incident_assignments
  set released_at = now()
  where incident_id = v_incident.id and released_at is null;
  update public.responders
  set availability = 'available', current_assignment = 'None', last_status_update = now()
  where current_assignment = v_incident.public_id;

  update public.incidents
  set assigned_responder_name = v_responder.name,
      assigned_unit = v_responder.agency_unit,
      status = 'dispatched',
      assignment_source = trim(coalesce(p_assignment_source, 'NodeGuard Operations')),
      assignment_instructions = nullif(trim(coalesce(p_instructions, '')), ''),
      assignment_acknowledged_at = null,
      assignment_acknowledged_by = null,
      updated_by = v_actor
  where id = v_incident.id;
  update public.responders
  set availability = 'dispatched', current_assignment = v_incident.public_id, last_status_update = now()
  where id = v_responder.id;

  insert into public.incident_assignments (
    incident_id, responder_id, assigned_unit, assigned_by, notes,
    assigned_by_organization, assignment_instructions
  ) values (
    v_incident.id, v_responder.id, v_responder.agency_unit, v_actor,
    'Dispatched through the barangay-first NodeGuard workflow.',
    trim(coalesce(p_assignment_source, 'NodeGuard Operations')),
    nullif(trim(coalesce(p_instructions, '')), '')
  );
  if nullif(trim(coalesce(p_instructions, '')), '') is not null then
    insert into public.incident_instructions (
      incident_id, instruction, issued_by, issued_by_organization
    ) values (
      v_incident.id, trim(p_instructions), v_actor,
      trim(coalesce(p_assignment_source, 'NodeGuard Operations'))
    );
  end if;
  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  ) values (
    v_responder.profile_id, v_responder.id, v_incident.id, 'assignment',
    'New incident assigned: ' || v_incident.public_id,
    coalesce(nullif(trim(p_instructions), ''), 'Review the incident details and acknowledge the dispatch.')
  );
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  )
  select v_incident.id, 'assignment', v_responder.name || ' was dispatched by ' ||
    trim(coalesce(p_assignment_source, 'NodeGuard Operations')) || '.',
    v_actor, p.full_name, replace(initcap(p.role::text), '_', ' '), 'dashboard',
    nullif(trim(coalesce(p_instructions, '')), '')
  from public.profiles p where p.id = v_actor;
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'assign_responder', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('responder_code', v_responder.public_code,
      'assignment_source', p_assignment_source, 'instructions', nullif(trim(coalesce(p_instructions, '')), '')));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.assign_nodeguard_responder(text, text, text, text, uuid)
to authenticated, service_role;

create or replace function public.unassign_nodeguard_responder(
  p_incident_public_id text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
begin
  select * into v_incident from public.incidents
  where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found: %', p_incident_public_id; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your active coordination scope.';
  end if;
  if v_incident.assigned_responder_name is null then
    raise exception 'This incident does not have an active responder assignment.';
  end if;
  update public.incident_assignments set released_at = now()
  where incident_id = v_incident.id and released_at is null;
  update public.responders
  set availability = 'available', current_assignment = 'None', last_status_update = now()
  where current_assignment = v_incident.public_id or name = v_incident.assigned_responder_name;
  update public.incidents
  set assigned_responder_name = null, assigned_unit = 'Unassigned', status = 'validated',
      assignment_source = null, assignment_instructions = null,
      assignment_acknowledged_at = null, assignment_acknowledged_by = null,
      updated_by = v_actor
  where id = v_incident.id;
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'unassign_responder', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('released_responder', v_incident.assigned_responder_name));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.apply_incident_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident_public_id text;
  v_assigned_responder_name text;
begin
  update public.incidents set status = new.status where id = new.incident_id;
  select public_id, assigned_responder_name into v_incident_public_id, v_assigned_responder_name
  from public.incidents where id = new.incident_id;
  if new.responder_id is not null then
    update public.responders
    set availability = case
          when new.status in ('resolved', 'closed', 'false_alert', 'unable_to_respond') then 'available'::public.availability_status
          when new.status in ('assigned', 'dispatched', 'en_route') then 'dispatched'::public.availability_status
          else 'busy'::public.availability_status
        end,
        current_assignment = case
          when new.status in ('resolved', 'closed', 'false_alert', 'unable_to_respond') then 'None'
          else v_incident_public_id
        end,
        last_status_update = now()
    where id = new.responder_id;
  elsif new.status in ('resolved', 'closed', 'false_alert', 'unable_to_respond') then
    update public.responders
    set availability = 'available', current_assignment = 'None', last_status_update = now()
    where current_assignment = v_incident_public_id or name = v_assigned_responder_name;
  end if;
  return new;
end;
$$;

create or replace function public.update_nodeguard_incident_status(
  p_incident_public_id text,
  p_status text,
  p_remarks text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_profile public.profiles%rowtype;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
  v_is_assigned boolean := false;
begin
  if p_status not in ('en_route', 'on_scene', 'responding', 'resolved', 'closed', 'unable_to_respond') then
    raise exception 'Invalid incident workflow status.';
  end if;
  select * into v_profile from public.profiles where id = v_actor and is_active;
  if not found then raise exception 'Active NodeGuard personnel access is required.'; end if;
  select * into v_incident from public.incidents
  where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found: %', p_incident_public_id; end if;
  select * into v_responder from public.responders where profile_id = v_actor limit 1;
  if v_responder.id is not null then
    select exists (
      select 1 from public.incident_assignments a
      where a.incident_id = v_incident.id and a.responder_id = v_responder.id and a.released_at is null
    ) into v_is_assigned;
    if not v_is_assigned then raise exception 'This incident is not assigned to your responder profile.'; end if;
  elsif not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your active coordination scope.';
  end if;
  if p_status = 'unable_to_respond' and v_responder.id is null then
    raise exception 'Only the assigned field responder may report inability to respond.';
  end if;
  if p_status = 'en_route' and v_incident.status not in ('assigned', 'dispatched') then
    raise exception 'Only a dispatched incident can be marked en route.';
  elsif p_status = 'on_scene' and v_incident.status not in ('en_route', 'responding') then
    raise exception 'The team must be en route before it can be marked on scene.';
  elsif p_status = 'responding' and v_incident.status not in ('assigned', 'dispatched', 'en_route', 'on_scene') then
    raise exception 'The incident must be dispatched before active response begins.';
  elsif p_status = 'resolved' and v_incident.status not in ('on_scene', 'responding', 'need_backup') then
    raise exception 'Only an active field response can be resolved.';
  elsif p_status = 'closed' and v_incident.status <> 'resolved' then
    raise exception 'Only a resolved incident can be closed.';
  elsif p_status = 'unable_to_respond' and v_incident.status not in ('assigned', 'dispatched', 'en_route', 'on_scene', 'responding', 'need_backup') then
    raise exception 'The responder cannot decline this incident at its current stage.';
  end if;
  if p_status = 'unable_to_respond' and nullif(trim(coalesce(p_remarks, '')), '') is null then
    raise exception 'A reason is required when unable to respond.';
  end if;

  insert into public.incident_status_updates (incident_id, responder_id, status, remarks, created_by)
  values (v_incident.id, v_responder.id, p_status::public.incident_status,
    coalesce(nullif(trim(p_remarks), ''), 'Status changed to ' || initcap(replace(p_status, '_', ' ')) || '.'), v_actor);
  if p_status in ('resolved', 'closed', 'unable_to_respond') then
    update public.incident_assignments set released_at = now()
    where incident_id = v_incident.id and released_at is null;
  end if;
  if p_status = 'unable_to_respond' then
    update public.incidents
    set assigned_responder_name = null, assigned_unit = 'Unassigned', updated_by = v_actor,
        assignment_acknowledged_at = null, assignment_acknowledged_by = null
    where id = v_incident.id;
  end if;
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'status', 'Incident status updated to ' || initcap(replace(p_status, '_', ' ')) || '.',
    v_actor, v_profile.full_name, replace(initcap(v_profile.role::text), '_', ' '),
    case when v_responder.id is null then 'dashboard' else 'personnel_app' end,
    nullif(trim(coalesce(p_remarks, '')), '')
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'update_incident_status', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('previous_status', v_incident.status, 'status', p_status, 'remarks', nullif(trim(coalesce(p_remarks, '')), '')));
  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.unassign_nodeguard_responder(text, uuid) to authenticated, service_role;
grant execute on function public.update_nodeguard_incident_status(text, text, text, uuid) to authenticated, service_role;

create or replace function public.acknowledge_nodeguard_assignment(
  p_incident_public_id text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
begin
  select * into v_incident from public.incidents
  where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found: %', p_incident_public_id; end if;
  select * into v_responder from public.responders where profile_id = v_actor limit 1;
  if v_responder.id is null or not exists (
    select 1 from public.incident_assignments a
    where a.incident_id = v_incident.id and a.responder_id = v_responder.id and a.released_at is null
  ) then
    raise exception 'Only the currently assigned responder may acknowledge this dispatch.';
  end if;
  if v_incident.assignment_acknowledged_at is not null then
    return jsonb_build_object('ok', true, 'acknowledged_at', v_incident.assignment_acknowledged_at);
  end if;
  update public.incidents
  set assignment_acknowledged_at = now(), assignment_acknowledged_by = v_actor, updated_by = v_actor
  where id = v_incident.id;
  update public.incident_assignments
  set acknowledged_at = now(), acknowledgement_note = 'Assignment acknowledged in the personnel application.'
  where incident_id = v_incident.id and responder_id = v_responder.id and released_at is null;
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source
  ) values (
    v_incident.id, 'assignment_acknowledged', v_responder.name || ' acknowledged the dispatch.',
    v_actor, v_responder.name, 'Field Responder', 'personnel_app'
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'acknowledge_assignment', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('responder_code', v_responder.public_code));
  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end;
$$;

grant execute on function public.acknowledge_nodeguard_assignment(text, uuid) to authenticated, service_role;

create or replace function public.set_device_buzzer(
  p_device_id text,
  p_active boolean,
  p_source text default 'personnel_app',
  p_requested_by uuid default null
)
returns table (
  device_id text,
  buzzer_active boolean,
  buzzer_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_requested_by else auth.uid() end;
  v_device public.device_locations%rowtype;
  v_allowed boolean := false;
begin
  if p_source not in ('dashboard', 'personnel_app', 'device') then
    raise exception 'Invalid buzzer command source: %', p_source;
  end if;
  select * into v_device from public.device_locations where device_locations.device_id = p_device_id for update;
  if not found then raise exception 'Device not found: %', p_device_id; end if;
  if p_source = 'device' then
    v_allowed := auth.role() = 'service_role';
  else
    select exists (
      select 1 from public.profiles p
      where p.id = v_actor and p.is_active and (
        (p.role::text in ('barangay_admin', 'barangay_personnel') and p.barangay_id = v_device.barangay_id)
        or (p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin') and exists (
          select 1 from public.incidents i
          where i.device_id = p_device_id and i.escalation_status <> 'not_escalated'
            and i.status not in ('resolved', 'closed', 'false_alert')
        ))
        or exists (
          select 1 from public.responders r
          join public.incident_assignments a on a.responder_id = r.id and a.released_at is null
          join public.incidents i on i.id = a.incident_id
          where r.profile_id = p.id and i.device_id = p_device_id
            and i.status not in ('resolved', 'closed', 'false_alert')
        )
      )
    ) into v_allowed;
  end if;
  if not v_allowed then raise exception 'You are not authorized to control this node buzzer.'; end if;
  update public.device_locations d
  set buzzer_active = p_active, buzzer_updated_at = now()
  where d.device_id = p_device_id
  returning d.device_id, d.buzzer_active, d.buzzer_updated_at
  into device_id, buzzer_active, buzzer_updated_at;
  insert into public.device_buzzer_commands (device_id, active, requested_by, source)
  values (p_device_id, p_active, v_actor, p_source);
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'set_device_buzzer', 'device', p_device_id, v_device.barangay_id,
    jsonb_build_object('active', p_active, 'source', p_source));
  return next;
end;
$$;

grant execute on function public.set_device_buzzer(text, boolean, text, uuid) to authenticated, service_role;

create or replace function public.can_manage_nodeguard_resource(
  p_resource_id uuid,
  p_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    join public.response_resources r on r.id = p_resource_id
    where p.id = p_profile_id and p.is_active
      and (
        (p.role::text in ('barangay_admin', 'barangay_personnel')
          and r.organization_type = 'barangay' and p.barangay_id = r.barangay_id)
        or (p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
          and r.organization_type = 'mdrrmo')
      )
  );
$$;

create or replace function public.assign_nodeguard_resource(
  p_resource_code text,
  p_incident_public_id text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_incident public.incidents%rowtype;
  v_resource public.response_resources%rowtype;
begin
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found: %', p_incident_public_id; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your active coordination scope.';
  end if;
  select * into v_resource from public.response_resources where public_code = p_resource_code for update;
  if not found then raise exception 'Resource not found: %', p_resource_code; end if;
  if not public.can_manage_nodeguard_resource(v_resource.id, v_actor) then
    raise exception 'This resource is outside your organization scope.';
  end if;
  if v_resource.status <> 'available' or v_resource.assigned_incident_public_id is not null then
    raise exception '% is not available for dispatch.', v_resource.unit_name;
  end if;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'Resources cannot be assigned to a completed incident.';
  end if;
  update public.response_resources
  set status = 'dispatched', assigned_incident_public_id = v_incident.public_id,
      availability_note = 'Assigned to ' || v_incident.public_id || '.'
  where id = v_resource.id;
  insert into public.resource_assignments (resource_id, incident_id, assigned_by, notes)
  values (v_resource.id, v_incident.id, v_actor, 'Assigned through the jurisdiction-aware NodeGuard workflow.');
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'assign_resource', 'response_resource', v_resource.public_code, v_incident.barangay_id,
    jsonb_build_object('incident_id', v_incident.public_id, 'unit_name', v_resource.unit_name));
  return jsonb_build_object('ok', true, 'resource_code', v_resource.public_code, 'incident_id', v_incident.public_id);
end;
$$;

create or replace function public.release_nodeguard_resource(
  p_resource_code text,
  p_reason text,
  p_next_status text default 'available',
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_resource public.response_resources%rowtype;
  v_assignment public.resource_assignments%rowtype;
  v_incident public.incidents%rowtype;
begin
  if p_next_status not in ('available', 'under_maintenance', 'unavailable', 'reserved') then
    raise exception 'Select a valid post-release availability status.';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A release reason is required.'; end if;
  select * into v_resource from public.response_resources where public_code = p_resource_code for update;
  if not found then raise exception 'Resource not found: %', p_resource_code; end if;
  if not public.can_manage_nodeguard_resource(v_resource.id, v_actor) then
    raise exception 'This resource is outside your organization scope.';
  end if;
  select * into v_assignment from public.resource_assignments
  where resource_id = v_resource.id and released_at is null
  order by assigned_at desc limit 1 for update;
  if v_assignment.id is null then raise exception '% has no active assignment.', v_resource.unit_name; end if;
  select * into v_incident from public.incidents where id = v_assignment.incident_id;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your active coordination scope.';
  end if;
  update public.resource_assignments set released_at = now(), release_reason = trim(p_reason)
  where id = v_assignment.id;
  update public.response_resources
  set status = p_next_status, assigned_incident_public_id = null, availability_note = trim(p_reason)
  where id = v_resource.id;
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'release_resource', 'response_resource', v_resource.public_code, v_incident.barangay_id,
    jsonb_build_object('incident_id', v_incident.public_id, 'status', p_next_status, 'reason', trim(p_reason)));
  return jsonb_build_object('ok', true, 'resource_code', v_resource.public_code, 'status', p_next_status);
end;
$$;

create or replace function public.set_nodeguard_resource_status(
  p_resource_code text,
  p_status text,
  p_reason text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_resource public.response_resources%rowtype;
begin
  if p_status not in ('available', 'under_maintenance', 'unavailable', 'reserved') then
    raise exception 'Select a valid resource availability status.';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'An availability reason is required.'; end if;
  select * into v_resource from public.response_resources where public_code = p_resource_code for update;
  if not found then raise exception 'Resource not found: %', p_resource_code; end if;
  if not public.can_manage_nodeguard_resource(v_resource.id, v_actor) then
    raise exception 'This resource is outside your organization scope.';
  end if;
  if v_resource.status = 'dispatched' or v_resource.assigned_incident_public_id is not null
     or exists (select 1 from public.resource_assignments where resource_id = v_resource.id and released_at is null) then
    raise exception 'Release this resource from its incident before changing availability.';
  end if;
  update public.response_resources set status = p_status, availability_note = trim(p_reason)
  where id = v_resource.id;
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'update_resource_status', 'response_resource', v_resource.public_code, v_resource.barangay_id,
    jsonb_build_object('status', p_status, 'reason', trim(p_reason)));
  return jsonb_build_object('ok', true, 'resource_code', v_resource.public_code, 'status', p_status);
end;
$$;

grant execute on function public.can_manage_nodeguard_resource(uuid, uuid) to authenticated, service_role;
grant execute on function public.assign_nodeguard_resource(text, text, uuid) to authenticated, service_role;
grant execute on function public.release_nodeguard_resource(text, text, text, uuid) to authenticated, service_role;
grant execute on function public.set_nodeguard_resource_status(text, text, text, uuid) to authenticated, service_role;

create or replace function public.enforce_nodeguard_priority_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_profile_id is null
     or not public.can_contribute_nodeguard_incident(new.incident_id, new.actor_profile_id) then
    raise exception 'Alert-level changes require active incident coordination or assignment.';
  end if;
  return new;
end;
$$;

drop trigger if exists incident_priority_updates_scope on public.incident_priority_updates;
create trigger incident_priority_updates_scope
before insert on public.incident_priority_updates
for each row execute function public.enforce_nodeguard_priority_scope();

create or replace function public.request_nodeguard_backup(
  p_incident_public_id text,
  p_assistance_types text[],
  p_responders_needed integer,
  p_reason text,
  p_urgency text,
  p_actor_id uuid default null,
  p_source text default 'personnel_app'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_responder public.responders%rowtype;
  v_incident public.incidents%rowtype;
  v_request public.backup_requests%rowtype;
begin
  if p_source not in ('dashboard', 'personnel_app') then raise exception 'Unsupported backup-request source.'; end if;
  if p_responders_needed is null or p_responders_needed < 1 then raise exception 'At least one responder is required.'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A backup-request reason is required.'; end if;
  if p_urgency not in ('critical', 'high', 'moderate', 'low') then raise exception 'Unsupported backup urgency.'; end if;
  if coalesce(cardinality(p_assistance_types), 0) = 0 or not (p_assistance_types <@ array[
    'medical', 'fire', 'police_public_safety', 'rescue', 'barangay', 'general', 'equipment_vehicle'
  ]::text[]) then raise exception 'Select at least one supported assistance type.'; end if;
  select * into v_responder from public.responders where profile_id = v_actor;
  if not found then raise exception 'A linked responder profile is required.'; end if;
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found.'; end if;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'Backup cannot be requested for a completed incident.';
  end if;
  if not exists (
    select 1 from public.incident_assignments a
    where a.incident_id = v_incident.id and a.responder_id = v_responder.id and a.released_at is null
  ) then raise exception 'Only a currently assigned responder can request backup.'; end if;
  if exists (
    select 1 from public.backup_requests request
    where request.incident_id = v_incident.id
      and request.status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed')
  ) then raise exception 'This incident already has an active backup request.'; end if;
  insert into public.backup_requests (
    incident_id, requested_by, requesting_responder_id, requesting_team,
    assistance_types, responders_needed, reason, urgency
  ) values (
    v_incident.id, v_actor, v_responder.id, coalesce(nullif(v_incident.assigned_unit, 'Unassigned'), v_responder.name),
    p_assistance_types, p_responders_needed, trim(p_reason), p_urgency
  ) returning * into v_request;
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'backup', v_responder.name || ' requested additional assistance.',
    v_actor, v_responder.name, v_responder.role, p_source, trim(p_reason)
  );
  insert into public.notifications (recipient_profile_id, responder_id, incident_id, type, title, message)
  select r.profile_id, r.id, v_incident.id, 'backup_requested'::public.notification_type,
    'Backup requested: ' || v_incident.public_id,
    v_responder.name || ' requested ' || p_responders_needed::text || ' additional responder(s). ' || trim(p_reason)
  from public.responders r
  where r.profile_id is not null and r.profile_id <> v_actor and r.availability = 'available'
    and (
      (r.organization_type = 'barangay' and r.barangay_id = v_incident.barangay_id)
      or (r.organization_type = 'mdrrmo' and v_incident.escalation_status <> 'not_escalated')
    );
  insert into public.notifications (recipient_profile_id, incident_id, type, title, message)
  select p.id, v_incident.id, 'backup_requested'::public.notification_type,
    'Backup requested: ' || v_incident.public_id, v_responder.name || ' requested coordination. ' || trim(p_reason)
  from public.profiles p
  where p.is_active and (
    (p.role::text in ('barangay_admin', 'barangay_personnel') and p.barangay_id = v_incident.barangay_id)
    or (p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
      and v_incident.escalation_status <> 'not_escalated')
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'request_backup', 'backup_request', v_request.public_id, v_incident.barangay_id,
    jsonb_build_object('incident_id', v_incident.public_id, 'responders_needed', p_responders_needed, 'reason', trim(p_reason)));
  return jsonb_build_object('ok', true, 'id', v_request.id, 'public_id', v_request.public_id);
end;
$$;

create or replace function public.offer_nodeguard_backup(
  p_backup_request_id uuid,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_responder public.responders%rowtype;
  v_request public.backup_requests%rowtype;
  v_incident public.incidents%rowtype;
  v_offer public.backup_offers%rowtype;
begin
  select * into v_responder from public.responders where profile_id = v_actor;
  if not found or v_responder.availability <> 'available' then
    raise exception 'Only responders marked Available can offer assistance.';
  end if;
  select * into v_request from public.backup_requests where id = p_backup_request_id for update;
  if not found or v_request.status not in ('requested', 'assistance_offered', 'partially_filled', 'confirmed') then
    raise exception 'This backup request is no longer accepting offers.';
  end if;
  select * into v_incident from public.incidents where id = v_request.incident_id;
  if v_request.requesting_responder_id = v_responder.id then raise exception 'The requesting team cannot offer assistance to itself.'; end if;
  if v_responder.organization_type = 'barangay' then
    if v_responder.barangay_id is distinct from v_incident.barangay_id then
      raise exception 'Barangay responders may offer assistance only within their jurisdiction.';
    end if;
  elsif v_incident.escalation_status = 'not_escalated' then
    raise exception 'Municipal responders may assist only after barangay escalation.';
  end if;
  if exists (select 1 from public.backup_offers o where o.backup_request_id = v_request.id and o.responder_id = v_responder.id) then
    raise exception 'This responder has already offered assistance.';
  end if;
  insert into public.backup_offers (backup_request_id, responder_id, offered_by)
  values (v_request.id, v_responder.id, v_actor) returning * into v_offer;
  update public.backup_requests set status = case when status = 'requested' then 'assistance_offered' else status end
  where id = v_request.id;
  insert into public.notifications (recipient_profile_id, responder_id, incident_id, type, title, message)
  values (v_request.requested_by, v_request.requesting_responder_id, v_incident.id, 'backup_offer',
    'Assistance offered: ' || v_incident.public_id, v_responder.name || ' is available to assist. Controller confirmation is required.');
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source
  ) values (
    v_incident.id, 'backup', v_responder.name || ' offered backup assistance; controller confirmation is pending.',
    v_actor, v_responder.name, v_responder.role, 'personnel_app'
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'offer_backup_assistance', 'backup_offer', v_offer.id::text, v_incident.barangay_id,
    jsonb_build_object('backup_request', v_request.public_id, 'incident_id', v_incident.public_id));
  return jsonb_build_object('ok', true, 'offer_id', v_offer.id);
end;
$$;

create or replace function public.enforce_nodeguard_backup_decision_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
begin
  if old.status = 'offered' and new.status in ('approved', 'declined')
     and new.decided_by is not null
     and coalesce(new.decision_note, '') <> 'Backup request cancelled.' then
    select i.* into v_incident from public.backup_requests request
    join public.incidents i on i.id = request.incident_id
    where request.id = new.backup_request_id;
    select * into v_responder from public.responders where id = new.responder_id;
    if v_responder.organization_type = 'mdrrmo' then
      if not public.is_nodeguard_mdrrmo_user(new.decided_by)
         or v_incident.escalation_status = 'not_escalated' then
        raise exception 'Only LT-MDRRMO may confirm municipal assistance for an escalated incident.';
      end if;
    elsif not exists (
      select 1 from public.profiles p where p.id = new.decided_by and p.is_active
        and p.role::text in ('barangay_admin', 'barangay_personnel')
        and p.barangay_id = v_incident.barangay_id
    ) then
      raise exception 'Only the owning barangay may confirm local backup assistance.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists backup_offers_decision_scope on public.backup_offers;
create trigger backup_offers_decision_scope
before update on public.backup_offers
for each row execute function public.enforce_nodeguard_backup_decision_scope();

alter table public.backup_requests
add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;

create or replace function public.cancel_nodeguard_backup_request(
  p_backup_request_id uuid,
  p_reason text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  v_request public.backup_requests%rowtype;
  v_incident public.incidents%rowtype;
begin
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'A cancellation reason is required.'; end if;
  select * into v_request from public.backup_requests where id = p_backup_request_id for update;
  if not found then raise exception 'Backup request not found.'; end if;
  select * into v_incident from public.incidents where id = v_request.incident_id;
  if v_request.status in ('fulfilled', 'cancelled', 'closed') then raise exception 'This backup request is already final.'; end if;
  if v_request.requested_by <> v_actor
     and not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'Only the requesting team or an authorized incident controller can cancel this request.';
  end if;
  update public.backup_requests
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = trim(p_reason), cancelled_by = v_actor
  where id = v_request.id;
  update public.backup_offers
  set status = 'declined', decided_by = v_actor, decided_at = now(), decision_note = 'Backup request cancelled.'
  where backup_request_id = v_request.id and status = 'offered';
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  )
  select v_incident.id, 'backup', 'Backup request cancelled by ' || p.full_name || '.',
    v_actor, p.full_name, replace(initcap(p.role::text), '_', ' '),
    case when p.id = v_request.requested_by then 'personnel_app' else 'dashboard' end, trim(p_reason)
  from public.profiles p where p.id = v_actor;
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'cancel_backup_request', 'backup_request', v_request.public_id, v_incident.barangay_id,
    jsonb_build_object('incident_id', v_incident.public_id, 'reason', trim(p_reason)));
  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

grant execute on function public.request_nodeguard_backup(text, text[], integer, text, text, uuid, text) to authenticated, service_role;
grant execute on function public.offer_nodeguard_backup(uuid, uuid) to authenticated, service_role;
grant execute on function public.cancel_nodeguard_backup_request(uuid, text, uuid) to authenticated, service_role;

insert into storage.buckets (id, name, public)
values ('incident-media', 'incident-media', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "authorized users upload incident media" on storage.objects;
create policy "authorized users upload incident media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'incident-media'
  and exists (
    select 1 from public.incidents i
    where i.public_id = (storage.foldername(name))[1]
      and public.can_contribute_nodeguard_incident(i.id, auth.uid())
  )
);

-- Media remains private. The existing signed-URL flow must also satisfy incident visibility.
drop policy if exists "authenticated users read voice context files" on storage.objects;
create policy "authorized users read incident media" on storage.objects
for select to authenticated using (
  bucket_id in ('voice-contexts', 'incident-media')
  and exists (
    select 1 from public.incident_attachments a
    where a.storage_path = name and public.can_read_nodeguard_incident(a.incident_id)
    union all
    select 1 from public.voice_contexts v
    where v.storage_path = name and public.can_read_nodeguard_incident(v.incident_id)
    union all
    select 1 from public.incidents i
    where i.camera_capture_path = name and public.can_read_nodeguard_incident(i.id)
  )
);
