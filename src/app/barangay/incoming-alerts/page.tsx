import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function BarangayIncomingAlertsPage() {
  return <Suspense><IncidentOperationsView mode="live" environment="barangay" scope="incoming" eyebrow="Supplementary IoT Intake" title="Incoming IoT Alerts" subtitle="Review automatic alerts from nodes registered to your barangay. Manual reports are recorded through New Incident Report." /></Suspense>;
}
