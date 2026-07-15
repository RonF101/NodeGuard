# NodeGuard

NodeGuard is the coordinated emergency reporting and incident-management software for La Trinidad MDRRMO described in the capstone paper. This repository contains:

- A Next.js emergency operations dashboard for authorized MDRRMO personnel.
- A Flutter personnel application for linked field responders.
- Supabase migrations for authentication-linked profiles, fixed alert nodes, incidents, responder/resource assignments, realtime updates, private voice context, audit logs, and Row Level Security.
- Optional provider-neutral SMS delivery after responder assignment.

The three alert categories are intentionally shared and fixed across the database, website, personnel app, and physical-node design: Medical Emergency, Security/Public Safety, and Fire/Disaster Emergency.

## Local verification

```bash
npm install
npm run lint
npm run build
npm run dev
```

The dashboard runs at [http://localhost:3000](http://localhost:3000). Without Supabase variables it enters explicit demo mode; live deployments require Supabase Auth and the migrations below.

```bash
cd nodeguard_personnel_app
flutter pub get
flutter analyze
flutter test
flutter run
```

## Live deployment

1. Create a Supabase project.
2. Apply every SQL file in `supabase/migrations/` in numeric order (`0001` through `0005`).
3. Create the first authorized Auth user and matching `profiles` row; use `docs/DEPLOYMENT.md` for the bootstrap procedure.
4. Configure the web environment from `.env.example`.
5. Deploy the Next.js project, then build the personnel app with the same Supabase URL and public/publishable key.
6. Link every field-responder Auth account to a `responders.profile_id` row.
7. Complete the acceptance test in `docs/DEPLOYMENT.md` before controlled pilot use.

Detailed instructions, release signing, the SMS contract, and the software/hardware integration boundary are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Shared data-flow notes are in [docs/CONNECTION_GUIDE.md](docs/CONNECTION_GUIDE.md). The Ready / Set / Go design tokens, connectivity behavior, touch-target rules, guarded actions, and GIS contract are in [docs/UI_SYSTEM.md](docs/UI_SYSTEM.md).

## Security baseline

- Operational dashboard mutations require a valid Supabase access token and an allowed personnel role.
- Dispatch-desk personnel accounts remain separate from responder-linked field accounts so database policies can enforce the correct incident scope.
- Database RLS limits linked responders to their authorized incident data and status changes.
- Assignment, validation, buzzer, device, resource, and user changes are audited.
- Voice recordings are private and opened through short-lived signed URLs.
- The service-role key is server-only and must never be placed in the Flutter app or exposed as a `NEXT_PUBLIC_` variable.
- Demo mode is for evaluation only and must not be used for real incidents.
