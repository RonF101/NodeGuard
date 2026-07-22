"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    incidentSubtype: incident.incidentSubtype,
    deviceId: incident.deviceId,
    nodeLocation: incident.nodeLocation ?? incident.location,
    location: incident.location,
    timestamp: incident.timestamp,
    status: incident.status,
    validationStatus,
    assignedResponder: incident.assignedResponder,
    assignedResources: incident.assignedResources,
    priority: incident.alertLevel,
    isFalseAlarm: validationStatus === "False Alarm",
    responseTimeMinutes: incident.responseTimeMinutes ?? 0,
    barangayName: incident.barangayName,
    escalationStatus: incident.escalationStatus,
    validationResult: incident.validationResult,
    sourceType: incident.sourceType,
    reportingChannel: incident.reportingChannel,
    managementMode: incident.managementMode,
    afterHoursAlert: incident.afterHoursAlert,
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
        subtitle="Incident trends, barangay activity, validation, escalation, assignments, and resolution patterns based only on available NodeGuard records."
      />
      {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" color="secondary">Incidents by Barangay</Typography><Stack spacing={0.75} sx={{ mt: 1 }}>{Object.entries(incidents.reduce<Record<string, number>>((result, item) => { const key = item.barangayName ?? "Municipal / Unassigned"; result[key] = (result[key] ?? 0) + 1; return result; }, {})).toSorted((a, b) => b[1] - a[1]).map(([name, count]) => <Stack key={name} direction="row" sx={{ justifyContent: "space-between" }}><Typography>{name === "Municipal / Unassigned" ? name : `Barangay ${name}`}</Typography><Typography sx={{ fontWeight: 900 }}>{count}</Typography></Stack>)}</Stack></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" color="secondary">Reporting Channels</Typography><Stack spacing={0.75} sx={{ mt: 1 }}>{Object.entries(incidents.reduce<Record<string, number>>((result, item) => { const key = item.reportingChannel ?? "Not recorded"; result[key] = (result[key] ?? 0) + 1; return result; }, {})).toSorted((a, b) => b[1] - a[1]).map(([channel, count]) => <Stack key={channel} direction="row" sx={{ justifyContent: "space-between" }}><Typography>{channel}</Typography><Typography sx={{ fontWeight: 900 }}>{count}</Typography></Stack>)}</Stack></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" color="secondary">Intake Source Mix</Typography><Typography variant="h4" sx={{ mt: 1 }}>{incidents.filter((item) => item.sourceType === "Manual Entry").length} manual</Typography><Typography color="text.secondary">{incidents.filter((item) => item.sourceType === "IoT Node").length} IoT-generated · {incidents.filter((item) => item.afterHoursAlert).length} after-hours IoT</Typography></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" color="secondary">Escalation & Local Resolution</Typography><Typography variant="h4" sx={{ mt: 1 }}>{incidents.filter((item) => item.escalationStatus && item.escalationStatus !== "Not Escalated").length} escalated</Typography><Typography color="text.secondary">{incidents.filter((item) => (!item.escalationStatus || item.escalationStatus === "Not Escalated") && ["Resolved", "Closed"].includes(item.status)).length} locally resolved · {incidents.filter((item) => ["LT-MDRRMO Direct", "Municipal Coordination"].includes(item.managementMode ?? "")).length} municipal cases</Typography></CardContent></Card></Grid>
      </Grid>
      <AnalyticsCharts incidents={incidents} useLatestRecordAsReference={!liveMode} />
    </AppShell>
  );
}
