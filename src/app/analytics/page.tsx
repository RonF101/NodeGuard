"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { analyticsIncidents } from "@/data/analytics";
import { fetchIncidents } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { AnalyticsIncident, Incident } from "@/types";

function toAnalyticsIncident(incident: Incident): AnalyticsIncident {
  const validationStatus = incident.validationStatus ??
    (incident.status === "False Alert"
      ? "False Alarm"
      : incident.status === "Pending Verification"
        ? "Pending Review"
        : "Confirmed");
  return {
    incidentId: incident.id,
    category: incident.category,
    deviceId: incident.deviceId,
    nodeLocation: incident.nodeLocation ?? incident.location,
    timestamp: incident.timestamp,
    status: incident.status,
    validationStatus,
    assignedResponder: incident.assignedResponder,
    priority: incident.alertLevel,
    isFalseAlarm: validationStatus === "False Alarm",
    responseTimeMinutes: incident.responseTimeMinutes ?? 0,
  };
}

export default function AnalyticsPage() {
  const liveMode = isSupabaseConfigured();
  const [incidents, setIncidents] = useState<AnalyticsIncident[]>(liveMode ? [] : analyticsIncidents);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setIncidents((await fetchIncidents()).map(toAnalyticsIncident));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load analytics data.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadAnalytics(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadAnalytics);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadAnalytics);
    };
  }, [loadAnalytics]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operational Metrics"
        title="Analytics"
        subtitle="Incident trends, node activity, alert validation, and prone-area insights."
      />
      {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
      <AnalyticsCharts incidents={incidents} useLatestRecordAsReference={!liveMode} />
    </AppShell>
  );
}
