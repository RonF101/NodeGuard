-- Omnichannel incident intake and configurable after-hours IoT routing.
-- IoT alerts remain automatic, but ordinary reports are first-class incidents
-- and do not require a node, camera capture, or voice recording.

alter type public.incident_status add value if not exists 'reported';
alter type public.incident_status add value if not exists 'pending_validation';
alter type public.incident_status add value if not exists 'cancelled';

alter table public.incidents alter column device_id drop not null;
alter table public.incidents alter column node_location drop not null;
alter table public.incidents alter column trigger_method drop not null;
alter table public.incidents alter column voice_duration drop not null;

alter table public.incidents
  add column if not exists reporting_channel text,
  add column if not exists intake_organization text,
  add column if not exists management_mode text,
  add column if not exists managing_organization text,
  add column if not exists reporting_office text,
  add column if not exists incident_subtype text,
  add column if not exists nearby_landmark text,
  add column if not exists reported_at timestamptz,
  add column if not exists affected_persons_condition text,
  add column if not exists initial_notes text,
  add column if not exists after_hours_alert boolean not null default false,
  add column if not exists barangay_acknowledgement_due_at timestamptz,
  add column if not exists barangay_acknowledged_at timestamptz,
  add column if not exists barangay_acknowledged_by uuid references public.profiles(id) on delete set null,
  add column if not exists mdrrmo_fallback_claimed_at timestamptz,
  add column if not exists mdrrmo_fallback_claimed_by uuid references public.profiles(id) on delete set null,
  add column if not exists referred_to_barangay_at timestamptz,
  add column if not exists barangay_validation_requested_at timestamptz;

alter table public.incidents alter column source_type set default 'iot_node';

update public.incidents
set source_type = case when source_type = 'node_alert' then 'iot_node' else 'manual_entry' end,
    reporting_channel = case when device_id is not null then 'iot_node' else 'barangay_personnel' end,
    intake_organization = case when device_id is not null then 'iot_node' else 'barangay' end,
    management_mode = 'barangay_managed',
    managing_organization = 'barangay',
    reported_at = coalesce(created_at, occurred_at),
    nearby_landmark = nullif(approximate_address, location_name)
where reporting_channel is null
   or intake_organization is null
   or management_mode is null
   or managing_organization is null
   or reported_at is null;

alter table public.incidents
  alter column reporting_channel set not null,
  alter column intake_organization set not null,
  alter column management_mode set not null,
  alter column managing_organization set not null,
  alter column reported_at set not null;

alter table public.incidents drop constraint if exists incidents_source_type_check;
alter table public.incidents add constraint incidents_source_type_check
  check (source_type in ('manual_entry', 'iot_node')) not valid;
alter table public.incidents drop constraint if exists incidents_reporting_channel_check;
alter table public.incidents add constraint incidents_reporting_channel_check check (reporting_channel in (
  'emergency_hotline', 'mobile_call', 'sms', 'social_media', 'email', 'walk_in',
  'radio', 'barangay_personnel', 'mdrrmo_personnel', 'field_responder',
  'partner_office', 'iot_node', 'other'
)) not valid;
alter table public.incidents drop constraint if exists incidents_intake_organization_check;
alter table public.incidents add constraint incidents_intake_organization_check
  check (intake_organization in ('barangay', 'mdrrmo', 'iot_node')) not valid;
alter table public.incidents drop constraint if exists incidents_management_mode_check;
alter table public.incidents add constraint incidents_management_mode_check check (management_mode in (
  'barangay_managed', 'referred_to_barangay', 'barangay_validation_requested',
  'mdrrmo_direct', 'municipal_coordination'
)) not valid;
alter table public.incidents drop constraint if exists incidents_managing_organization_check;
alter table public.incidents add constraint incidents_managing_organization_check
  check (managing_organization in ('barangay', 'mdrrmo')) not valid;
alter table public.incidents drop constraint if exists incidents_iot_fields_check;
alter table public.incidents add constraint incidents_iot_fields_check check (
  (source_type = 'iot_node' and device_id is not null and reporting_channel = 'iot_node')
  or (source_type = 'manual_entry' and device_id is null)
) not valid;

