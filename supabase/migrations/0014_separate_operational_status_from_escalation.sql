-- Keep operational progress independent from escalation and municipal coordination.

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
        and (i.managing_organization = 'barangay' or i.escalation_status <> 'not_escalated')
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
  if v_incident.status in ('resolved', 'closed', 'false_alert', 'cancelled') then raise exception 'A completed incident cannot be escalated.'; end if;

  select full_name into v_actor_name from public.profiles where id = v_actor;
  update public.incidents
  set escalation_status = 'pending_acknowledgement',
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
    jsonb_build_object('reason', trim(p_reason), 'operational_status', v_incident.status));
  return jsonb_build_object('ok', true, 'status', 'pending_acknowledgement', 'operational_status', v_incident.status);
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
    return jsonb_build_object('ok', true, 'status', 'coordinating', 'operational_status', v_incident.status);
  end if;
  if v_incident.escalation_status <> 'pending_acknowledgement' then
    raise exception 'This escalation is not awaiting acknowledgement.';
  end if;
  select full_name into v_actor_name from public.profiles where id = v_actor;
  update public.incidents
  set escalation_status = 'coordinating', management_mode = 'municipal_coordination',
      managing_organization = 'mdrrmo', mdrrmo_acknowledged_at = now(), mdrrmo_acknowledged_by = v_actor,
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
    jsonb_build_object('notes', trim(p_notes), 'operational_status', v_incident.status));
  return jsonb_build_object('ok', true, 'status', 'coordinating', 'operational_status', v_incident.status);
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
    if v_incident.mdrrmo_fallback_claimed_at is not null then raise exception 'LT-MDRRMO has already claimed fallback coordination.'; end if;
    update public.incidents set barangay_acknowledged_at = now(), barangay_acknowledged_by = v_actor,
      managing_organization = 'barangay', updated_by = v_actor where id = v_incident.id;
  elsif p_action = 'mdrrmo_claim' then
    if v_profile.role::text not in ('mdrrmo_admin', 'mdrrmo_operations', 'admin', 'super_admin') then raise exception 'LT-MDRRMO authorization is required.'; end if;
    if v_incident.barangay_acknowledged_at is not null then raise exception 'The barangay already acknowledged this alert.'; end if;
    if v_incident.barangay_acknowledgement_due_at > now() then raise exception 'The configured barangay acknowledgement period has not expired.'; end if;
    update public.incidents set mdrrmo_fallback_claimed_at = now(), mdrrmo_fallback_claimed_by = v_actor,
      managing_organization = 'mdrrmo', management_mode = 'municipal_coordination', updated_by = v_actor
    where id = v_incident.id;
  else
    raise exception 'Unsupported after-hours action.';
  end if;

  insert into public.incident_activity_events (
    incident_id, event_type, message, actor_profile_id, actor_name, actor_role, source, reason
  ) values (
    v_incident.id, 'after_hours_' || p_action,
    case when p_action = 'barangay_acknowledge' then 'Responsible barangay acknowledged the after-hours IoT alert.' else 'LT-MDRRMO claimed after-hours fallback coordination.' end,
    v_actor, v_profile.full_name, v_profile.role::text, 'dashboard', trim(p_notes)
  );
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, barangay_id, details)
  values (v_actor, 'after_hours_' || p_action, 'incident', v_incident.public_id, v_incident.barangay_id,
    jsonb_build_object('notes', trim(p_notes), 'operational_status', v_incident.status));
  return jsonb_build_object('ok', true, 'action', p_action, 'operational_status', v_incident.status);
end;
$$;

update public.incidents
set status = case
  when assigned_responder_name is null or assigned_responder_name = 'Unassigned' then 'validated'::public.incident_status
  else 'responding'::public.incident_status
end
where status in ('escalated', 'coordinated_by_mdrrmo');
