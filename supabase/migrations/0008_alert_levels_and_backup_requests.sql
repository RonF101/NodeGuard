-- Shared alert-level triage, audit history, and coordinated backup workflow.
-- Requires 0007_alert_level_enum_values.sql to be committed first.

alter table public.incidents
  alter column priority set default 'unassessed'::public.incident_priority,
  add column if not exists priority_updated_at timestamptz,
  add column if not exists priority_updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists priority_update_source text
    check (priority_update_source is null or priority_update_source in ('dashboard', 'personnel_app', 'device')),
  add column if not exists priority_update_reason text;

-- New device-originated alerts have not yet been assessed by an authorized person.
update public.incidents
set priority = 'unassessed',
    priority_updated_at = null,
    priority_updated_by = null,
    priority_update_source = null,
    priority_update_reason = null
where status = 'new_alert'
  and assigned_responder_name is null;

create table if not exists public.incident_priority_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  previous_priority public.incident_priority not null,
  new_priority public.incident_priority not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  source text not null check (source in ('dashboard', 'personnel_app', 'device')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists incident_priority_updates_incident_idx
on public.incident_priority_updates(incident_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'backup_request_status') then
    create type public.backup_request_status as enum (
      'requested',
      'assistance_offered',
      'partially_filled',
      'confirmed',
      'fulfilled',
      'cancelled',
      'closed'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'backup_offer_status') then
    create type public.backup_offer_status as enum (
      'offered',
      'approved',
      'declined',
      'withdrawn'
    );
  end if;
end $$;

create table if not exists public.backup_requests (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default (
    'BR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  status public.backup_request_status not null default 'requested',
  requested_at timestamptz not null default now(),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requesting_responder_id uuid not null references public.responders(id) on delete restrict,
  requesting_team text not null,
  assistance_types text[] not null,
  responders_needed integer not null default 1 check (responders_needed > 0),
  reason text not null check (length(trim(reason)) > 0),
  urgency text not null check (urgency in ('critical', 'high', 'moderate', 'low')),
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (cardinality(assistance_types) > 0),
  check (assistance_types <@ array[
    'medical',
    'fire',
    'police_public_safety',
    'rescue',
    'barangay',
    'general',
    'equipment_vehicle'
  ]::text[])
);

create unique index if not exists one_active_backup_request_per_incident
on public.backup_requests(incident_id)
where status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed');

create index if not exists backup_requests_status_idx
on public.backup_requests(status, requested_at);

create table if not exists public.backup_offers (
  id uuid primary key default gen_random_uuid(),
  backup_request_id uuid not null references public.backup_requests(id) on delete cascade,
  responder_id uuid not null references public.responders(id) on delete cascade,
  offered_by uuid not null references public.profiles(id) on delete cascade,
  status public.backup_offer_status not null default 'offered',
  offered_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  unique (backup_request_id, responder_id)
);

create index if not exists backup_offers_request_idx
on public.backup_offers(backup_request_id, offered_at);

create table if not exists public.incident_activity_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  event_type text not null check (event_type in ('backup', 'assignment', 'status')),
  message text not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  actor_role text,
  source text not null check (source in ('dashboard', 'personnel_app', 'system')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists incident_activity_events_incident_idx
on public.incident_activity_events(incident_id, created_at desc);

drop trigger if exists backup_requests_set_updated_at on public.backup_requests;
create trigger backup_requests_set_updated_at
before update on public.backup_requests
for each row execute function public.set_updated_at();

create or replace function public.is_nodeguard_dispatcher(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.is_active
      and (
        p.role in ('admin', 'super_admin')
        or not exists (
          select 1 from public.responders r where r.profile_id = p.id
        )
      )
  );
$$;

grant execute on function public.is_nodeguard_dispatcher(uuid) to authenticated, service_role;

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
    where p.id = auth.uid()
      and p.is_active
      and (
        public.is_nodeguard_dispatcher(p.id)
        or exists (
          select 1
          from public.responders r
          join public.incidents i on i.assigned_responder_name = r.name
          where r.profile_id = p.id and i.id = p_incident_id
        )
        or exists (
          select 1
          from public.responders r
          join public.incident_assignments ia on ia.responder_id = r.id
          where r.profile_id = p.id and ia.incident_id = p_incident_id
        )
        or exists (
          select 1
          from public.responders r
          join public.backup_requests br on br.incident_id = p_incident_id
          where r.profile_id = p.id
            and br.status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed')
        )
      )
  );
$$;

grant execute on function public.can_read_nodeguard_incident(uuid) to authenticated;

alter table public.incident_priority_updates enable row level security;
alter table public.backup_requests enable row level security;
alter table public.backup_offers enable row level security;
alter table public.incident_activity_events enable row level security;

drop policy if exists "users read priority history for visible incidents" on public.incident_priority_updates;
create policy "users read priority history for visible incidents"
on public.incident_priority_updates
for select to authenticated
using (public.can_read_nodeguard_incident(incident_id));

drop policy if exists "active users read backup requests" on public.backup_requests;
create policy "active users read backup requests"
on public.backup_requests
for select to authenticated
using (public.is_active_nodeguard_user());

drop policy if exists "active users read backup offers" on public.backup_offers;
create policy "active users read backup offers"
on public.backup_offers
for select to authenticated
using (public.is_active_nodeguard_user());

drop policy if exists "users read activity for visible incidents" on public.incident_activity_events;
create policy "users read activity for visible incidents"
on public.incident_activity_events
for select to authenticated
using (public.can_read_nodeguard_incident(incident_id));

grant select on public.incident_priority_updates to authenticated;
grant select on public.backup_requests to authenticated;
grant select on public.backup_offers to authenticated;
grant select on public.incident_activity_events to authenticated;

create or replace function public.update_nodeguard_alert_level(
  p_incident_public_id text,
  p_alert_level text,
  p_source text,
  p_reason text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_actor_name text;
  v_actor_role text;
  v_incident public.incidents%rowtype;
  v_new_level public.incident_priority;
begin
  if p_alert_level not in ('unassessed', 'critical', 'high', 'medium', 'low') then
    raise exception 'Unsupported alert level.';
  end if;
  if p_source not in ('dashboard', 'personnel_app', 'device') then
    raise exception 'Unsupported alert-level update source.';
  end if;
  if v_actor is null then
    raise exception 'An authenticated NodeGuard user is required.';
  end if;

  select p.full_name,
         coalesce(r.role, replace(initcap(p.role::text), '_', ' '))
  into v_actor_name, v_actor_role
  from public.profiles p
  left join public.responders r on r.profile_id = p.id
  where p.id = v_actor and p.is_active
  limit 1;

  if v_actor_name is null then
    raise exception 'An active NodeGuard profile is required.';
  end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;

  if v_incident.id is null then
    raise exception 'Incident not found.';
  end if;

  if not public.is_nodeguard_dispatcher(v_actor)
     and not exists (
       select 1
       from public.responders r
       left join public.incident_assignments ia
         on ia.responder_id = r.id and ia.incident_id = v_incident.id
       where r.profile_id = v_actor
         and (r.name = v_incident.assigned_responder_name or ia.id is not null)
     ) then
    raise exception 'Only a dispatcher or responder assigned to this incident can update its alert level.';
  end if;

  v_new_level := p_alert_level::public.incident_priority;
  if v_incident.priority = v_new_level then
    return jsonb_build_object(
      'ok', true,
      'unchanged', true,
      'priority', p_alert_level,
      'updated_at', v_incident.priority_updated_at
    );
  end if;

  update public.incidents
  set priority = v_new_level,
      priority_updated_at = clock_timestamp(),
      priority_updated_by = v_actor,
      priority_update_source = p_source,
      priority_update_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = v_incident.id;

  insert into public.incident_priority_updates (
    incident_id,
    previous_priority,
    new_priority,
    actor_profile_id,
    actor_name,
    actor_role,
    source,
    reason
  ) values (
    v_incident.id,
    v_incident.priority,
    v_new_level,
    v_actor,
    v_actor_name,
    v_actor_role,
    p_source,
    nullif(trim(coalesce(p_reason, '')), '')
  );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'update_alert_level',
    'incident',
    v_incident.public_id,
    jsonb_build_object(
      'previous_alert_level', v_incident.priority,
      'new_alert_level', v_new_level,
      'actor_name', v_actor_name,
      'actor_role', v_actor_role,
      'source', p_source,
      'reason', nullif(trim(coalesce(p_reason, '')), '')
    )
  );

  insert into public.notifications (
    recipient_profile_id,
    responder_id,
    incident_id,
    type,
    title,
    message
  )
  select distinct
    r.profile_id,
    r.id,
    v_incident.id,
    'priority_changed'::public.notification_type,
    'Alert level updated: ' || v_incident.public_id,
    'Alert level changed from ' || replace(initcap(v_incident.priority::text), '_', ' ')
      || ' to ' || replace(initcap(v_new_level::text), '_', ' ')
      || ' by ' || v_actor_name || '.'
  from public.responders r
  left join public.incident_assignments ia
    on ia.responder_id = r.id and ia.incident_id = v_incident.id
  where r.profile_id is not null
    and r.profile_id <> v_actor
    and (r.name = v_incident.assigned_responder_name or ia.id is not null);

  return jsonb_build_object(
    'ok', true,
    'unchanged', false,
    'priority', p_alert_level,
    'updated_at', clock_timestamp(),
    'updated_by', v_actor_name
  );
end;
$$;

grant execute on function public.update_nodeguard_alert_level(text, text, text, text, uuid)
to authenticated, service_role;

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
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_responder public.responders%rowtype;
  v_incident public.incidents%rowtype;
  v_request public.backup_requests%rowtype;
begin
  if v_actor is null then raise exception 'An authenticated responder is required.'; end if;
  if p_source not in ('dashboard', 'personnel_app') then raise exception 'Unsupported backup-request source.'; end if;
  if p_responders_needed is null or p_responders_needed < 1 then raise exception 'At least one responder is required.'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'A backup-request reason is required.'; end if;
  if p_urgency not in ('critical', 'high', 'moderate', 'low') then raise exception 'Unsupported backup urgency.'; end if;
  if coalesce(cardinality(p_assistance_types), 0) = 0
     or not (p_assistance_types <@ array[
       'medical', 'fire', 'police_public_safety', 'rescue',
       'barangay', 'general', 'equipment_vehicle'
     ]::text[]) then
    raise exception 'Select at least one supported assistance type.';
  end if;

  select * into v_responder
  from public.responders
  where profile_id = v_actor;
  if v_responder.id is null then raise exception 'A linked responder profile is required.'; end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;
  if v_incident.id is null then raise exception 'Incident not found.'; end if;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'Backup cannot be requested for a completed incident.';
  end if;
  if v_incident.assigned_responder_name <> v_responder.name
     and not exists (
       select 1 from public.incident_assignments ia
       where ia.incident_id = v_incident.id and ia.responder_id = v_responder.id
     ) then
    raise exception 'Only a responder assigned to this incident can request backup.';
  end if;
  if exists (
    select 1 from public.backup_requests br
    where br.incident_id = v_incident.id
      and br.status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed')
  ) then
    raise exception 'This incident already has an active backup request.';
  end if;

  insert into public.backup_requests (
    incident_id,
    requested_by,
    requesting_responder_id,
    requesting_team,
    assistance_types,
    responders_needed,
    reason,
    urgency
  ) values (
    v_incident.id,
    v_actor,
    v_responder.id,
    coalesce(nullif(v_incident.assigned_unit, 'Unassigned'), v_responder.name),
    p_assistance_types,
    p_responders_needed,
    trim(p_reason),
    p_urgency
  ) returning * into v_request;

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id,
    'backup',
    'Backup requested by ' || coalesce(nullif(v_incident.assigned_unit, 'Unassigned'), v_responder.name)
      || ' for ' || p_responders_needed::text || ' additional responder(s).',
    v_actor,
    v_responder.name,
    v_responder.role,
    p_source,
    trim(p_reason)
  );

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  )
  select
    r.profile_id,
    r.id,
    v_incident.id,
    'backup_requested'::public.notification_type,
    'Backup requested: ' || v_incident.public_id,
    v_responder.name || ' requested ' || p_responders_needed::text
      || ' additional responder(s). ' || trim(p_reason)
  from public.responders r
  where r.profile_id is not null
    and r.profile_id <> v_actor
    and r.availability = 'available'
    and (
      'general' = any(p_assistance_types)
      or 'equipment_vehicle' = any(p_assistance_types)
      or ('medical' = any(p_assistance_types) and r.agency_unit ilike '%EMS%')
      or ('fire' = any(p_assistance_types) and r.agency_unit ilike '%BFP%')
      or ('police_public_safety' = any(p_assistance_types) and r.agency_unit ilike '%PNP%')
      or ('rescue' = any(p_assistance_types) and r.agency_unit ilike '%MDRRMO%')
      or ('barangay' = any(p_assistance_types) and r.agency_unit ilike '%Barangay%')
    );

  insert into public.notifications (
    recipient_profile_id, incident_id, type, title, message
  )
  select
    p.id,
    v_incident.id,
    'backup_requested'::public.notification_type,
    'Backup requested: ' || v_incident.public_id,
    coalesce(nullif(v_incident.assigned_unit, 'Unassigned'), v_responder.name)
      || ' requested dispatcher coordination. ' || trim(p_reason)
  from public.profiles p
  where p.is_active
    and p.id <> v_actor
    and public.is_nodeguard_dispatcher(p.id);

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'request_backup',
    'backup_request',
    v_request.public_id,
    jsonb_build_object(
      'incident_id', v_incident.public_id,
      'assistance_types', p_assistance_types,
      'responders_needed', p_responders_needed,
      'urgency', p_urgency,
      'source', p_source,
      'reason', trim(p_reason)
    )
  );

  return jsonb_build_object('ok', true, 'id', v_request.id, 'public_id', v_request.public_id);
