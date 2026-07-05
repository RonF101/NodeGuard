# NodeGuard

Standalone MDRRMO emergency response coordination dashboard prototype for La Trinidad.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prototype Scope

- Next.js App Router with TypeScript
- Material UI themed with La Trinidad MDRRMO-inspired orange, cream, and green colors
- Mock local data for incidents, responders, users, reports, and device nodes
- Working routes for login, dashboard, live alerts, map, responders, reports, analytics, users, and settings
- No real authentication, database, notification, map, voice playback, or export integration yet

The structure is prepared for future Supabase/PostgreSQL API integration through `src/data` and `src/types`.