create table if not exists public.barangay_operating_hours (
  barangay_id uuid primary key references public.barangays(id) on delete cascade,
  timezone text not null default 'Asia/Manila',
  staffed_days smallint[] not null default array[1,2,3,4,5]::smallint[],
  opens_at time not null default '08:00',
  closes_at time not null default '17:00',
  acknowledgement_minutes integer not null default 10 check (acknowledgement_minutes between 1 and 120),
  is_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (staffed_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  check (opens_at <> closes_at)
);

insert into public.barangay_operating_hours (barangay_id)
select id from public.barangays
on conflict (barangay_id) do nothing;

create index if not exists incidents_reporting_channel_idx
  on public.incidents(reporting_channel, reported_at desc);
create index if not exists incidents_management_idx
  on public.incidents(managing_organization, management_mode, status, reported_at desc);
create index if not exists incidents_after_hours_idx
  on public.incidents(after_hours_alert, barangay_acknowledgement_due_at)
  where after_hours_alert;

create or replace function public.is_barangay_staffed(
  p_barangay_id uuid,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_setting public.barangay_operating_hours%rowtype;
  v_local timestamp;
  v_day smallint;
  v_time time;
begin
  select * into v_setting
  from public.barangay_operating_hours
  where barangay_id = p_barangay_id;
  if not found or not v_setting.is_enabled then return false; end if;
  v_local := p_at at time zone v_setting.timezone;
  v_day := extract(isodow from v_local)::smallint;
  v_time := v_local::time;
  if not (v_day = any(v_setting.staffed_days)) then return false; end if;
  if v_setting.opens_at < v_setting.closes_at then
    return v_time >= v_setting.opens_at and v_time < v_setting.closes_at;
  end if;
  return v_time >= v_setting.opens_at or v_time < v_setting.closes_at;
end;
$$;

create or replace function public.route_nodeguard_incident_to_barangay()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ack_minutes integer;
begin
  if new.source_type in ('iot_node', 'node_alert') or new.reporting_channel = 'iot_node' then
    if new.device_id is null then raise exception 'An IoT alert requires a registered node.'; end if;
    select barangay_id into new.barangay_id
    from public.device_locations where device_id = new.device_id;
    if new.barangay_id is null then
      raise exception 'The alert node is not assigned to a participating barangay.';
    end if;
    new.source_type := 'iot_node';
    new.reporting_channel := 'iot_node';
    new.intake_organization := 'iot_node';
    new.management_mode := 'barangay_managed';
    new.managing_organization := 'barangay';
    new.reported_at := coalesce(new.reported_at, new.occurred_at, now());
    new.after_hours_alert := not public.is_barangay_staffed(new.barangay_id, new.reported_at);
    if new.after_hours_alert then
      select acknowledgement_minutes into v_ack_minutes
      from public.barangay_operating_hours where barangay_id = new.barangay_id;
      new.barangay_acknowledgement_due_at := new.reported_at + make_interval(mins => coalesce(v_ack_minutes, 10));
    else
      new.barangay_acknowledgement_due_at := null;
    end if;
  else
    new.source_type := 'manual_entry';
    new.reporting_channel := coalesce(new.reporting_channel, 'barangay_personnel');
    new.intake_organization := coalesce(new.intake_organization, 'barangay');
    new.management_mode := coalesce(new.management_mode, 'barangay_managed');
    new.managing_organization := coalesce(new.managing_organization, 'barangay');
    new.reported_at := coalesce(new.reported_at, new.occurred_at, now());
    new.device_id := null;
    new.trigger_method := null;
    new.voice_context_available := false;
    new.voice_duration := null;
    new.camera_capture_path := null;
    new.after_hours_alert := false;
    new.barangay_acknowledgement_due_at := null;
    if new.intake_organization = 'barangay' and new.barangay_id is null then
      raise exception 'A barangay-entered report requires an owning barangay.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_route_to_barangay on public.incidents;
create trigger incidents_route_to_barangay
before insert or update of device_id, source_type, reporting_channel, barangay_id, reported_at
on public.incidents for each row execute function public.route_nodeguard_incident_to_barangay();

create or replace function public.notify_nodeguard_incident_intake()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_profile_id, incident_id, type, title, message)
  select p.id, new.id, 'general',
    case when new.after_hours_alert then 'After-hours IoT alert' else 'New incident report' end,
    new.public_id || ' was recorded for your barangay.'
  from public.profiles p
  where p.is_active and p.barangay_id = new.barangay_id
    and p.role::text in ('barangay_admin', 'barangay_personnel');

  if new.after_hours_alert then
    insert into public.notifications (recipient_profile_id, incident_id, type, title, message)
    select p.id, new.id, 'general', 'After-hours IoT fallback monitoring',
      new.public_id || ' requires municipal monitoring and may be claimed after the barangay acknowledgement period.'
    from public.profiles p
    where p.is_active and p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin');
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_notify_intake on public.incidents;
create trigger incidents_notify_intake
after insert on public.incidents for each row execute function public.notify_nodeguard_incident_intake();

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
    select 1 from public.profiles p
    join public.incidents i on i.id = p_incident_id
    where p.id = p_profile_id and p.is_active and (
      (
        p.role::text in ('barangay_admin', 'barangay_personnel')
        and p.barangay_id = i.barangay_id
        and i.managing_organization = 'barangay'
      )
      or (
        p.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
        and (
          i.managing_organization = 'mdrrmo'
          or i.escalation_status <> 'not_escalated'
          or (
            i.after_hours_alert
            and i.barangay_acknowledged_at is null
            and i.barangay_acknowledgement_due_at <= now()
          )
        )
      )
    )
  );
