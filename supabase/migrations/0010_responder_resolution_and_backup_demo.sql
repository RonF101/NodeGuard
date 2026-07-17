-- Keep incident resolution in the assigned responder workflow and add one
-- repeatable live-demo backup request owned by a different response team.

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
  v_actor uuid;
  v_role public.user_role;
  v_incident public.incidents%rowtype;
  v_responder public.responders%rowtype;
begin
  if p_status not in ('en_route', 'on_scene', 'responding', 'resolved', 'closed') then
    raise exception 'Invalid incident workflow status.';
  end if;

  v_actor := case when auth.role() = 'service_role' then p_actor_id else auth.uid() end;
  select role into v_role
  from public.profiles
  where id = v_actor and is_active;

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

  select * into v_responder
  from public.responders
  where profile_id = v_actor
  limit 1;

  if p_status = 'resolved' and v_responder.id is null then
    raise exception 'Only the assigned responder can resolve an incident.';
  end if;

  if v_responder.id is not null
     and v_incident.assigned_responder_name is distinct from v_responder.name then
    raise exception 'This incident is no longer assigned to your responder profile.';
  end if;

  if p_status = 'en_route' and v_incident.status <> 'assigned' then
    raise exception 'Only a newly dispatched incident can be marked en route.';
  elsif p_status = 'on_scene' and v_incident.status not in ('en_route', 'responding') then
    raise exception 'The team must be en route before it can be marked on scene.';
  elsif p_status = 'responding' and v_incident.status not in ('en_route', 'on_scene') then
    raise exception 'The team must be en route or on scene before active response begins.';
  elsif p_status = 'resolved' and v_incident.status not in ('on_scene', 'responding', 'need_backup') then
    raise exception 'Only an active field response can be resolved.';
  elsif p_status = 'closed' and v_incident.status <> 'resolved' then
    raise exception 'Only a resolved incident can be closed.';
  end if;

  if p_status <> 'closed' and v_incident.assigned_responder_name is null then
    raise exception 'An assigned responder/team is required for this workflow action.';
  end if;

  insert into public.incident_status_updates (
    incident_id,
    responder_id,
    status,
    remarks,
    created_by
  ) values (
    v_incident.id,
    v_responder.id,
    p_status::public.incident_status,
    coalesce(
      nullif(btrim(p_remarks), ''),
      'Status changed to ' || initcap(replace(p_status, '_', ' ')) ||
        case
          when v_responder.id is null then ' from the NodeGuard operations dashboard.'
          else ' from the NodeGuard personnel application.'
        end
    ),
    v_actor
  );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, details)
  values (
    v_actor,
    'update_incident_status',
    'incident',
    v_incident.public_id,
    jsonb_build_object(
      'previous_status', v_incident.status,
      'status', p_status,
      'remarks', nullif(btrim(p_remarks), '')
    )
  );

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.update_nodeguard_incident_status(text, text, text, uuid)
to authenticated, service_role;

do $$
declare
  v_incident_id uuid;
  v_ems_responder_id uuid;
  v_admin_profile_id uuid;
  v_ronie_profile_id uuid;
  v_ronie_responder_id uuid;
