# NodeGuard Operational UI System

This is the implementation contract shared by the NodeGuard coordination website and personnel application. It translates the MDRRMO **Ready / Set / Go** language into consistent behavior without using red as decoration.

## Audit outcome

### Kept and strengthened

- The website remains the coordination surface for triage, assignment, monitoring, maps, reports, analytics, users, and settings.
- The personnel app remains the field surface for assigned incidents, navigation, status updates, notes, voice context, and device control.
- Existing Supabase authorization, realtime refresh, incident workflow, and device APIs remain the single operational data path.

### Reworked

- Orange/green primary actions were consolidated into a white, blue, and red operational system.
- The flat website sidebar is now grouped into Operations, GIS & Mapping, Reporting, and Administration and can collapse without hiding route meaning from assistive technology.
- A persistent connectivity strip appears on both products. It distinguishes `Online · Synced`, `Low-Bandwidth Mode`, and `Offline · Local Sync`.
- Remote map tiles and voice media are deferred in constrained modes; essential coordinates, transcripts, forms, incident data, and local map previews remain available.
- Responder and incident selectors are searchable.
- Dispatch, false-alarm closure, incident resolution, and node-buzzer commands include a review step. Urgent buzzer activation is the only destructive control styled red.
- Mobile button and icon-button hit areas are at least 48 by 48 logical pixels. Status chips use padded Material targets.
- Dispatch and status drafts are saved locally. Personnel status updates can queue and sync after reconnection; buzzer and dispatch commands are never automatically replayed.

### Removed or de-emphasized

- Red styling from maintenance, unavailable resources, false alarms, generic active counts, and other non-urgent conditions.
- Category colors as a proxy for urgency. Operational state now determines urgency color.
- Remote media and tile loading when the operator explicitly selects Low-Bandwidth Mode.

## Information architecture

```text
Website
├─ Operations
│  ├─ Dashboard
│  ├─ Live Alerts
│  └─ Responders & Resources
├─ GIS & Mapping
│  └─ Incident Map
├─ Reporting
│  ├─ Reports
│  └─ Analytics
└─ Administration (role-gated)
   ├─ Users
   └─ Settings

Personnel app
├─ Home / assigned work
├─ Map / route context
├─ Alerts / municipal awareness
├─ History
└─ Profile / availability
```

Critical paths stay shallow:

- Website dispatch: Alerts or Responders → select incident/team → review → confirm dispatch.
- Field update: Assignment → incident → update status → local draft → confirm final state when required → submit or queue.
- Urgent device command: Incident → node buzzer → review device and impact → confirm urgent activation.

## Design tokens

These are NodeGuard implementation tokens derived from the MDRRMO Ready / Set / Go requirement. They are not presented as sampled logo values.

| Token | Hex | Operational meaning | Use |
|---|---:|---|---|
| Ready White | `#FFFFFF` | Ready / clear | Base surfaces, readable contrast, neutral readiness |
| Set Blue | `#155EEF` | Set / coordinated action | Primary actions, selection, en route, active workflow |
| Set Blue Dark | `#0B3A67` | Command structure | Header, navigation hierarchy, strong text |
| Set Blue Soft | `#EAF2FF` | Prepared context | Connectivity strips, selected backgrounds, information |
| Go Red | `#C62828` | Urgent field consequence | Active response, backup request, critical priority, buzzer activation |
| Go Red Soft | `#FDECEC` | Urgent support surface | Urgent status chips and confirmation context |
| Navy | `#0B1F33` | Stable institutional frame | Sidebar and high-contrast text |
| Border | `#D9E2EC` | Separation | Cards, fields, layout structure |
| Muted | `#52606D` | Non-urgent secondary state | Maintenance, unavailable, metadata |
| Success | `#1F7A4D` | Completed / available | Resolved, clear, successfully synced |

Typography uses a legible system sans-serif stack. Body copy should remain 16 logical pixels on mobile where practical; captions must not carry the only critical information.

## State and network behavior

| Mode | Persistent indicator | Still available | Deferred or blocked |
|---|---|---|---|
| Online | `Online · Synced` | Realtime data, dispatch, audio, maps, device commands | None |
| Low bandwidth | `Low-Bandwidth Mode` | Text, forms, transcripts, coordinates, local previews | Remote audio and map tiles |
| Offline | `Offline · Local Sync` | Cached screen state, drafts, queued field status updates | Dispatch, external maps, device commands |

Connection type is treated as a hint, not proof of internet reachability. Failed field-status writes are retained locally for later retry. High-impact commands are not queued because replaying stale dispatch or buzzer instructions creates operational risk.

## Safe-trigger rules

1. Present a plain-language summary naming the incident, target, device, or destination.
2. Require an explicit review checkbox.
3. Disable confirmation while offline for dispatch and device commands.
4. Use red only when the action itself creates an urgent field consequence.
5. Keep cancel and back controls at least as easy to reach as confirmation.
6. Never imply that a locally saved draft has been dispatched or received by the backend.

## GIS integration

The operational map provides live NodeGuard node selection, coordinates, an external full map, a tile-free constrained-mode view, and a link to the authoritative MDRRMO hazard-map library. Production conversion of official flood, landslide, earthquake, evacuation, and all-hazard publications into interactive barangay overlays requires approved georeferenced GeoJSON or vector tiles. The interface must not trace or invent boundaries from display PDFs.

When approved GIS files are available, add them behind the existing map control boundary using this contract:

```ts
type OperationalLayer = {
  id: "barangays" | "flood" | "landslide" | "earthquake" | "evacuation";
  label: string;
  sourceVersion: string;
  updatedAt: string;
  geoJsonUrl: string;
  availableOffline: boolean;
};
```

Cache only approved lightweight layers for field use, display a source/version label, and preserve feature properties needed to filter all 16 barangays.

## Code blueprint

- Website tokens: `src/theme/theme.ts`
- Website global network state: `src/components/connectivity/ConnectivityProvider.tsx`
- Website persistent mode control: `src/components/connectivity/ConnectivityBar.tsx`
- Website guarded confirmation: `src/components/SafeConfirmDialog.tsx`
- Website operational navigation: `src/components/Sidebar.tsx`
- Personnel tokens and touch targets: `nodeguard_personnel_app/lib/theme/`
- Personnel network mode: `nodeguard_personnel_app/lib/services/operational_mode_service.dart`
- Personnel durable status queue: `nodeguard_personnel_app/lib/services/local_sync_queue.dart`
- Personnel persistent mode control: `nodeguard_personnel_app/lib/widgets/connectivity_banner.dart`
- Personnel form autosave and resolution review: `nodeguard_personnel_app/lib/widgets/status_update_sheet.dart`

## Deployment acceptance

- Website: lint, production build, online/low-bandwidth/offline browser checks, confirmation keyboard flow.
- Personnel app: `flutter analyze`, unit/widget tests, and Android release packaging.
- Supabase: apply migrations in order, create authorized profiles, verify RLS, and provision production environment values using `docs/DEPLOYMENT.md`.
- Device control: validate the backend RPC and physical node command channel in a controlled staging exercise before municipal use.
