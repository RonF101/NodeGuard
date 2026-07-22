import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function BarangayDispatchPage() {
  return <Suspense><IncidentOperationsView mode="registry" environment="barangay" scope="dispatch" eyebrow="Barangay Response Assignment" title="Dispatch" subtitle="Assign available local responders and resources, issue instructions, and monitor the response." /></Suspense>;
}