$$;

create or replace function public.create_nodeguard_incident_report(
  p_reporting_channel text,
  p_reporting_source text,
  p_reporting_office text,
  p_category text,
  p_incident_subtype text,
  p_description text,
  p_location_name text,
  p_landmark text,
  p_barangay_id uuid,
  p_reported_at timestamptz,
  p_occurred_at timestamptz,
  p_persons_affected integer,
  p_affected_persons_condition text,
  p_priority text,
  p_actions_taken text,
  p_initial_notes text,
  p_management_mode text,
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
  v_public_id text;
  v_intake text;
  v_management text;
  v_manager text;
  v_barangay uuid := p_barangay_id;
begin
  select * into v_profile from public.profiles where id = v_actor and is_active;
  if not found or v_profile.role::text not in (
    'barangay_admin', 'barangay_personnel', 'mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin'
  ) then raise exception 'Authorized incident-intake personnel are required.'; end if;
  if p_reporting_channel not in (
    'emergency_hotline', 'mobile_call', 'sms', 'social_media', 'email', 'walk_in',
    'radio', 'barangay_personnel', 'mdrrmo_personnel', 'field_responder', 'partner_office', 'other'
  ) then raise exception 'Select a supported manual reporting channel.'; end if;
  if trim(coalesce(p_reporting_source, '')) = ''
     or trim(coalesce(p_description, '')) = ''
     or trim(coalesce(p_location_name, '')) = '' then
    raise exception 'Reporting source, location, and incident description are required.';
  end if;
  if p_category not in ('medical', 'security_public_safety', 'fire_disaster') then
    raise exception 'Select a supported incident category.';
  end if;
  if p_priority not in ('unassessed', 'critical', 'high', 'medium', 'low') then
    raise exception 'Select a supported severity.';
  end if;

  if v_profile.role::text in ('barangay_admin', 'barangay_personnel') then
    if v_profile.barangay_id is null then raise exception 'This account has no assigned barangay.'; end if;
    v_barangay := v_profile.barangay_id;
    v_intake := 'barangay';
    v_management := 'barangay_managed';
    v_manager := 'barangay';
  else
    v_intake := 'mdrrmo';
    v_management := coalesce(nullif(p_management_mode, ''), 'mdrrmo_direct');
    if v_management not in ('referred_to_barangay', 'barangay_validation_requested', 'mdrrmo_direct', 'municipal_coordination') then
      raise exception 'Select a valid LT-MDRRMO handling decision.';
    end if;
    if v_management in ('referred_to_barangay', 'barangay_validation_requested') and v_barangay is null then
      raise exception 'Select the concerned barangay for referral or validation.';
    end if;
    v_manager := case when v_management in ('referred_to_barangay', 'barangay_validation_requested') then 'barangay' else 'mdrrmo' end;
  end if;

  v_public_id := case when v_intake = 'barangay' then 'NG-BRGY-' else 'NG-MDR-' end
    || to_char(coalesce(p_reported_at, now()), 'YYYYMMDD-HH24MISS-')
    || upper(substr(replace(v_incident_id::text, '-', ''), 1, 6));

  insert into public.incidents (
    id, public_id, source_type, reporting_channel, intake_organization,
    management_mode, managing_organization, barangay_id, category, incident_subtype,
    priority, status, device_id, location_name, approximate_address, nearby_landmark,
    node_location, coordinates, reported_at, occurred_at, trigger_method,
    voice_context_available, voice_duration, caller_context, assigned_unit,
    assigned_responder_name, created_by, incident_description, persons_affected,
    affected_persons_condition, reporting_person_source, reporting_office,
    actions_taken, initial_notes, validation_status, validation_result,
    escalation_status, referred_to_barangay_at, barangay_validation_requested_at, updated_by
  ) values (
    v_incident_id, v_public_id, 'manual_entry', p_reporting_channel, v_intake,
    v_management, v_manager, v_barangay, p_category::public.emergency_category,
    nullif(trim(coalesce(p_incident_subtype, '')), ''), p_priority::public.incident_priority,
    'pending_validation', null, trim(p_location_name), trim(p_location_name),
    nullif(trim(coalesce(p_landmark, '')), ''), null, 'Not provided',
    coalesce(p_reported_at, now()), coalesce(p_occurred_at, p_reported_at, now()), null,
    false, null, trim(p_description),
    case when v_manager = 'barangay' then 'Concerned barangay response unit' else 'LT-MDRRMO Operations' end,
    null, v_actor, trim(p_description), greatest(coalesce(p_persons_affected, 0), 0),
    nullif(trim(coalesce(p_affected_persons_condition, '')), ''), trim(p_reporting_source),
    nullif(trim(coalesce(p_reporting_office, '')), ''), trim(coalesce(p_actions_taken, '')),
    trim(coalesce(p_initial_notes, '')), 'pending_review', null, 'not_escalated',
    case when v_management = 'referred_to_barangay' then now() else null end,
    case when v_management = 'barangay_validation_requested' then now() else null end, v_actor
  );

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident_id, 'report', 'Manual incident recorded through ' || replace(p_reporting_channel, '_', ' ') || '.',
    v_actor, v_profile.full_name, v_profile.role::text, 'dashboard', nullif(trim(coalesce(p_initial_notes, '')), '')
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'create_incident_report', 'incident', v_public_id, v_barangay,
    jsonb_build_object('reporting_channel', p_reporting_channel, 'intake_organization', v_intake,
      'management_mode', v_management, 'source_type', 'manual_entry'));
  return jsonb_build_object('ok', true, 'incident_id', v_public_id, 'management_mode', v_management);
