# NodeGuard Personnel Application

Standalone Flutter prototype for authorized field responders in the La Trinidad MDRRMO emergency response coordination system.

## Setup

```bash
flutter pub get
flutter run
```

If native Android project files are missing on your machine, run this once from this directory:

```bash
flutter create --platforms=android .
```

Then run:

```bash
flutter pub get
flutter run
```

## Supabase Connection

The app connects to the same Supabase project as the web dashboard when dart-defines are supplied.

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://your-project-ref.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

On PowerShell:

```powershell
C:\flutter\bin\flutter.bat run `
  --dart-define=SUPABASE_URL=https://your-project-ref.supabase.co `
  --dart-define=SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

When Supabase is configured, the login screen uses Supabase Auth email/password and status updates are written to `incident_status_updates`. When it is not configured, the app stays in offline prototype mode with local mock data.

If Flutter reports plugin symlink errors on Windows, enable Developer Mode in Windows Settings.

## Prototype Scope

- Splash and login screens for authorized responders
- Bottom navigation: Home, Map, Notifications, History, Profile
- Assigned incident list and incident detail flow
- Local mock status updates with remarks
- Voice context placeholder UI
- La Trinidad map placeholder with mock nodes
- Profile availability toggle
- Mock notifications and completed incident history
- Optional Supabase backend/Auth integration with local mock fallback
- No real map API or audio playback integration

## Future Integration

The app is organized around `models/`, `data/`, `screens/`, and `widgets/` so local mock files can later be replaced by Supabase/PostgreSQL API services.
