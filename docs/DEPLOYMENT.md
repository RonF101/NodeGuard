# NodeGuard Deployment Guide

## 1. Deployment boundary

This repository deploys the NodeGuard web dashboard, personnel application, database, realtime channels, private voice storage, in-app notifications, and optional SMS webhook integration. Physical emergency-node firmware, enclosure construction, electrical installation, cellular/network provisioning, and an SMS-provider account remain external deployment inputs.

The software accepts device-originated incident records through the shared Supabase schema. A physical node or trusted ingestion service must create an `incidents` row using the registered `device_locations.device_id`; voice files are stored privately in the `voice-contexts` bucket and referenced by `voice_contexts.storage_path`.

## 2. Supabase setup

Apply these files in order:

1. `supabase/migrations/0001_nodeguard_core.sql`
2. `supabase/migrations/0002_status_alignment.sql`
3. `supabase/migrations/0003_responder_self_update.sql`
4. `supabase/migrations/0004_device_buzzer_control.sql`
5. `supabase/migrations/0005_operational_hardening.sql`

Migration `0005` adds alert validation, resources, resource assignments, audit logs, private voice storage, stricter RLS policies, and transactional responder/resource assignment functions.

Use roles deliberately: `super_admin` manages every account and setting; `admin` manages operations and non-super-admin accounts; non-responder `personnel` accounts act as dispatch-desk operators and may validate and assign incidents; `personnel` accounts linked to a `responders` row are field users and can read only assigned incidents and submit field status updates. Do not link a dispatch-desk account to a responder record.

### Bootstrap the first administrator

Create the user in Supabase Authentication, copy its UUID, then run:

```sql
insert into public.profiles (id, full_name, role, agency_unit, contact_number)
values (
  '<AUTH_USER_UUID>',
  '<FULL_NAME>',
  'super_admin',
  'LT-MDRRMO',
  '<CONTACT_NUMBER>'
);
```

After this user signs in, additional users can be created from the dashboard Users page. Field-responder users must also be linked:

```sql
update public.responders
set profile_id = '<AUTH_USER_UUID>'
where public_code = '<RESPONDER_CODE>';
```

## 3. Web dashboard

Create `.env.local` locally or configure the same names in the deployment platform:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
SMS_WEBHOOK_URL=<optional-provider-webhook>
SMS_WEBHOOK_TOKEN=<optional-bearer-token>
```

Production checks:

```bash
npm ci
npm run lint
npm run build
npm run start
```

The service-role key is required for server-side administration and transactional API operations. Never expose it to the browser or mobile build.

### SMS webhook contract

After a responder assignment, NodeGuard always creates an in-app notification. If `SMS_WEBHOOK_URL` is configured, it also sends an authenticated JSON `POST`:

```json
{
  "to": "+639XXXXXXXXX",
  "recipient": "Responder or team name",
  "incidentId": "NG-2026-071",
  "message": "[NodeGuard] ..."
}
```

The provider must return a 2xx response. `SMS_WEBHOOK_TOKEN`, when present, is sent as a Bearer token. Provider credentials and delivery receipts remain provider-specific.

## 4. Personnel application

Run against the same Supabase project:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Only active Auth users linked through `responders.profile_id` can enter the live personnel app. If live loading fails, the app shows an error and retry action; it does not substitute demonstration records.

### Android release

The application ID is `ph.gov.latrinidad.nodeguard.personnel`. Create an upload keystore outside version control, copy `android/key.properties.example` to `android/key.properties`, and replace every placeholder. Then build:

```bash
flutter build appbundle --release \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

If `key.properties` is absent, local release verification falls back to debug signing; that output must not be submitted to an app store.

### iOS

The bundle identifier is `ph.gov.latrinidad.nodeguard.personnel`. Select the MDRRMO-controlled Apple development team and signing certificate in Xcode, then archive the Runner target with the same dart-defines.

## 5. Controlled-pilot acceptance test

1. Sign in to the dashboard with an administrator profile.
2. Sign in to the personnel app with a linked responder profile.
3. Insert or trigger a new node incident and confirm it appears as Pending Review/New Alert.
4. Confirm the alert on the dashboard.
5. Assign a responder and an available resource to the incident.
6. Confirm the personnel app receives the assignment through realtime refresh/in-app notification.
7. Open the coordinates in the device map and personnel route action.
8. If a voice file exists, confirm both clients can open the signed recording and display its transcript.
9. Submit En Route, On Scene, Responding, Need Backup (with remarks), and Resolved updates from the personnel app; confirm the dashboard updates.
10. Test buzzer activation/deactivation only for an authorized operator or assigned responder.
11. Export filtered reports to CSV and use Print / Save PDF.
12. Confirm audit rows were created for validation, assignment, resources, buzzer/device, and user changes.
13. Verify unauthorized requests to operational API routes return HTTP 401/403.

Do not begin public or municipality-wide use until the hardware, network, privacy/security review, maintenance plan, staff training, and emergency protocols identified in the paper are approved for the pilot location.