end;
$$;

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
  v_profile public.profiles%rowtype;
begin
  if trim(coalesce(p_notes, '')) = '' then raise exception 'Validation notes are required.'; end if;
  if p_validation_result not in (
    'validated', 'accidental_activation', 'duplicate_report', 'non_emergency',
    'unverified', 'false_or_misleading', 'fraudulent_hoax_prank'
  ) then raise exception 'Unsupported validation result.'; end if;
  select * into v_profile from public.profiles where id = v_actor and is_active;
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found.'; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your validation scope.';
  end if;
  if v_profile.role::text in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin')
     and v_incident.managing_organization <> 'mdrrmo' then
    raise exception 'The responsible barangay retains validation control.';
  end if;
  if v_incident.status not in ('reported', 'pending_validation', 'new_alert', 'validated')
     and not (v_incident.status = 'closed' and v_incident.validation_status = 'false_alarm') then
    raise exception 'Validation is locked after dispatch or response activity begins.';
  end if;

  update public.incidents set
    validation_result = p_validation_result,
    validation_notes = trim(p_notes),
    validation_status = case
      when p_validation_result = 'validated' then 'confirmed'
      when p_validation_result = 'unverified' then 'pending_review'
      else 'false_alarm'
    end,
    status = case
      when p_validation_result = 'validated' then 'validated'::public.incident_status
      when p_validation_result = 'unverified' then 'pending_validation'::public.incident_status
      else 'closed'::public.incident_status
    end,
    validated_by = v_actor, validated_at = now(), updated_by = v_actor
  where id = v_incident.id;

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'validation', 'Validation recorded: ' || replace(initcap(p_validation_result), '_', ' '),
    v_actor, v_profile.full_name, v_profile.role::text, 'dashboard', trim(p_notes)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'validate_incident', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('result', p_validation_result, 'notes', trim(p_notes),
      'managing_organization', v_incident.managing_organization));
  return jsonb_build_object('ok', true, 'status', p_validation_result);
