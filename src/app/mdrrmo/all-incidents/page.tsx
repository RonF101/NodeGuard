import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function MdrrmoAllIncidentsPage() {
  return <Suspense><IncidentOperationsView mode="registry" environment="mdrrmo" scope="records" eyebrow="Central NodeGuard Records" title="All Incidents" subtitle="Municipality-wide access to barangay reports, direct LT-MDRRMO reports, IoT alerts, local resolutions, escalations, and validation outcomes." /></Suspense>;
}
