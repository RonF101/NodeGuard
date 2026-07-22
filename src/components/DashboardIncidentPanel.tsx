"use client";

import { useState } from "react";
import { IncidentModal } from "@/components/IncidentModal";
import { IncidentTable } from "@/components/IncidentTable";
import { Incident, Responder, ResponseResource } from "@/types";

type DashboardIncidentPanelProps = {
  incidents: Incident[];
  responders: Responder[];
  resources: ResponseResource[];
  onIncidentUpdated: (incident: Incident) => void;
  onRespondersUpdated: (responders: Responder[]) => void;
  onResourcesUpdated: (resources: ResponseResource[]) => void;
  environment?: "barangay" | "mdrrmo" | "legacy";
};

export function DashboardIncidentPanel({
  incidents,
  responders,
  resources,
  onIncidentUpdated,
  onRespondersUpdated,
  onResourcesUpdated,
  environment = "legacy",
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
        resources={resources}
        onClose={() => setSelected(null)}
        onIncidentUpdated={handleIncidentUpdated}
        onRespondersUpdated={onRespondersUpdated}
        onResourcesUpdated={onResourcesUpdated}
        environment={environment}
      />
    </>
  );
}
