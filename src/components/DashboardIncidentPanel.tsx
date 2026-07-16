"use client";

import { useState } from "react";
import { IncidentModal } from "@/components/IncidentModal";
import { IncidentTable } from "@/components/IncidentTable";
import { Incident, Responder } from "@/types";

type DashboardIncidentPanelProps = {
  incidents: Incident[];
  responders: Responder[];
  onIncidentUpdated: (incident: Incident) => void;
  onRespondersUpdated: (responders: Responder[]) => void;
};

export function DashboardIncidentPanel({
  incidents,
  responders,
  onIncidentUpdated,
  onRespondersUpdated,
}: DashboardIncidentPanelProps) {
  const [selected, setSelected] = useState<Incident | null>(null);
  const displayedIncident = selected
    ? incidents.find((incident) => incident.id === selected.id) ?? selected
    : null;

  const handleIncidentUpdated = (updatedIncident: Incident) => {
    setSelected(updatedIncident);
    onIncidentUpdated(updatedIncident);
  };

  return (
    <>
      <IncidentTable incidents={incidents} onView={setSelected} />
      <IncidentModal
        key={displayedIncident?.id ?? "dashboard-incident-modal"}
        incident={displayedIncident}
        open={Boolean(displayedIncident)}
        responders={responders}
        onClose={() => setSelected(null)}
        onIncidentUpdated={handleIncidentUpdated}
        onRespondersUpdated={onRespondersUpdated}
      />
    </>
  );
}