end;
$$;

grant execute on function public.request_nodeguard_backup(text, text[], integer, text, text, uuid, text)
to authenticated, service_role;

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
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_responder public.responders%rowtype;
  v_request public.backup_requests%rowtype;
  v_incident public.incidents%rowtype;
  v_offer public.backup_offers%rowtype;
begin
  select * into v_responder from public.responders where profile_id = v_actor;
  if v_responder.id is null then raise exception 'A linked responder profile is required.'; end if;
  if v_responder.availability <> 'available' then
    raise exception 'Only responders marked Available can offer assistance.';
  end if;

  select * into v_request
  from public.backup_requests
  where id = p_backup_request_id
  for update;
  if v_request.id is null then raise exception 'Backup request not found.'; end if;
  if v_request.status not in ('requested', 'assistance_offered', 'partially_filled', 'confirmed') then
    raise exception 'This backup request is no longer accepting offers.';
  end if;
  if v_request.requesting_responder_id = v_responder.id then
    raise exception 'The requesting team cannot offer assistance to its own request.';
  end if;

  select * into v_incident from public.incidents where id = v_request.incident_id;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'The incident is already completed.';
  end if;
  if v_incident.assigned_responder_name = v_responder.name
     or exists (
       select 1 from public.incident_assignments ia
       where ia.incident_id = v_incident.id and ia.responder_id = v_responder.id
     ) then
    raise exception 'This responder is already assigned to the incident.';
  end if;
  if exists (
    select 1 from public.backup_offers bo
    where bo.backup_request_id = v_request.id and bo.responder_id = v_responder.id
  ) then
    raise exception 'This responder has already offered assistance.';
  end if;

  insert into public.backup_offers (backup_request_id, responder_id, offered_by)
  values (v_request.id, v_responder.id, v_actor)
  returning * into v_offer;

  update public.backup_requests
  set status = case when status = 'requested' then 'assistance_offered' else status end
  where id = v_request.id;

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  ) values (
    v_request.requested_by,
    v_request.requesting_responder_id,
    v_incident.id,
    'backup_offer',
    'Assistance offered: ' || v_incident.public_id,
    v_responder.name || ' is available to assist. Dispatcher confirmation is required.'
  );

  insert into public.notifications (
    recipient_profile_id, incident_id, type, title, message
  )
  select
    p.id,
    v_incident.id,
    'backup_offer'::public.notification_type,
    'Backup assistance offered: ' || v_incident.public_id,
    v_responder.name || ' offered assistance. Dispatcher confirmation is required.'
  from public.profiles p
  where p.is_active
    and p.id <> v_actor
    and p.id <> v_request.requested_by
    and public.is_nodeguard_dispatcher(p.id);

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source
  ) values (
    v_incident.id,
    'backup',
    v_responder.name || ' offered backup assistance; dispatcher confirmation is pending.',
    v_actor,
    v_responder.name,
    v_responder.role,
    'personnel_app'
  );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'offer_backup_assistance',
    'backup_offer',
    v_offer.id::text,
    jsonb_build_object('backup_request', v_request.public_id, 'incident_id', v_incident.public_id)
  );

  return jsonb_build_object('ok', true, 'offer_id', v_offer.id);
