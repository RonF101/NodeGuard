"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { AppShell } from "@/components/AppShell";
import { IncidentModal } from "@/components/IncidentModal";
import { IncidentTable } from "@/components/IncidentTable";
import { PageHeader } from "@/components/PageHeader";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import {
  activeResponseStatuses,
  incidentStatusOrder,
  isFinalIncident,
} from "@/config/incidentOperations";
import { incidents as incidentSeed } from "@/data/incidents";
import { responders as responderSeed } from "@/data/responders";
import { fetchIncidents, fetchResponders } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Incident, IncidentStatus, Responder } from "@/types";

type IncidentOperationsViewProps = {
  mode: "live" | "registry";
};

export function IncidentOperationsView({ mode }: IncidentOperationsViewProps) {
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const initialStatus = incidentStatusOrder.includes(requestedStatus as IncidentStatus)
    ? (requestedStatus as IncidentStatus)
    : "All";
  const activeScope = searchParams.get("scope") === "active";
  const [selected, setSelected] = useState<Incident | null>(null);
  const [items, setItems] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed);
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : responderSeed);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    try {
      const [nextIncidents, nextResponders] = await Promise.all([
        fetchIncidents(),
        fetchResponders(),
      ]);
      setItems(nextIncidents);
      setResponders(nextResponders);
      setSelected((current) =>
        current
          ? nextIncidents.find((incident) => incident.id === current.id) ?? current
          : null,
      );
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load incident operations.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadIncidents(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadIncidents);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadIncidents);
    };
  }, [loadIncidents]);

  const visibleItems = useMemo(() => {
    if (activeScope) {
      return items.filter((incident) => activeResponseStatuses.includes(incident.status));
    }
    if (mode === "live") {
      return items.filter((incident) => !isFinalIncident(incident.status));
    }
    return items;
  }, [activeScope, items, mode]);

  const handleIncidentUpdated = useCallback((updatedIncident: Incident) => {
    setItems((current) =>
      current.map((incident) =>
        incident.id === updatedIncident.id ? updatedIncident : incident,
      ),
    );
    setSelected(updatedIncident);
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow={mode === "live" ? "NodeGuard Device Intake" : "Operations Record"}
        title={mode === "live" ? "Live Alerts" : "Incidents"}
        subtitle={
          mode === "live"
            ? "Verify incoming alerts, dispatch teams, and monitor active field response."
            : "Search and review the complete NodeGuard incident record."
        }
      />
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      <Stack spacing={2}>
        <IncidentTable
          key={`${mode}:${initialStatus}:${activeScope}`}
          incidents={visibleItems}
          onView={setSelected}
          showVoice
          initialStatus={initialStatus}
        />
      </Stack>
      <IncidentModal
        key={selected?.id ?? `${mode}-incident-modal`}
        incident={selected}
        open={Boolean(selected)}
        responders={responders}
        onClose={() => setSelected(null)}
        onIncidentUpdated={handleIncidentUpdated}
        onRespondersUpdated={setResponders}
      />
    </AppShell>
  );
}
