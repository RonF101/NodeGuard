alter type public.incident_status add value if not exists 'new_alert' before 'assigned';
alter type public.availability_status add value if not exists 'dispatched' after 'available';

update public.incidents
set status = 'new_alert'
where assigned_responder_name is null or assigned_responder_name = 'Unassigned';
