-- Route responder status changes through one validated RPC so rejected
-- workflow actions never masquerade as offline updates in the mobile queue.

drop function if exists public.update_nodeguard_incident_status(text, text, uuid);

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
        ' from the NodeGuard personnel application.'
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
