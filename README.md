# NodeGuard

Standalone MDRRMO emergency response coordination dashboard prototype for La Trinidad.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Connection

The dashboard can run with mock data or connect to the shared NodeGuard Supabase backend.

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/migrations/0001_nodeguard_core.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in browser or mobile code. It lets the Next.js dashboard read operational data on the server while database Row Level Security remains enabled.

The login page uses Supabase Auth when the public Supabase env vars are present. Before using real accounts, create dashboard and responder users in Supabase Auth and link them to `profiles`/`responders` rows.

## Prototype Scope

- Next.js App Router with TypeScript
- Material UI themed with La Trinidad MDRRMO-inspired orange, cream, and green colors
- Mock local data for incidents, responders, users, reports, and device nodes
- Working routes for login, dashboard, live alerts, map, responders, reports, analytics, users, and settings
- Optional Supabase Auth/PostgreSQL connection with mock fallback
- No real map, voice playback, or export integration yet

The structure is prepared for future Supabase/PostgreSQL API integration through `src/data` and `src/types`.