end;
$$;

grant execute on function public.offer_nodeguard_backup(uuid, uuid)
to authenticated, service_role;

create or replace function public.decide_nodeguard_backup_offer(
  p_offer_id uuid,
  p_decision text,
  p_note text default null,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_offer public.backup_offers%rowtype;
  v_request public.backup_requests%rowtype;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
  v_approved integer;
  v_request_status public.backup_request_status;
begin
  if not public.is_nodeguard_dispatcher(v_actor) then
    raise exception 'Dispatcher authorization is required.';
  end if;
  if p_decision not in ('approved', 'declined') then
    raise exception 'Decision must be approved or declined.';
  end if;

  select * into v_offer from public.backup_offers where id = p_offer_id for update;
  if v_offer.id is null then raise exception 'Backup offer not found.'; end if;
  if v_offer.status <> 'offered' then raise exception 'This backup offer has already been decided.'; end if;

  select * into v_request from public.backup_requests where id = v_offer.backup_request_id for update;
  select * into v_incident from public.incidents where id = v_request.incident_id for update;
  select * into v_responder from public.responders where id = v_offer.responder_id for update;

  if v_request.status not in ('requested', 'assistance_offered', 'partially_filled', 'confirmed')
     or v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'This backup request is no longer active.';
  end if;

  if p_decision = 'approved' then
    if v_responder.availability <> 'available' then
      raise exception 'The offering responder is no longer Available.';
    end if;

    update public.backup_offers
    set status = 'approved', decided_by = v_actor, decided_at = now(), decision_note = nullif(trim(coalesce(p_note, '')), '')
    where id = v_offer.id;

    if not exists (
      select 1 from public.incident_assignments ia
      where ia.incident_id = v_incident.id and ia.responder_id = v_responder.id
    ) then
      insert into public.incident_assignments (
        incident_id, responder_id, assigned_unit, assigned_by, notes
      ) values (
        v_incident.id, v_responder.id, v_responder.agency_unit, v_actor,
        'Confirmed backup assignment for ' || v_request.public_id || '.'
      );
    end if;

    update public.responders
    set availability = 'dispatched', current_assignment = v_incident.public_id, last_status_update = now()
    where id = v_responder.id;
  else
    update public.backup_offers
    set status = 'declined', decided_by = v_actor, decided_at = now(), decision_note = nullif(trim(coalesce(p_note, '')), '')
    where id = v_offer.id;
  end if;

  select count(*) into v_approved
  from public.backup_offers
  where backup_request_id = v_request.id and status = 'approved';

  v_request_status := case
    when v_approved >= v_request.responders_needed then 'fulfilled'::public.backup_request_status
    when v_approved > 0 then 'partially_filled'::public.backup_request_status
    when exists (
      select 1 from public.backup_offers
      where backup_request_id = v_request.id and status = 'offered'
    ) then 'assistance_offered'::public.backup_request_status
    else 'requested'::public.backup_request_status
  end;

  update public.backup_requests
  set status = v_request_status,
      fulfilled_at = case when v_request_status = 'fulfilled' then now() else null end
  where id = v_request.id;

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  ) values (
    v_responder.profile_id,
    v_responder.id,
    v_incident.id,
    case when p_decision = 'approved' then 'backup_confirmed' else 'backup_updated' end,
    case when p_decision = 'approved' then 'Backup assignment confirmed' else 'Backup offer update' end,
    case when p_decision = 'approved'
      then 'You are confirmed to assist ' || v_incident.public_id || '.'
      else 'Your assistance offer for ' || v_incident.public_id || ' was declined.'
    end
  );

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  ) values (
    v_request.requested_by,
    v_request.requesting_responder_id,
    v_incident.id,
    'backup_updated',
    'Backup offer decision: ' || v_incident.public_id,
    v_responder.name || '''s assistance offer was ' || p_decision
      || case when v_request_status = 'fulfilled' then '. The backup request is now fulfilled.' else '.' end
  );

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  )
  select
    v_incident.id,
    case when p_decision = 'approved' then 'assignment' else 'backup' end,
    v_responder.name || '''s backup offer was ' || p_decision
      || case when v_request_status = 'fulfilled' then '; the request is fulfilled.' else '.' end,
    v_actor,
    p.full_name,
    replace(initcap(p.role::text), '_', ' '),
    'dashboard',
    nullif(trim(coalesce(p_note, '')), '')
  from public.profiles p
  where p.id = v_actor;

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'decide_backup_offer',
    'backup_offer',
    v_offer.id::text,
    jsonb_build_object(
      'decision', p_decision,
      'incident_id', v_incident.public_id,
      'backup_request', v_request.public_id,
      'responder', v_responder.name,
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  );

  return jsonb_build_object('ok', true, 'request_status', v_request_status, 'approved_count', v_approved);
end;
$$;

grant execute on function public.decide_nodeguard_backup_offer(uuid, text, text, uuid)
to authenticated, service_role;

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
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_request public.backup_requests%rowtype;
  v_incident public.incidents%rowtype;
begin
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'A cancellation reason is required.'; end if;
  select * into v_request from public.backup_requests where id = p_backup_request_id for update;
  if v_request.id is null then raise exception 'Backup request not found.'; end if;
  if v_request.status in ('fulfilled', 'cancelled', 'closed') then raise exception 'This backup request is already final.'; end if;
  if v_request.requested_by <> v_actor and not public.is_nodeguard_dispatcher(v_actor) then
    raise exception 'Only the requesting team or a dispatcher can cancel this request.';
  end if;
  select * into v_incident from public.incidents where id = v_request.incident_id;

  update public.backup_requests
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = trim(p_reason)
  where id = v_request.id;

  update public.backup_offers
  set status = 'declined', decided_by = v_actor, decided_at = now(), decision_note = 'Backup request cancelled.'
  where backup_request_id = v_request.id and status = 'offered';

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  )
  select
    v_incident.id,
    'backup',
    'Backup request cancelled by ' || p.full_name || '.',
    v_actor,
    p.full_name,
    replace(initcap(p.role::text), '_', ' '),
    case when public.is_nodeguard_dispatcher(v_actor) then 'dashboard' else 'personnel_app' end,
    trim(p_reason)
  from public.profiles p
  where p.id = v_actor;

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  )
  select distinct
    r.profile_id,
    r.id,
    v_incident.id,
    'backup_updated'::public.notification_type,
    'Backup request cancelled: ' || v_incident.public_id,
    'The backup request was cancelled. ' || trim(p_reason)
  from public.responders r
  left join public.backup_offers bo
    on bo.responder_id = r.id and bo.backup_request_id = v_request.id
  where r.profile_id is not null
    and r.profile_id <> v_actor
    and (r.id = v_request.requesting_responder_id or bo.id is not null);

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'cancel_backup_request',
    'backup_request',
    v_request.public_id,
    jsonb_build_object('incident_id', v_incident.public_id, 'reason', trim(p_reason))
  );

  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

