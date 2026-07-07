# NodeGuard Web and Personnel App Connection Guide

NodeGuard uses a shared Supabase backend so the web dashboard and Flutter personnel app do not talk directly to each other. Both clients read and write the same PostgreSQL tables through Supabase Auth, Row Level Security, and Realtime-ready tables.

## Shared Data Flow

```text
NodeGuard Web Dashboard
  -> Supabase Auth
  -> Supabase PostgreSQL / RLS
  -> incident_assignments, incident_status_updates, notifications
  <- Flutter Personnel App
```

## Setup Checklist

1. Create a Supabase project.
2. Run `supabase/migrations/0001_nodeguard_core.sql` in the Supabase SQL editor.
3. Create Auth users for dashboard personnel and mobile responders.
4. Insert matching `profiles` rows using the Auth user IDs.
5. Link responder users through `responders.profile_id`.
6. Configure the web dashboard `.env.local` from `.env.example`.
7. Run the Flutter app with `SUPABASE_URL` and `SUPABASE_ANON_KEY` dart-defines.

For an existing Supabase project created before the latest migration edit, also run this in the SQL editor to allow open mobile sessions to receive assignment/status changes immediately:

```sql
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.responders;
alter publication supabase_realtime add table public.incident_assignments;
alter publication supabase_realtime add table public.incident_status_updates;
alter publication supabase_realtime add table public.notifications;
```

If Supabase says a table is already a publication member, that table is already enabled.

If your Supabase project was created before the `New Alert` and `Dispatched` alignment, run this once too:

```sql
alter type public.incident_status add value if not exists 'new_alert' before 'assigned';
alter type public.availability_status add value if not exists 'dispatched' after 'available';
```

To allow the Flutter app to update the logged-in responder's availability, run:

```sql
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'responders'
      and policyname = 'responders can update own availability'
  ) then
    create policy "responders can update own availability"
    on public.responders
    for update to authenticated
    using (profile_id = auth.uid())
    with check (profile_id = auth.uid());
  end if;
end $$;
```

To populate live Supabase with the same broad test dataset used by the local website and Flutter mocks, run:

```text
supabase/seed_status_test_incidents.sql
```

It creates 27 incidents: 3 each for `New Alert`, `Assigned`, `En Route`, `On Scene`, `Responding`, `Resolved`, `Closed`, `Need Backup`, and `False Alert`.

## Security Baseline

- PostgreSQL Row Level Security is enabled on operational tables.
- The Flutter app only receives the public anon/publishable key.
- The dashboard may use `SUPABASE_SERVICE_ROLE_KEY` only on the Next.js server.
- Status changes are recorded in `incident_status_updates` for auditability.
- Incident current status is updated by a database trigger after status-update inserts.
- Voice context storage paths are separated from incident metadata for future signed URL handling.

## Tables

- `profiles`: Auth-linked user profile and role.
- `responders`: Field responder/unit profile and availability.
- `device_locations`: IoT node registry and map metadata.
- `incidents`: Shared incident record used by both apps.
- `incident_assignments`: Assignment history.
- `incident_status_updates`: Responder field updates and remarks.
- `notifications`: Dashboard-to-responder messages.
- `voice_contexts`: Voice metadata and future storage paths.
