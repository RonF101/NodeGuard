-- Make response-resource availability authoritative across dispatch, field
-- visibility, backup coordination, and incident completion.

alter table public.response_resources
add column if not exists availability_note text;

alter table public.resource_assignments
add column if not exists release_reason text;

update public.response_resources
set availability_note = case status
  when 'available' then 'Ready for dispatch.'
  when 'under_maintenance' then 'Under maintenance; dispatch is blocked.'
  when 'unavailable' then 'Unavailable for operational use.'
  when 'reserved' then 'Reserved for a planned operation.'
  when 'dispatched' then 'Assigned to ' || coalesce(assigned_incident_public_id, 'an active incident') || '.'
end
where availability_note is null;

create unique index if not exists one_active_assignment_per_resource
on public.resource_assignments(resource_id)
where released_at is null;

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
  if not public.is_nodeguard_dispatcher(v_actor) then
    raise exception 'Dispatcher authorization is required.';
  end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;
  if not found then raise exception 'Incident not found: %', p_incident_public_id; end if;
  if v_incident.status in ('resolved', 'closed', 'false_alert') then
    raise exception 'Resources cannot be assigned to a completed incident.';
  end if;

  select * into v_resource
  from public.response_resources
  where public_code = p_resource_code
  for update;
  if not found then raise exception 'Resource not found: %', p_resource_code; end if;
  if v_resource.status <> 'available' or v_resource.assigned_incident_public_id is not null then
    raise exception '% is not available for dispatch.', v_resource.unit_name;
  end if;
  if exists (
    select 1 from public.resource_assignments
    where resource_id = v_resource.id and released_at is null
  ) then
    raise exception '% already has an active resource assignment.', v_resource.unit_name;
  end if;

  update public.response_resources
  set
    status = 'dispatched',
    assigned_incident_public_id = v_incident.public_id,
    availability_note = 'Assigned to ' || v_incident.public_id || '.'
  where id = v_resource.id;

  insert into public.resource_assignments (
    resource_id, incident_id, assigned_by, notes
  ) values (
    v_resource.id,
    v_incident.id,
    v_actor,
    'Assigned from the NodeGuard operations dashboard.'
  );

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source
  )
  select
    v_incident.id,
    'assignment',
    v_resource.public_code || ' - ' || v_resource.unit_name || ' was assigned to this incident.',
    v_actor,
    p.full_name,
    replace(initcap(p.role::text), '_', ' '),
    'dashboard'
  from public.profiles p where p.id = v_actor;

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  )
  select distinct
    r.profile_id,
    r.id,
    v_incident.id,
    'assignment_changed'::public.notification_type,
    'Resource assigned: ' || v_incident.public_id,
    v_resource.unit_name || ' (' || v_resource.public_code || ') was assigned to your incident.'
  from public.responders r
  where r.profile_id is not null
    and (
      r.name = v_incident.assigned_responder_name
      or r.current_assignment = v_incident.public_id
    );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'assign_resource',
    'response_resource',
    v_resource.public_code,
    jsonb_build_object(
      'incident_id', v_incident.public_id,
      'unit_name', v_resource.unit_name,
      'previous_status', v_resource.status,
      'status', 'dispatched'
    )
  );

  return jsonb_build_object('ok', true, 'resource_code', v_resource.public_code, 'incident_id', v_incident.public_id);
end;
$$;

