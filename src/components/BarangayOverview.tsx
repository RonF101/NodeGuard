"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { AttentionQueue, type AttentionQueueItem } from "@/components/AttentionQueue";
import { DashboardIncidentPanel } from "@/components/DashboardIncidentPanel";
import { ErrorState, LoadingSkeleton } from "@/components/OperationalFeedback";
import { OperationsMapPreview } from "@/components/OperationsMapPreview";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { incidents as incidentSeed } from "@/data/incidents";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { fetchDeviceNodes, fetchIncidents, fetchResponders, fetchResources } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatPhilippineDateTime, getElapsedWaitingTime, isFinalIncident, sortIncidentQueue } from "@/config/incidentOperations";
import type { DeviceNode, Incident, Responder, ResponseResource } from "@/types";

export function BarangayOverview() {
  const demoIncidents = incidentSeed.filter((incident) => incident.barangayId === "brgy-pico");
  const [incidents, setIncidents] = useState<Incident[]>(isSupabaseConfigured() ? [] : demoIncidents);
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : responderSeed.filter((item) => item.barangayId === "brgy-pico"));
  const [resources, setResources] = useState<ResponseResource[]>(isSupabaseConfigured() ? [] : resourceSeed.filter((item) => item.barangayId === "brgy-pico"));
  const [nodes, setNodes] = useState<DeviceNode[]>(isSupabaseConfigured() ? [] : deviceSeed.filter((item) => item.barangayId === "brgy-pico"));
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextIncidents, nextResponders, nextResources, nextNodes] = await Promise.all([
        fetchIncidents(), fetchResponders(), fetchResources(), fetchDeviceNodes(),
      ]);
      setIncidents(nextIncidents);
      setResponders(nextResponders);
      setResources(nextResources);
      setNodes(nextNodes);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load barangay operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, load);
    return () => { window.clearTimeout(timer); window.removeEventListener(NODEGUARD_REALTIME_EVENT, load); };
  }, [load]);

  const pendingValidation = incidents.filter((item) => ["Reported", "Pending Validation", "Pending Verification"].includes(item.status));
  const awaitingAssignment = incidents.filter((item) => ["Validated", "Verified"].includes(item.status) && item.assignedResponder === "Unassigned");
  const activeResponse = incidents.filter((item) => ["Assigned", "Dispatched", "Responding", "On Scene", "Escalated", "Coordinated by LT-MDRRMO"].includes(item.status));
  const active = sortIncidentQueue(incidents.filter((incident) => !isFinalIncident(incident.status)));
  const availableResponders = responders.filter((item) => item.availability === "Available").length;
  const availableResources = resources.filter((item) => item.status === "Available").length;
  const unacknowledgedIot = incidents.filter((item) => item.sourceType === "IoT Node" && ["Reported", "Pending Validation", "Pending Verification"].includes(item.status));
  const unhealthyNodes = nodes.filter((node) => node.status !== "Online" || node.deviceHealth !== "Healthy");
  const outcomes = {
    escalated: incidents.filter((item) => item.escalationStatus && item.escalationStatus !== "Not Escalated").length,
    resolved: incidents.filter((item) => item.status === "Resolved").length,
    closed: incidents.filter((item) => ["Closed", "False Alert"].includes(item.status)).length,
    cancelled: incidents.filter((item) => item.status === "Cancelled").length,
  };
  const recentActivity = incidents
    .flatMap((incident) => (incident.activityHistory ?? []).map((item) => ({ ...item, incidentId: incident.id })))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const attentionItems = useMemo(() => {
    const entries: AttentionQueueItem[] = sortIncidentQueue(incidents.filter((incident) => !isFinalIncident(incident.status))).flatMap<AttentionQueueItem>((incident) => {
      const href = `/barangay/all-incidents?incident=${encodeURIComponent(incident.id)}`;
      const meta = `${getElapsedWaitingTime(incident)} · ${formatPhilippineDateTime(incident.timestamp)} PHT`;
      if (incident.smsNotification?.status === "Failed") return [{ id: `${incident.id}-sms`, title: `${incident.id} · Failed SMS notification`, detail: incident.smsNotification.failureReason ?? "Mock delivery requires review.", meta, href, action: "Review", urgency: "high" as const }];
      if (["Reported", "Pending Validation", "Pending Verification"].includes(incident.status)) return [{ id: `${incident.id}-validation`, title: `${incident.id} · Pending validation`, detail: `${incident.category} · ${incident.location}`, meta, href, action: "Validate", urgency: incident.alertLevel === "Critical" ? "critical" as const : "warning" as const }];
      if (["Validated", "Verified"].includes(incident.status) && incident.assignedResponder === "Unassigned") return [{ id: `${incident.id}-assignment`, title: `${incident.id} · Awaiting assignment`, detail: `${incident.category} · ${incident.location}`, meta, href, action: "Assign", urgency: incident.alertLevel === "Critical" ? "critical" as const : "high" as const }];
      if (incident.escalationStatus === "Pending Acknowledgement") return [{ id: `${incident.id}-escalation`, title: `${incident.id} · Municipal acknowledgement pending`, detail: incident.escalationReason ?? "Escalation sent to LT-MDRRMO.", meta, href, action: "Open incident", urgency: "high" as const }];
      return [];
    });
    if (!availableResponders) entries.push({ id: "responder-shortage", title: "No responder currently available", detail: "Review active assignments and local capacity.", meta: "Current available capacity", href: "/barangay/responders", action: "Review responders", urgency: "critical" });
    if (!availableResources) entries.push({ id: "resource-shortage", title: "No resource currently available", detail: "Review assigned and unavailable local assets.", meta: "Current available capacity", href: "/barangay/resources", action: "Review resources", urgency: "critical" });
    return entries.slice(0, 6);
  }, [availableResources, availableResponders, incidents]);

  return (
    <AppShell>
      <PageHeader eyebrow="Barangay Frontline Operations" title="Barangay Emergency Overview" subtitle="Local validation, assignments, active response, IoT alerts, and escalation for records owned by your assigned barangay." />
      {error && <Box sx={{ mb: 2 }}><ErrorState message={error} onRetry={() => void load()} /></Box>}
      {loading && !incidents.length ? <LoadingSkeleton rows={6} /> : (
        <Stack spacing={3}>
          <Box component="section" aria-labelledby="barangay-immediate-metrics">
            <Typography id="barangay-immediate-metrics" variant="h5" color="secondary" sx={{ mb: 1.5 }}>Immediate operational metrics</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Pending Validation" value={pendingValidation.length} helper="Current active records awaiting local review" tone="#946200" icon={<FactCheckOutlinedIcon />} href="/barangay/all-incidents?status=Pending%20Validation" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Awaiting Assignment" value={awaitingAssignment.length} helper="Reviewed records without an assigned team" tone="#D65A1F" icon={<AssignmentIndOutlinedIcon />} href="/barangay/dispatch" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Active Response" value={activeResponse.length} helper="Currently assigned, dispatched, responding, or on scene" tone="#155EEF" icon={<GroupsOutlinedIcon />} href="/barangay/active-incidents" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Available Responders" value={availableResponders} helper={`Current capacity · ${responders.length} local responders stored`} tone="#1F7A4D" icon={<GroupsOutlinedIcon />} href="/barangay/responders" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Available Resources" value={availableResources} helper={`Current capacity · ${resources.length} local resources stored`} tone="#1F7A4D" icon={<Inventory2OutlinedIcon />} href="/barangay/resources" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Unacknowledged IoT Alerts" value={unacknowledgedIot.length} helper="Current node-generated reports awaiting validation" tone="#C62828" icon={<SensorsOutlinedIcon />} href="/barangay/incoming-alerts" /></Grid>
            </Grid>
          </Box>

          <Grid container spacing={2} component="section" aria-label="Operational map and attention queue">
            <Grid size={{ xs: 12, xl: 8 }}><OperationsMapPreview environment="barangay" incidents={incidents} nodes={nodes} /></Grid>
            <Grid size={{ xs: 12, xl: 4 }}><SectionCard title="Incidents Requiring Attention" description="Sorted by severity and time waiting."><AttentionQueue items={attentionItems} emptyMessage="No validation, assignment, SMS, escalation, or capacity exception is waiting." /></SectionCard></Grid>
          </Grid>

          <Grid container spacing={2} component="section" aria-label="Secondary operational summaries">
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionCard title="Incident Outcomes" description="All stored barangay records">
                <Grid container spacing={1.25}>{Object.entries(outcomes).map(([label, value]) => <Grid key={label} size={{ xs: 6 }}><Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.default" }}><Typography variant="h5">{value}</Typography><Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>{label}</Typography></Box></Grid>)}</Grid>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <SectionCard title="Recent Activity" description="Latest five recorded events">
                <Stack spacing={1}>{recentActivity.length ? recentActivity.map((item) => <Box key={`${item.incidentId}-${item.id}`}><Typography variant="body2" sx={{ fontWeight: 700 }}>{item.incidentId} · {item.message}</Typography><Typography variant="caption" color="text.secondary">{formatPhilippineDateTime(item.createdAt)} PHT</Typography></Box>) : <Typography variant="body2" color="text.secondary">No recent activity recorded.</Typography>}</Stack>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <SectionCard title="Local Readiness" description="Current capacity and node health">
                <Stack spacing={1}><Typography variant="body2"><strong>Responders:</strong> {availableResponders}/{responders.length} available</Typography><Typography variant="body2"><strong>Resources:</strong> {availableResources}/{resources.length} available</Typography><Typography variant="body2"><strong>IoT nodes:</strong> {nodes.length - unhealthyNodes.length}/{nodes.length} healthy</Typography>{unhealthyNodes.length > 0 && <Typography variant="caption" color="error">{unhealthyNodes.length} node{unhealthyNodes.length === 1 ? "" : "s"} require review.</Typography>}</Stack>
              </SectionCard>
            </Grid>
          </Grid>

          <SectionCard title="Active Barangay Incidents" description="Current active records. Validate, assign, dispatch, monitor, resolve locally, or escalate when capacity is exceeded.">
            <DashboardIncidentPanel incidents={active} responders={responders} resources={resources} environment="barangay" onIncidentUpdated={(updated) => setIncidents((current) => current.map((item) => item.id === updated.id ? updated : item))} onRespondersUpdated={setResponders} onResourcesUpdated={setResources} />
          </SectionCard>
        </Stack>
      )}
    </AppShell>
  );
}
