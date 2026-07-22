import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function MdrrmoEscalatedIncidentsPage() {
  return <Suspense><IncidentOperationsView mode="live" environment="mdrrmo" scope="escalated" eyebrow="Municipal Coordination Queue" title="Escalated Incidents" subtitle="Acknowledge escalations, review barangay actions, and assign additional municipal responders or resources without overwriting the original record." /></Suspense>;
}