grant execute on function public.cancel_nodeguard_backup_request(uuid, text, uuid)
to authenticated, service_role;

create or replace function public.close_backup_requests_for_final_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('resolved', 'closed', 'false_alert')
     and old.status is distinct from new.status then
    if exists (
      select 1 from public.backup_requests
      where incident_id = new.id
        and status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed')
    ) then
    update public.backup_requests
    set status = 'closed', closed_at = now()
    where incident_id = new.id
      and status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed');

    update public.backup_offers bo
    set status = 'declined', decided_at = now(), decision_note = 'Incident reached a final status.'
    from public.backup_requests br
    where br.id = bo.backup_request_id
      and br.incident_id = new.id
      and bo.status = 'offered';

    insert into public.incident_activity_events (
      incident_id, event_type, message, source
    ) values (
      new.id,
      'backup',
      'Active backup request closed automatically because the incident changed to '
        || replace(initcap(new.status::text), '_', ' ') || '.',
      'system'
    );

    insert into public.notifications (
      recipient_profile_id, responder_id, incident_id, type, title, message
    )
    select distinct
      r.profile_id,
      r.id,
      new.id,
      'backup_updated'::public.notification_type,
      'Backup request closed: ' || new.public_id,
      'The incident is now ' || replace(initcap(new.status::text), '_', ' ')
        || '; its active backup request was closed.'
    from public.responders r
    left join public.incident_assignments ia
      on ia.responder_id = r.id and ia.incident_id = new.id
    where r.profile_id is not null
      and (r.name = new.assigned_responder_name or ia.id is not null);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_close_backup_requests on public.incidents;
create trigger incidents_close_backup_requests
after update of status on public.incidents
for each row execute function public.close_backup_requests_for_final_incident();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'incident_priority_updates',
    'incident_activity_events',
    'backup_requests',
    'backup_offers'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;
