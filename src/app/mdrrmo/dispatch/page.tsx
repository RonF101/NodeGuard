import { Suspense } from "react";
import { IncidentOperationsView } from "@/components/IncidentOperationsView";

export default function MdrrmoDispatchPage() {
  return (
    <Suspense>
      <IncidentOperationsView
        mode="live"
        environment="mdrrmo"
        scope="dispatch"
        eyebrow="Municipal Assignment Desk"
        title="Assignments and Dispatch"
        subtitle="Assign municipal teams and resources to direct LT-MDRRMO cases, acknowledged escalations, and eligible after-hours incidents."
      />
    </Suspense>
  );
}
