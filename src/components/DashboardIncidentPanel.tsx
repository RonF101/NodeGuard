"use client";

import { useState } from "react";
import { IncidentModal } from "@/components/IncidentModal";
import { IncidentTable } from "@/components/IncidentTable";
import { Incident, Responder } from "@/types";

type DashboardIncidentPanelProps = {
  incidents: Incident[];
  responders: Responder[];
};

export function DashboardIncidentPanel({
  incidents,
  responders,
}: DashboardIncidentPanelProps) {
  const [selected, setSelected] = useState<Incident | null>(null);

  return (
    <>
      <IncidentTable incidents={incidents} onView={setSelected} />
      <IncidentModal
        key={selected?.id ?? "dashboard-incident-modal"}
        incident={selected}
        open={Boolean(selected)}
        responders={responders}
        onClose={() => setSelected(null)}
        onAssigned={() =>
          window.dispatchEvent(new CustomEvent("nodeguard:realtime-change"))
        }
      />
    </>
  );
}
