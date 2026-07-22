"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import EmergencyShareOutlinedIcon from "@mui/icons-material/EmergencyShareOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { AttentionQueue, type AttentionQueueItem } from "@/components/AttentionQueue";
import { BarangayMonitoringPanel } from "@/components/BarangayMonitoringPanel";
import { EscalationQueuePanel } from "@/components/EscalationQueuePanel";
import { MunicipalResourceCapacityPanel } from "@/components/MunicipalResourceCapacityPanel";
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

export function MdrrmoOverview() {
  const [incidents, setIncidents] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed);
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : responderSeed);
  const [resources, setResources] = useState<ResponseResource[]>(isSupabaseConfigured() ? [] : resourceSeed);
  const [nodes, setNodes] = useState<DeviceNode[]>(isSupabaseConfigured() ? [] : deviceSeed);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextIncidents, nextResponders, nextResources, nextNodes] = await Promise.all([fetchIncidents(), fetchResponders(), fetchResources(), fetchDeviceNodes()]);
      setIncidents(nextIncidents);
      setResponders(nextResponders);
      setResources(nextResources);
      setNodes(nextNodes);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load municipal monitoring.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, load);
    return () => { window.clearTimeout(timer); window.removeEventListener(NODEGUARD_REALTIME_EVENT, load); };
  }, [load]);

  const escalated = sortIncidentQueue(incidents.filter((item) => item.escalationStatus && !["Not Escalated", "Completed"].includes(item.escalationStatus)));
  const activeEscalations = escalated.filter((item) => !isFinalIncident(item.status));
  const directMunicipal = incidents.filter((item) => item.managementMode === "LT-MDRRMO Direct" || item.intakeOrganization === "LT-MDRRMO");
  const afterHours = incidents.filter((item) => item.afterHoursAlert && !item.barangayAcknowledgedAt);
  const municipalResponders = responders.filter((item) => item.organizationType === "LT-MDRRMO");
  const municipalResources = resources.filter((item) => item.organizationType === "LT-MDRRMO");
  const pendingValidation = incidents.filter((item) => ["Reported", "Pending Validation", "Pending Verification"].includes(item.status));
  const awaitingAssignment = incidents.filter((item) => ["Validated", "Verified"].includes(item.status) && item.assignedResponder === "Unassigned");
  const responding = incidents.filter((item) => ["Responding", "On Scene", "Escalated", "Coordinated by LT-MDRRMO"].includes(item.status));
  const unhealthyNodes = nodes.filter((item) => item.status !== "Online" || item.deviceHealth !== "Healthy");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const resolvedToday = incidents.filter((item) => item.resolvedAt && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(item.resolvedAt)) === today);
  const closedRecords = incidents.filter((item) => ["Closed", "False Alert"].includes(item.status));
  const totalActive = incidents.filter((item) => !isFinalIncident(item.status));

  const attentionItems = useMemo(() => {
    const entries: AttentionQueueItem[] = sortIncidentQueue(incidents.filter((incident) => !isFinalIncident(incident.status))).flatMap<AttentionQueueItem>((incident) => {
      const href = `/mdrrmo/all-incidents?incident=${encodeURIComponent(incident.id)}`;
      const meta = `${getElapsedWaitingTime(incident)} · ${formatPhilippineDateTime(incident.timestamp)} PHT`;
      if (incident.escalationStatus === "Pending Acknowledgement") return [{ id: `${incident.id}-ack`, title: `${incident.id} · Escalation awaiting acknowledgement`, detail: incident.escalationReason ?? `${incident.barangayName ?? "Barangay"} requested municipal support.`, meta, href, action: "Acknowledge", urgency: incident.alertLevel === "Critical" ? "critical" as const : "high" as const }];
      if ((incident.managementMode === "LT-MDRRMO Direct" || incident.intakeOrganization === "LT-MDRRMO") && ["Reported", "Pending Validation", "Pending Verification"].includes(incident.status)) return [{ id: `${incident.id}-direct`, title: `${incident.id} · Direct municipal report`, detail: `${incident.category} · ${incident.location}`, meta, href, action: "Review", urgency: incident.alertLevel === "Critical" ? "critical" as const : "warning" as const }];
      if (incident.alertLevel === "Critical" && incident.assignedResponder === "Unassigned") return [{ id: `${incident.id}-unassigned`, title: `${incident.id} · Critical incident without a team`, detail: `${incident.category} · ${incident.location}`, meta, href, action: "Assign municipal team", urgency: "critical" as const }];
      if (incident.smsNotification?.status === "Failed") return [{ id: `${incident.id}-sms`, title: `${incident.id} · Failed SMS notification`, detail: incident.smsNotification.failureReason ?? "Notification delivery requires review.", meta, href, action: "Review notification", urgency: "high" as const }];
      if (incident.afterHoursAlert && !incident.barangayAcknowledgedAt) return [{ id: `${incident.id}-after-hours`, title: `${incident.id} · After-hours alert`, detail: `${incident.barangayName ?? "Responsible barangay"} acknowledgement is outstanding.`, meta, href, action: "Open incident", urgency: "warning" as const }];
      return [];
    });
    unhealthyNodes.forEach((node) => entries.push({ id: `${node.id}-health`, title: `${node.id} · Unhealthy IoT node`, detail: `${node.location} · ${node.deviceHealth ?? node.status}`, meta: "Current municipal node health", href: `/mdrrmo/iot-nodes?search=${encodeURIComponent(node.id)}`, action: "Review node", urgency: node.status === "Offline" ? "critical" : "warning" }));
    return entries.slice(0, 7);
  }, [incidents, unhealthyNodes]);

  const updateIncident = (updated: Incident) => setIncidents((current) => current.map((item) => item.id === updated.id ? updated : item));

  return (
    <AppShell>
      <PageHeader eyebrow="Municipal Command and Coordination" title="LT-MDRRMO Municipal Overview" subtitle="Municipality-wide records, direct municipal intake, active escalations, cross-barangay readiness, and consolidated decision support." />
      {error && <Box sx={{ mb: 2 }}><ErrorState message={error} onRetry={() => void load()} /></Box>}
      {loading && !incidents.length ? <LoadingSkeleton rows={7} /> : (
        <Stack spacing={3}>
          <Box component="section" aria-labelledby="municipal-command-metrics">
            <Typography id="municipal-command-metrics" variant="h5" color="secondary" sx={{ mb: 1.5 }}>Municipal command metrics</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Pending Validation" value={pendingValidation.length} helper="Municipality-wide active records awaiting review" tone="#946200" icon={<WarningAmberOutlinedIcon />} href="/mdrrmo/all-incidents?status=Pending%20Validation" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Awaiting Assignment" value={awaitingAssignment.length} helper="Reviewed records without an assigned team" tone="#D65A1F" icon={<AssignmentIndOutlinedIcon />} href="/mdrrmo/dispatch" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Responding or On Scene" value={responding.length} helper="Municipality-wide current field response" tone="#155EEF" icon={<LocationCityOutlinedIcon />} href="/mdrrmo/active-incidents" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Active Escalations" value={activeEscalations.length} helper="Awaiting or receiving municipal coordination" tone="#D65A1F" icon={<EmergencyShareOutlinedIcon />} href="/mdrrmo/escalated-incidents" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Available Responders" value={municipalResponders.filter((item) => item.availability === "Available").length} helper={`Current municipal capacity · ${municipalResponders.length} stored`} tone="#1F7A4D" icon={<GroupsOutlinedIcon />} href="/mdrrmo/responders-resources?search=Response%20Team" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Available Resources" value={municipalResources.filter((item) => item.status === "Available").length} helper={`Current municipal capacity · ${municipalResources.length} stored`} tone="#1F7A4D" icon={<Inventory2OutlinedIcon />} href="/mdrrmo/responders-resources" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}><StatCard label="Unhealthy IoT Nodes" value={unhealthyNodes.length} helper={`Current network · ${nodes.length - unhealthyNodes.length} of ${nodes.length} healthy`} tone={unhealthyNodes.length ? "#C62828" : "#1F7A4D"} icon={<SensorsOutlinedIcon />} href="/mdrrmo/iot-nodes" /></Grid>
            </Grid>
          </Box>

          <Grid container spacing={2} component="section" aria-label="Municipal operational command area">
            <Grid size={{ xs: 12, xl: 8 }}><OperationsMapPreview environment="mdrrmo" incidents={incidents} nodes={nodes} /></Grid>
            <Grid size={{ xs: 12, xl: 4 }}><SectionCard title="Incidents Requiring Attention" description="Sorted by severity, escalation state, and time waiting."><AttentionQueue items={attentionItems} emptyMessage="No escalation, direct report, SMS, node, or after-hours exception is waiting." /></SectionCard></Grid>
          </Grid>

          <SectionCard title="Escalated Incident Queue" description="Operational status remains separate from escalation. Acknowledge requests, review barangay actions, and coordinate municipal support.">
            <EscalationQueuePanel incidents={activeEscalations} responders={responders} resources={resources} onIncidentUpdated={updateIncident} onRespondersUpdated={setResponders} onResourcesUpdated={setResources} />
          </SectionCard>

          <SectionCard title="Secondary Municipal Summaries" description="Defined scopes and periods">
            <Grid container spacing={1.25}>{[
              ["Direct LT-MDRRMO reports", directMunicipal.length, "All stored direct municipal records"],
              ["Resolved today", resolvedToday.length, "Asia/Manila calendar day"],
              ["After-hours watch", afterHours.length, "Current outstanding acknowledgements"],
              ["Closed records", closedRecords.length, "All stored final records"],
              ["Total active records", totalActive.length, "Municipality-wide current records"],
            ].map(([label, value, scope]) => <Grid key={String(label)} size={{ xs: 12, sm: 6, lg: "grow" }}><Box sx={{ height: "100%", p: 1.5, borderRadius: 1, bgcolor: "background.default" }}><Typography variant="h5">{value}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography><Typography variant="caption" color="text.secondary">{scope}</Typography></Box></Grid>)}</Grid>
          </SectionCard>

          <SectionCard title="Barangay Operational Comparison" description="Click a barangay to open its filtered municipal incident view.">
            <BarangayMonitoringPanel incidents={incidents} responders={responders} resources={resources} nodes={nodes} />
          </SectionCard>

          <SectionCard title="Municipal Resource Capacity" description="Recorded availability only; no automatic fuel, maintenance, GPS, or inventory tracking is implied.">
            <MunicipalResourceCapacityPanel responders={responders} resources={resources} />
          </SectionCard>
        </Stack>
      )}
    </AppShell>
  );
}
