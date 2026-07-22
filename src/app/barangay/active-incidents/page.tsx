import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function BarangayActiveIncidentsPage() {
  return <Suspense><IncidentOperationsView mode="live" environment="barangay" scope="active" eyebrow="Local Incident Monitoring" title="Active Incidents" subtitle="Monitor barangay actions, responder assignments, field updates, assistance requests, and escalation progress." /></Suspense>;
}