begin
  select id into v_ems_responder_id
  from public.responders
  where name = 'EMS Team Alpha';

  select id into v_admin_profile_id
  from public.profiles
  where role in ('admin', 'super_admin') and is_active
  order by case role when 'super_admin' then 0 else 1 end
  limit 1;

  select r.profile_id, r.id
  into v_ronie_profile_id, v_ronie_responder_id
  from public.responders r
  where r.name = 'Ronie Delos Santos';

  if v_ems_responder_id is null or v_admin_profile_id is null then
    raise exception 'The backup demo requires EMS Team Alpha and an active dashboard profile.';
  end if;

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
    assigned_responder_name,
    validation_status,
    validated_by,
    validated_at
  ) values (
    'NG-2026-207',
    'medical',
    'high',
    'assigned',
    'LT-NODE-004',
    'School Area',
    'School zone, Barangay Betag, La Trinidad, Benguet',
    'School Area Alert Node',
    '16.4504, 120.5864',
    now() - interval '22 minutes',
    'voice',
    true,
    '00:18',
    'EMS Team Alpha is treating two injured patients and needs additional medical personnel plus transport support.',
    'EMS Medical Response Unit',
    'EMS Team Alpha',
    'confirmed',
    v_admin_profile_id,
    now() - interval '20 minutes'
  )
  on conflict (public_id) do nothing
  returning id into v_incident_id;

  if v_incident_id is null then
    select id into v_incident_id
    from public.incidents
    where public_id = 'NG-2026-207';
  end if;

  if not exists (
    select 1 from public.incident_assignments
    where incident_id = v_incident_id and responder_id = v_ems_responder_id
  ) then
    insert into public.incident_assignments (
      incident_id, responder_id, assigned_unit, assigned_by, assigned_at, notes
    ) values (
      v_incident_id,
      v_ems_responder_id,
      'EMS Medical Response Unit',
      v_admin_profile_id,
      now() - interval '20 minutes',
      'EMS Team Alpha dispatched for the backup-coordination demonstration.'
    );
  end if;

  if not exists (
    select 1 from public.incident_status_updates
    where incident_id = v_incident_id and remarks = 'EMS Team Alpha arrived and began patient assessment.'
  ) then
    insert into public.incident_status_updates (
      incident_id, responder_id, status, remarks, created_by, created_at
    ) values (
      v_incident_id,
      v_ems_responder_id,
      'on_scene',
      'EMS Team Alpha arrived and began patient assessment.',
      v_admin_profile_id,
      now() - interval '13 minutes'
    );
  end if;

  if not exists (
    select 1 from public.incident_status_updates
    where incident_id = v_incident_id and remarks = 'Two patients require simultaneous care and additional transport capacity.'
  ) then
    insert into public.incident_status_updates (
      incident_id, responder_id, status, remarks, created_by, created_at
    ) values (
      v_incident_id,
      v_ems_responder_id,
      'need_backup',
      'Two patients require simultaneous care and additional transport capacity.',
      v_admin_profile_id,
      now() - interval '5 minutes'
    );
  end if;

  if not exists (
    select 1 from public.backup_requests
    where incident_id = v_incident_id
      and status in ('requested', 'assistance_offered', 'partially_filled', 'confirmed')
  ) then
    insert into public.backup_requests (
      public_id,
      incident_id,
      status,
      requested_at,
      requested_by,
      requesting_responder_id,
      requesting_team,
      assistance_types,
      responders_needed,
      reason,
      urgency
    ) values (
      'BR-DEMO-207',
      v_incident_id,
      'requested',
      now() - interval '5 minutes',
      v_admin_profile_id,
      v_ems_responder_id,
      'EMS Team Alpha',
      array['medical', 'equipment_vehicle']::text[],
      2,
      'Two patients need simultaneous triage and an additional transport vehicle.',
      'high'
    );
  end if;

  if not exists (
    select 1 from public.incident_activity_events
    where incident_id = v_incident_id
      and message = 'EMS Team Alpha requested two additional responders and transport support.'
  ) then
    insert into public.incident_activity_events (
      incident_id,
      event_type,
      message,
      actor_name,
      actor_role,
      source,
      reason,
      created_at
    ) values (
      v_incident_id,
      'backup',
      'EMS Team Alpha requested two additional responders and transport support.',
      'EMS Team Alpha',
      'Medical Response Team',
      'system',
      'Two patients need simultaneous triage and an additional transport vehicle.',
      now() - interval '5 minutes'
    );
  end if;

  if v_ronie_profile_id is not null and not exists (
    select 1 from public.notifications
    where recipient_profile_id = v_ronie_profile_id
      and incident_id = v_incident_id
      and type = 'backup_requested'
  ) then
    insert into public.notifications (
      recipient_profile_id,
      responder_id,
      incident_id,
      type,
      title,
      message,
      is_read
    ) values (
      v_ronie_profile_id,
      v_ronie_responder_id,
      v_incident_id,
      'backup_requested',
      'Backup requested: NG-2026-207',
      'EMS Team Alpha needs two responders and transport support at the School Area.',
      false
    );
  end if;

  update public.responders
  set
    availability = 'busy',
    current_assignment = 'NG-2026-207',
    last_status_update = now() - interval '5 minutes'
  where id = v_ems_responder_id;
end;
$$;
