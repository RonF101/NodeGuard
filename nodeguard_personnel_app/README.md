# NodeGuard Personnel

Flutter application for authorized field responders coordinated by La Trinidad MDRRMO. It shares incidents, assignments, node state, field notes, and realtime updates with the NodeGuard web dashboard through Supabase.

## Verify locally

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```

Without dart-defines, the app enters clearly labeled demo mode. Live mode requires the same Supabase project as the web dashboard:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://your-project-ref.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Live users must have a Supabase Auth account, an active `profiles` row, and a linked `responders.profile_id`. Live backend failures are shown to the user and are never hidden by mock records.

## Implemented field workflow

- Receive assigned incidents and realtime changes.
- View category, priority, registered node, address, coordinates, and field-note history.
- Open coordinates in the device map application.
- Open private voice context through a short-lived signed URL when available.
- Update Assigned, En Route, On Scene, Responding, Resolved, or Need Backup status.
- Require remarks when requesting backup.
- Control the assigned node buzzer subject to database authorization.
- Update responder availability with rollback-safe error handling.

## Release

Android uses application ID `ph.gov.latrinidad.nodeguard.personnel`. Copy `android/key.properties.example` to the ignored `android/key.properties`, configure an MDRRMO-controlled upload keystore, then run the `flutter build appbundle --release` command in `../docs/DEPLOYMENT.md`.

The iOS bundle identifier is also `ph.gov.latrinidad.nodeguard.personnel`; Apple signing must be configured in Xcode by the deployment owner.
