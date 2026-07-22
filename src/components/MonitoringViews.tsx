"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { BarangayMonitoringPanel } from "@/components/BarangayMonitoringPanel";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/OperationalFeedback";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { incidents as incidentSeed } from "@/data/incidents";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import { authorizedFetch } from "@/lib/auth";
import { fetchDeviceNodes, fetchIncidents, fetchResponders, fetchResources } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatPhilippineDateTime } from "@/config/incidentOperations";
import type { DeviceNode, Incident, Responder, ResponseResource } from "@/types";

export function BarangayNotifications() {
  const [incidents, setIncidents] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed.filter((item) => item.barangayId === "brgy-pico"));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => void fetchIncidents().then(setIncidents).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load notifications.")), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const notifications = useMemo(() => incidents.flatMap((incident) => (incident.activityHistory ?? []).map((activity) => ({ ...activity, incidentId: incident.id }))).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)), [incidents]);
  return <AppShell><PageHeader eyebrow="Barangay Operational Updates" title="Notifications" subtitle="Field updates, assignment changes, and LT-MDRRMO coordination messages for incidents owned by your barangay." />{error && <ErrorState message={error} />}<Stack spacing={1.5}>{notifications.length ? notifications.map((item) => <Card key={`${item.incidentId}-${item.id}`}><CardContent><Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.incidentId} · {item.type}</Typography><Typography variant="caption" color="text.secondary">{formatPhilippineDateTime(item.createdAt)} PHT</Typography></Stack><Typography variant="body2" sx={{ mt: 0.75 }}>{item.message}</Typography>{item.reason && <Typography variant="caption" color="text.secondary">Reason: {item.reason}</Typography>}</CardContent></Card>) : !error && <EmptyState title="No operational notifications" description="Assignment, field, and coordination updates will appear here." />}</Stack></AppShell>;
}

export function BarangayMonitoring() {
  const [incidents, setIncidents] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed);
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : responderSeed);
  const [resources, setResources] = useState<ResponseResource[]>(isSupabaseConfigured() ? [] : resourceSeed);
  const [nodes, setNodes] = useState<DeviceNode[]>(isSupabaseConfigured() ? [] : deviceSeed);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      void Promise.all([fetchIncidents(), fetchResponders(), fetchResources(), fetchDeviceNodes()])
        .then(([nextIncidents, nextResponders, nextResources, nextNodes]) => { setIncidents(nextIncidents); setResponders(nextResponders); setResources(nextResources); setNodes(nextNodes); setError(null); })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load barangay monitoring."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <AppShell><PageHeader eyebrow="Barangay Coordination" title="Barangay Monitoring" subtitle="Municipality-wide comparison of incidents, escalations, available local capacity, and IoT-node health. Barangay operational ownership remains visible." />{error && <ErrorState message={error} />}{loading && !incidents.length ? <LoadingSkeleton rows={6} /> : <SectionCard title="Municipality-Wide Barangay Comparison" description="Barangays with critical incidents, active escalations, or unhealthy nodes are highlighted first."><BarangayMonitoringPanel incidents={incidents} responders={responders} resources={resources} nodes={nodes} /></SectionCard>}</AppShell>;
}

type AuditLog = { id: string; action: string; entityType: string; entityId: string; actorName: string; barangayName?: string; createdAt: string; details: Record<string, unknown> };

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => void authorizedFetch("/api/audit-logs").then((response) => response.json()).then((result: { ok: boolean; logs?: AuditLog[]; reason?: string }) => result.ok ? setLogs(result.logs ?? []) : setError(result.reason ?? "Unable to load audit logs.")).catch(() => setError("Unable to load audit logs.")).finally(() => setLoading(false)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <AppShell><PageHeader eyebrow="Administrative Accountability" title="Audit Logs" subtitle="Validation, dispatch, escalation, status, reassignment, resource, and closure actions recorded by NodeGuard." />{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{loading ? <LoadingSkeleton rows={5} /> : <Stack spacing={1.5}>{logs.map((log) => <Card key={log.id}><CardContent><Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}><Typography sx={{ fontWeight: 800 }}>{log.action.replaceAll("_", " ").toUpperCase()} · {log.entityId}</Typography><Typography variant="caption" color="text.secondary">{formatPhilippineDateTime(log.createdAt)} PHT</Typography></Stack><Typography variant="body2">Actor: {log.actorName} · Barangay: {log.barangayName ?? "Municipal / system"}</Typography><Typography variant="caption" color="text.secondary">{JSON.stringify(log.details)}</Typography></CardContent></Card>)}{!error && !logs.length && <EmptyState title="No audit entries" description="Authorized incident actions will appear here." />}</Stack>}</AppShell>;
}