grant execute on function public.assign_nodeguard_resource(text, text, uuid)
to authenticated, service_role;

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
  if not public.is_nodeguard_dispatcher(v_actor) then
    raise exception 'Dispatcher authorization is required.';
  end if;
  if p_next_status not in ('available', 'under_maintenance', 'unavailable', 'reserved') then
    raise exception 'Select a valid post-release availability status.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A release or availability reason is required.';
  end if;

  select * into v_resource
  from public.response_resources
  where public_code = p_resource_code
  for update;
  if not found then raise exception 'Resource not found: %', p_resource_code; end if;

  select * into v_assignment
  from public.resource_assignments
  where resource_id = v_resource.id and released_at is null
  order by assigned_at desc
  limit 1
  for update;
  if v_assignment.id is null or v_resource.status <> 'dispatched' then
    raise exception '% does not have an active dispatch assignment.', v_resource.unit_name;
  end if;

  select * into v_incident from public.incidents where id = v_assignment.incident_id;

  update public.resource_assignments
  set released_at = now(), release_reason = btrim(p_reason)
  where id = v_assignment.id;

  update public.response_resources
  set
    status = p_next_status,
    assigned_incident_public_id = null,
    availability_note = btrim(p_reason)
  where id = v_resource.id;

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  )
  select
    v_incident.id,
    'assignment',
    v_resource.public_code || ' - ' || v_resource.unit_name || ' was released with status '
      || replace(initcap(replace(p_next_status, '_', ' ')), ' ', ' ') || '.',
    v_actor,
    p.full_name,
    replace(initcap(p.role::text), '_', ' '),
    'dashboard',
    btrim(p_reason)
  from public.profiles p where p.id = v_actor;

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  )
  select distinct
    r.profile_id,
    r.id,
    v_incident.id,
    'assignment_changed'::public.notification_type,
    'Resource released: ' || v_incident.public_id,
    v_resource.unit_name || ' (' || v_resource.public_code || ') was released. ' || btrim(p_reason)
  from public.responders r
  where r.profile_id is not null
    and (
      r.name = v_incident.assigned_responder_name
      or r.current_assignment = v_incident.public_id
    );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'release_resource',
    'response_resource',
    v_resource.public_code,
    jsonb_build_object(
      'incident_id', v_incident.public_id,
      'previous_status', v_resource.status,
      'status', p_next_status,
      'reason', btrim(p_reason)
    )
  );

  return jsonb_build_object('ok', true, 'resource_code', v_resource.public_code, 'status', p_next_status);
end;
$$;

grant execute on function public.release_nodeguard_resource(text, text, text, uuid)
to authenticated, service_role;

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
  if not public.is_nodeguard_dispatcher(v_actor) then
    raise exception 'Dispatcher authorization is required.';
  end if;
  if p_status not in ('available', 'under_maintenance', 'unavailable', 'reserved') then
    raise exception 'Select a valid resource availability status.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'An availability reason is required.';
  end if;

  select * into v_resource
  from public.response_resources
  where public_code = p_resource_code
  for update;
  if not found then raise exception 'Resource not found: %', p_resource_code; end if;
  if v_resource.status = 'dispatched'
     or v_resource.assigned_incident_public_id is not null
     or exists (
       select 1 from public.resource_assignments
       where resource_id = v_resource.id and released_at is null
     ) then
    raise exception 'Release this resource from its incident before changing availability.';
  end if;

  update public.response_resources
  set status = p_status, availability_note = btrim(p_reason)
  where id = v_resource.id;

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'update_resource_status',
    'response_resource',
    v_resource.public_code,
    jsonb_build_object(
      'previous_status', v_resource.status,
      'status', p_status,
      'reason', btrim(p_reason)
    )
  );

  return jsonb_build_object('ok', true, 'resource_code', v_resource.public_code, 'status', p_status);
end;
$$;

grant execute on function public.set_nodeguard_resource_status(text, text, text, uuid)
to authenticated, service_role;

create or replace function public.release_resources_for_final_incident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource record;
begin
  if new.status in ('resolved', 'closed', 'false_alert')
     and old.status is distinct from new.status then
    for v_resource in
      select rr.id, rr.public_code, rr.unit_name
      from public.response_resources rr
      where rr.assigned_incident_public_id = new.public_id
        and rr.status = 'dispatched'
      for update
    loop
      update public.resource_assignments
      set
        released_at = coalesce(released_at, now()),
        release_reason = coalesce(release_reason, 'Automatically released when incident changed to ' || new.status::text || '.')
      where resource_id = v_resource.id and released_at is null;

      update public.response_resources
      set
        status = 'available',
        assigned_incident_public_id = null,
        availability_note = 'Automatically released when ' || new.public_id || ' changed to ' || new.status::text || '.'
      where id = v_resource.id;

      insert into public.incident_activity_events (
        incident_id, event_type, message, actor_name, actor_role, source, reason
      ) values (
        new.id,
        'assignment',
        v_resource.public_code || ' - ' || v_resource.unit_name || ' was automatically released.',
        'NodeGuard System',
        'System',
        'system',
        'Incident changed to ' || new.status::text || '.'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_release_resources on public.incidents;
create trigger incidents_release_resources
after update of status on public.incidents
for each row execute function public.release_resources_for_final_incident();
