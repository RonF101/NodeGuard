// Keep fallback/demo records deterministic across server and client rendering.
// Live Supabase records replace these timestamps whenever the backend is configured.
const DEMO_REFERENCE_TIME = Date.parse("2026-07-16T03:00:00.000Z");

export function demoMinutesAgo(minutes: number) {
  return new Date(DEMO_REFERENCE_TIME - minutes * 60_000).toISOString();
}
