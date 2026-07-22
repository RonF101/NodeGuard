import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function MdrrmoActiveIncidentsPage() {
  return <Suspense><IncidentOperationsView mode="live" environment="mdrrmo" scope="active" eyebrow="Municipal Situation Monitoring" title="Active Incidents" subtitle="Monitor active barangay, direct LT-MDRRMO, escalated, and after-hours fallback incidents." /></Suspense>;
}