end;
$$;

create or replace function public.acknowledge_nodeguard_after_hours_alert(
  p_incident_public_id text,
  p_action text,
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
  v_profile public.profiles%rowtype;
  v_incident public.incidents%rowtype;
begin
  if trim(coalesce(p_notes, '')) = '' then raise exception 'Acknowledgement notes are required.'; end if;
  select * into v_profile from public.profiles where id = v_actor and is_active;
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found or not v_incident.after_hours_alert then raise exception 'After-hours IoT alert not found.'; end if;

  if p_action = 'barangay_acknowledge' then
    if v_profile.role::text not in ('barangay_admin', 'barangay_personnel')
       or v_profile.barangay_id <> v_incident.barangay_id then
      raise exception 'Only the responsible barangay may acknowledge this alert.';
    end if;
    if v_incident.mdrrmo_fallback_claimed_at is not null then
      raise exception 'LT-MDRRMO has already claimed fallback coordination.';
    end if;
    update public.incidents set barangay_acknowledged_at = now(), barangay_acknowledged_by = v_actor,
      managing_organization = 'barangay', updated_by = v_actor where id = v_incident.id;
  elsif p_action = 'mdrrmo_claim' then
    if v_profile.role::text not in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin') then
      raise exception 'LT-MDRRMO authorization is required.';
    end if;
    if v_incident.barangay_acknowledged_at is not null then raise exception 'The barangay already acknowledged this alert.'; end if;
    if v_incident.barangay_acknowledgement_due_at > now() then
      raise exception 'The configured barangay acknowledgement period has not expired.';
    end if;
    update public.incidents set mdrrmo_fallback_claimed_at = now(), mdrrmo_fallback_claimed_by = v_actor,
      managing_organization = 'mdrrmo', management_mode = 'municipal_coordination',
      status = 'coordinated_by_mdrrmo', updated_by = v_actor where id = v_incident.id;
  else
    raise exception 'Unsupported after-hours action.';
  end if;

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'after_hours_' || p_action,
    case when p_action = 'barangay_acknowledge'
      then 'Responsible barangay acknowledged the after-hours IoT alert.'
      else 'LT-MDRRMO claimed after-hours fallback coordination.' end,
    v_actor, v_profile.full_name, v_profile.role::text, 'dashboard', trim(p_notes)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'after_hours_' || p_action, 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('notes', trim(p_notes)));
  return jsonb_build_object('ok', true, 'action', p_action);
end;
$$;

