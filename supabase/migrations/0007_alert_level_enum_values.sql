-- Add enum values separately so PostgreSQL can commit them before migration 0008
-- uses them in defaults, constraints, and data updates.

alter type public.incident_priority
add value if not exists 'unassessed' before 'critical';

alter type public.notification_type
add value if not exists 'backup_requested';

alter type public.notification_type
add value if not exists 'backup_offer';

alter type public.notification_type
add value if not exists 'backup_confirmed';

alter type public.notification_type
add value if not exists 'backup_updated';
