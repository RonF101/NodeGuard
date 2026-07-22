"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Stack from "@mui/material/Stack";
import { AppShell } from "@/components/AppShell";
import { IncidentModal } from "@/components/IncidentModal";
import { IncidentTable } from "@/components/IncidentTable";
import { ErrorState, LoadingSkeleton } from "@/components/OperationalFeedback";
import { PageHeader } from "@/components/PageHeader";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import {
  activeResponseStatuses,
  incidentStatusOrder,
  isFinalIncident,
} from "@/config/incidentOperations";
import { incidents as incidentSeed } from "@/data/incidents";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import { fetchIncidents, fetchResponders, fetchResources } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Incident, IncidentStatus, Responder, ResponseResource } from "@/types";

type IncidentOperationsViewProps = {
  mode: "live" | "registry";
  environment?: "barangay" | "mdrrmo" | "legacy";
  scope?: "incoming" | "active" | "dispatch" | "escalated" | "records";
  title?: string;
  eyebrow?: string;
  subtitle?: string;
};

export function IncidentOperationsView({
  mode,
  environment = "legacy",
  scope,
  title,
  eyebrow,
  subtitle,
}: IncidentOperationsViewProps) {
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const requestedIncident = searchParams.get("incident");
  const initialSearch = searchParams.get("barangay") ?? searchParams.get("search") ?? "";
  const initialStatus = incidentStatusOrder.includes(requestedStatus as IncidentStatus)
    ? (requestedStatus as IncidentStatus)
    : "All";
  const activeScope = searchParams.get("scope") === "active";
  const [selected, setSelected] = useState<Incident | null>(null);
  const [items, setItems] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed);
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : responderSeed);
  const [resources, setResources] = useState<ResponseResource[]>(isSupabaseConfigured() ? [] : resourceSeed);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadIncidents = useCallback(async () => {
    try {
      const [nextIncidents, nextResponders, nextResources] = await Promise.all([
        fetchIncidents(),
        fetchResponders(),
        fetchResources(),
      ]);
      setItems(nextIncidents);
      setResponders(nextResponders);
      setResources(nextResources);
      setSelected((current) =>
        current
          ? nextIncidents.find((incident) => incident.id === current.id) ?? current
          : null,
      );
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load incident operations.");
    } finally {
      setLoading(false);
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
    const scoped = environment === "barangay" && !isSupabaseConfigured()
      ? items.filter((incident) => incident.barangayId === "brgy-pico")
      : items;
    if (scope === "incoming") {
      return scoped.filter((incident) => incident.sourceType === "IoT Node" && ["Reported", "Pending Validation", "Pending Verification"].includes(incident.status));
    }
    if (scope === "active") {
      return scoped.filter((incident) => !isFinalIncident(incident.status));
    }
    if (scope === "dispatch") {
      return scoped.filter((incident) => ["Validated", "Verified", "Assigned", "Dispatched", "Responding", "On Scene", "Escalated", "Coordinated by LT-MDRRMO"].includes(incident.status));
    }
    if (scope === "escalated") {
      return scoped.filter((incident) => incident.escalationStatus && incident.escalationStatus !== "Not Escalated");
    }
    if (activeScope) {
      return scoped.filter((incident) => activeResponseStatuses.includes(incident.status));
    }
    if (mode === "live") {
      return scoped.filter((incident) => !isFinalIncident(incident.status));
    }
    return scoped;
  }, [activeScope, environment, items, mode, scope]);

  useEffect(() => {
    if (!requestedIncident) return;
    const timer = window.setTimeout(() => {
      const requested = visibleItems.find((incident) => incident.id === requestedIncident);
      if (requested) setSelected(requested);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedIncident, visibleItems]);

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
        eyebrow={eyebrow ?? (mode === "live" ? "Incident Operations" : "Operations Record")}
        title={title ?? (mode === "live" ? "Live Alerts" : "Incidents")}
        subtitle={
          subtitle ?? (mode === "live"
            ? "Validate reports from every intake channel, dispatch teams, and monitor active field response."
            : "Search and review the complete NodeGuard incident record.")
        }
      />
      {loadError && <ErrorState message={loadError} onRetry={() => { setLoading(true); void loadIncidents(); }} />}
      {loading ? <LoadingSkeleton rows={6} /> : <Stack spacing={2}>
        <IncidentTable
          key={`${mode}:${initialStatus}:${activeScope}:${initialSearch}`}
          incidents={visibleItems}
          onView={setSelected}
          showVoice
          initialStatus={initialStatus}
          initialSearch={initialSearch}
        />
      </Stack>}
      <IncidentModal
        key={selected?.id ?? `${mode}-incident-modal`}
        incident={selected}
        open={Boolean(selected)}
        responders={responders}
        resources={resources}
        onClose={() => setSelected(null)}
        onIncidentUpdated={handleIncidentUpdated}
        onRespondersUpdated={setResponders}
        onResourcesUpdated={setResources}
        environment={environment}
      />
    </AppShell>
  );
}