create or replace function public.set_barangay_operating_hours(
  p_barangay_id uuid,
  p_staffed_days smallint[],
  p_opens_at time,
  p_closes_at time,
  p_acknowledgement_minutes integer,
  p_is_enabled boolean,
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
begin
  select * into v_profile from public.profiles where id = v_actor and is_active;
  if not found or not (
    v_profile.role::text in ('mdrrmo_admin', 'super_admin')
    or (v_profile.role::text = 'barangay_admin' and v_profile.barangay_id = p_barangay_id)
  ) then raise exception 'Administrator authorization is required for operating-hours settings.'; end if;
  if p_acknowledgement_minutes not between 1 and 120 then
    raise exception 'Acknowledgement period must be between 1 and 120 minutes.';
  end if;
  if p_opens_at = p_closes_at then raise exception 'Opening and closing time must differ.'; end if;
  if p_staffed_days is null or cardinality(p_staffed_days) = 0
     or not (p_staffed_days <@ array[1,2,3,4,5,6,7]::smallint[]) then
    raise exception 'Select at least one valid staffed day.';
  end if;

  insert into public.barangay_operating_hours (
    barangay_id, staffed_days, opens_at, closes_at, acknowledgement_minutes,
    is_enabled, updated_by, updated_at
  ) values (
    p_barangay_id, p_staffed_days, p_opens_at, p_closes_at,
    p_acknowledgement_minutes, p_is_enabled, v_actor, now()
  ) on conflict (barangay_id) do update set
    staffed_days = excluded.staffed_days, opens_at = excluded.opens_at,
    closes_at = excluded.closes_at, acknowledgement_minutes = excluded.acknowledgement_minutes,
    is_enabled = excluded.is_enabled, updated_by = excluded.updated_by, updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'update_operating_hours', 'barangay', p_barangay_id::text, p_barangay_id,
    jsonb_build_object('staffed_days', p_staffed_days, 'opens_at', p_opens_at,
      'closes_at', p_closes_at, 'acknowledgement_minutes', p_acknowledgement_minutes,
      'is_enabled', p_is_enabled));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.close_nodeguard_incident(
  p_incident_public_id text,
  p_actions_taken text,
  p_result_outcome text,
  p_closure_notes text,
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
begin
  if trim(coalesce(p_actions_taken, '')) = ''
     or trim(coalesce(p_result_outcome, '')) = ''
     or trim(coalesce(p_closure_notes, '')) = '' then
    raise exception 'Actions taken, result or outcome, and closure notes are required.';
  end if;
  select * into v_profile from public.profiles where id = v_actor and is_active;
  select * into v_incident from public.incidents where public_id = p_incident_public_id for update;
  if not found then raise exception 'Incident not found.'; end if;
  if not public.can_coordinate_nodeguard_incident(v_incident.id, v_actor) then
    raise exception 'This incident is outside your closure scope.';
  end if;
  if v_incident.status <> 'resolved' then raise exception 'Only a resolved incident can be closed.'; end if;

  update public.incidents set
    actions_taken = trim(p_actions_taken),
    resolution_details = trim(p_result_outcome),
    closure_details = trim(p_closure_notes),
    updated_by = v_actor
  where id = v_incident.id;
  insert into public.incident_status_updates (incident_id, status, remarks, created_by)
  values (v_incident.id, 'closed', trim(p_closure_notes), v_actor);
  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'closure', 'Incident closure completed with responder and resource history preserved.',
    v_actor, v_profile.full_name, v_profile.role::text, 'dashboard', trim(p_closure_notes)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'close_incident', 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('actions_taken', trim(p_actions_taken), 'result_outcome', trim(p_result_outcome),
      'closure_notes', trim(p_closure_notes), 'closed_at', now()));
  return jsonb_build_object('ok', true, 'status', 'closed');
end;
$$;

alter table public.barangay_operating_hours enable row level security;
drop policy if exists "authorized users read operating hours" on public.barangay_operating_hours;
create policy "authorized users read operating hours" on public.barangay_operating_hours
for select to authenticated using (
  public.is_nodeguard_mdrrmo_user()
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active
      and p.barangay_id = barangay_operating_hours.barangay_id
  )
);

grant select on public.barangay_operating_hours to authenticated;
grant execute on function public.is_barangay_staffed(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.create_nodeguard_incident_report(
  text, text, text, text, text, text, text, text, uuid, timestamptz, timestamptz,
  integer, text, text, text, text, text, uuid
) to authenticated, service_role;
grant execute on function public.classify_nodeguard_incident(text, text, text, uuid)
  to authenticated, service_role;
grant execute on function public.acknowledge_nodeguard_after_hours_alert(text, text, text, uuid)
  to authenticated, service_role;
grant execute on function public.set_barangay_operating_hours(
  uuid, smallint[], time, time, integer, boolean, uuid
) to authenticated, service_role;
grant execute on function public.close_nodeguard_incident(text, text, text, text, uuid)
  to authenticated, service_role;
