-- Enforce incident-action transitions and responder availability atomically.
-- This migration is safe to run after 0005 and does not recreate existing enum types.

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
  update public.incidents
  set status = new.status
  where id = new.incident_id;

  select public_id, assigned_responder_name
  into v_incident_public_id, v_assigned_responder_name
  from public.incidents
  where id = new.incident_id;

  if new.responder_id is not null then
    update public.responders
    set
      availability = case
        when new.status in ('resolved', 'closed', 'false_alert')
          then 'available'::public.availability_status
        when new.status in ('assigned', 'en_route')
          then 'dispatched'::public.availability_status
        else 'busy'::public.availability_status
      end,
      current_assignment = case
        when new.status in ('resolved', 'closed', 'false_alert') then 'None'
        else v_incident_public_id
      end,
      last_status_update = now()
    where id = new.responder_id;
  elsif new.status in ('resolved', 'closed', 'false_alert') then
    update public.responders
    set availability = 'available',
        current_assignment = 'None',
        last_status_update = now()
    where current_assignment = v_incident_public_id
       or name = v_assigned_responder_name;
  end if;

  return new;
end;
$$;

create or replace function public.assign_nodeguard_responder(
  p_responder_code text,
  p_incident_public_id text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_role public.user_role;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
  v_conflicting_incident text;
begin
  v_actor := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  select role into v_role from public.profiles where id = v_actor and is_active;
  if v_actor is null or v_role is null or (
    v_role not in ('admin', 'super_admin')
    and exists (select 1 from public.responders where profile_id = v_actor)
  ) then
    raise exception 'Authorized dispatch-desk personnel access is required.';
  end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;
  if not found then
    raise exception 'Incident not found: %', p_incident_public_id;
  end if;
  if v_incident.status = 'new_alert' and v_incident.validation_status <> 'confirmed' then
    raise exception 'The alert must be verified before a response team can be dispatched.';
  end if;
  if v_incident.status not in ('new_alert', 'assigned', 'en_route', 'responding', 'on_scene', 'need_backup') then
    raise exception 'Team dispatch is not valid for the current incident status.';
  end if;

  select * into v_responder
  from public.responders
  where public_code = p_responder_code
  for update;
  if not found then
    raise exception 'Responder/team not found: %', p_responder_code;
  end if;
  if v_incident.assigned_responder_name = v_responder.name then
    raise exception '% is already assigned to %.', v_responder.name, v_incident.public_id;
  end if;
  if v_responder.availability <> 'available' then
    raise exception '% is unavailable because the team is assigned to %.',
      v_responder.name,
      coalesce(v_responder.current_assignment, 'another operation');
  end if;

  select i.public_id into v_conflicting_incident
  from public.incidents i
  where i.id <> v_incident.id
    and i.assigned_responder_name = v_responder.name
    and i.status in ('assigned', 'en_route', 'responding', 'on_scene', 'need_backup')
  limit 1;
  if v_conflicting_incident is not null then
    raise exception '% is unavailable because the team is already assigned to %.',
      v_responder.name,
      v_conflicting_incident;
  end if;

  if v_incident.assigned_responder_name is not null then
    update public.responders r
    set availability = 'available',
        current_assignment = 'None',
        last_status_update = now()
    where r.name = v_incident.assigned_responder_name
      and (
        r.current_assignment = v_incident.public_id
        or not exists (
          select 1
          from public.incidents other_incident
          where other_incident.id <> v_incident.id
            and other_incident.assigned_responder_name = r.name
            and other_incident.status in ('assigned', 'en_route', 'responding', 'on_scene', 'need_backup')
        )
      );
  end if;

  update public.incidents
  set assigned_responder_name = v_responder.name,
      assigned_unit = v_responder.agency_unit,
      status = 'assigned'
  where id = v_incident.id;

  update public.responders
  set availability = 'dispatched',
      current_assignment = v_incident.public_id,
      last_status_update = now()
  where id = v_responder.id;

  insert into public.incident_assignments (
    incident_id, responder_id, assigned_unit, assigned_by, notes
  ) values (
    v_incident.id, v_responder.id, v_responder.agency_unit, v_actor,
    'Assigned from NodeGuard dashboard.'
  );

  insert into public.incident_status_updates (
    incident_id, responder_id, status, remarks, created_by
  ) values (
    v_incident.id, v_responder.id, 'assigned',
    v_responder.name || ' was dispatched from the NodeGuard operations dashboard.',
    v_actor
  );

  insert into public.notifications (
    recipient_profile_id, responder_id, incident_id, type, title, message
  ) values (
    v_responder.profile_id, v_responder.id, v_incident.id, 'assignment',
    'New incident assigned: ' || v_incident.public_id,
    v_incident.public_id || ' assigned to ' || v_responder.name || '.'
  );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor, 'assign_responder', 'incident', v_incident.public_id,
    jsonb_build_object(
      'responder_code', v_responder.public_code,
      'responder_name', v_responder.name,
      'replaced_responder', v_incident.assigned_responder_name
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.assign_nodeguard_responder(text, text, uuid)
to authenticated, service_role;

create or replace function public.validate_nodeguard_incident(
  p_incident_public_id text,
  p_validation_status text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_role public.user_role;
  v_incident public.incidents%rowtype;
begin
  if p_validation_status not in ('pending_review', 'confirmed', 'false_alarm') then
    raise exception 'Invalid validation status.';
  end if;

  v_actor := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  select role into v_role from public.profiles where id = v_actor and is_active;
  if v_actor is null or v_role is null or v_role not in ('personnel', 'admin', 'super_admin') then
    raise exception 'Authorized personnel access is required.';
  end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;
  if not found then
    raise exception 'Incident not found: %', p_incident_public_id;
  end if;
  if v_incident.status not in ('new_alert', 'false_alert') then
    raise exception 'Verification can no longer be changed after team dispatch has started.';
  end if;
  if v_incident.validation_status = p_validation_status then
    if p_validation_status = 'confirmed' then
      raise exception 'This alert is already verified.';
    elsif p_validation_status = 'false_alarm' then
      raise exception 'This incident is already marked as a false alert.';
    else
      raise exception 'This alert is already pending review.';
    end if;
  end if;

  update public.incidents
  set validation_status = p_validation_status,
      validated_by = case when p_validation_status = 'pending_review' then null else v_actor end,
      validated_at = case when p_validation_status = 'pending_review' then null else now() end,
      status = case
        when p_validation_status = 'false_alarm' then 'false_alert'::public.incident_status
        else 'new_alert'::public.incident_status
      end
  where id = v_incident.id;

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor, 'validate_incident', 'incident', p_incident_public_id,
    jsonb_build_object(
      'previous_validation_status', v_incident.validation_status,
      'validation_status', p_validation_status
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.validate_nodeguard_incident(text, text, uuid)
to authenticated, service_role;

create or replace function public.update_nodeguard_incident_status(
  p_incident_public_id text,
  p_status text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_role public.user_role;
  v_incident public.incidents%rowtype;
  v_responder_id uuid;
begin
  if p_status not in ('responding', 'on_scene', 'resolved', 'closed') then
    raise exception 'Invalid incident workflow status.';
  end if;

  v_actor := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  select role into v_role from public.profiles where id = v_actor and is_active;
  if v_actor is null or v_role is null or v_role not in ('personnel', 'admin', 'super_admin') then
    raise exception 'Authorized personnel access is required.';
  end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;
  if not found then
    raise exception 'Incident not found: %', p_incident_public_id;
  end if;

  if p_status = 'responding' and v_incident.status not in ('assigned', 'en_route') then
    raise exception 'Only a dispatched incident can be marked as responding.';
  elsif p_status = 'on_scene' and v_incident.status not in ('assigned', 'en_route', 'responding') then
    raise exception 'The incident cannot be marked on scene from its current status.';
  elsif p_status = 'resolved' and v_incident.status not in ('responding', 'on_scene', 'need_backup') then
    raise exception 'Only an active response can be resolved.';
  elsif p_status = 'closed' and v_incident.status <> 'resolved' then
    raise exception 'Only a resolved incident can be closed.';
  end if;

  if p_status <> 'closed' and v_incident.assigned_responder_name is null then
    raise exception 'An assigned responder/team is required for this workflow action.';
  end if;

  select id into v_responder_id
  from public.responders
  where name = v_incident.assigned_responder_name
  limit 1;

  insert into public.incident_status_updates (
    incident_id, responder_id, status, remarks, created_by
  ) values (
    v_incident.id,
    v_responder_id,
    p_status::public.incident_status,
    'Status changed to ' || replace(initcap(replace(p_status, '_', ' ')), ' ', ' ') ||
      ' from the NodeGuard operations dashboard.',
    v_actor
  );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor, 'update_incident_status', 'incident', v_incident.public_id,
    jsonb_build_object('previous_status', v_incident.status, 'status', p_status)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_nodeguard_incident_status(text, text, uuid)
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
  v_actor uuid;
  v_role public.user_role;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
begin
  v_actor := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  select role into v_role from public.profiles where id = v_actor and is_active;
  if v_actor is null or v_role is null or (
    v_role not in ('admin', 'super_admin')
    and exists (select 1 from public.responders where profile_id = v_actor)
  ) then
    raise exception 'Authorized dispatch-desk personnel access is required.';
  end if;

  select * into v_incident
  from public.incidents
  where public_id = p_incident_public_id
  for update;
  if not found then
    raise exception 'Incident not found: %', p_incident_public_id;
  end if;
  if v_incident.status not in ('assigned', 'en_route', 'responding', 'on_scene', 'need_backup') then
    raise exception 'The current incident does not have an active team assignment.';
  end if;
  if v_incident.assigned_responder_name is null then
    raise exception 'This incident does not have an assigned responder/team.';
  end if;

  select * into v_responder
  from public.responders
  where name = v_incident.assigned_responder_name
  for update;

  if found then
    update public.responders
    set availability = 'available',
        current_assignment = 'None',
        last_status_update = now()
    where id = v_responder.id;

    insert into public.notifications (
      recipient_profile_id, responder_id, incident_id, type, title, message
    ) values (
      v_responder.profile_id, v_responder.id, v_incident.id, 'assignment_changed',
      'Assignment removed: ' || v_incident.public_id,
      v_responder.name || ' was formally removed from ' || v_incident.public_id || '.'
    );
  end if;

  update public.incidents
  set assigned_responder_name = null,
      assigned_unit = 'Unassigned',
      status = 'new_alert',
      validation_status = 'confirmed'
  where id = v_incident.id;

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor, 'remove_responder_assignment', 'incident', v_incident.public_id,
    jsonb_build_object('removed_responder', v_incident.assigned_responder_name)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.unassign_nodeguard_responder(text, uuid)
to authenticated, service_role;
