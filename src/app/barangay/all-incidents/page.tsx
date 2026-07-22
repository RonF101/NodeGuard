import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function BarangayAllIncidentsPage() {
  return <Suspense><IncidentOperationsView mode="registry" environment="barangay" scope="records" eyebrow="Barangay Incident Repository" title="All Incidents" subtitle="Every manual report and IoT alert recorded for your barangay, including locally resolved and escalated incidents." /></Suspense>;
}
