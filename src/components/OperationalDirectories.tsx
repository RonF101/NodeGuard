"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/OperationalFeedback";
import { StatusChip } from "@/components/StatusChip";
import { OperationalChip } from "@/components/OperationalChip";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import { fetchDeviceNodes, fetchResponders, fetchResources } from "@/lib/nodeguardRepository";
import { authorizedFetch } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { formatPhilippineDateTime } from "@/config/incidentOperations";
import type { DeviceNode, EmergencyCategory, Responder, ResponseResource } from "@/types";

type Environment = "barangay" | "mdrrmo";

function useCapacity(environment: Environment) {
  const seedResponders = environment === "barangay" ? responderSeed.filter((item) => item.barangayId === "brgy-pico") : responderSeed;
  const seedResources = environment === "barangay" ? resourceSeed.filter((item) => item.barangayId === "brgy-pico") : resourceSeed;
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : seedResponders);
  const [resources, setResources] = useState<ResponseResource[]>(isSupabaseConfigured() ? [] : seedResources);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [r, resources] = await Promise.all([fetchResponders(), fetchResources()]); setResponders(r); setResources(resources); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load response capacity."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  return { responders, resources, error, loading, load };
}

function ResponderCard({ responder }: { responder: Responder }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontWeight: 900 }}>{responder.name}</Typography>
          <StatusChip status={responder.availability} />
        </Stack>
        <Typography color="primary" variant="body2" sx={{ fontWeight: 800 }}>{responder.agency} · {responder.role}</Typography>
        <Stack spacing={0.4} sx={{ mt: 1 }}>
          <Typography variant="body2"><strong>Contact:</strong> {responder.contactNumber}</Typography>
          <Typography variant="body2"><strong>Current assignment:</strong> {responder.currentAssignment}</Typography>
          <Typography variant="body2"><strong>Response status:</strong> {responder.availability}</Typography>
          <Typography variant="caption" color="text.secondary">Owner: {responder.organizationType === "Barangay" ? `Barangay ${responder.barangayName ?? "Unassigned"}` : "LT-MDRRMO / municipal partner"}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ResourceCard({ resource }: { resource: ResponseResource }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontWeight: 900 }}>{resource.id} · {resource.unitName}</Typography>
          <StatusChip status={resource.status} />
        </Stack>
        <Typography color="primary" variant="body2" sx={{ fontWeight: 800 }}>{resource.type} · {resource.agency}</Typography>
        <Stack spacing={0.4} sx={{ mt: 1 }}>
          <Typography variant="body2"><strong>Base location:</strong> {resource.baseLocation}</Typography>
          <Typography variant="body2"><strong>Operational condition:</strong> {resource.status}</Typography>
          <Typography variant="body2"><strong>Assigned incident:</strong> {resource.assignedIncident}</Typography>
          <Typography variant="body2"><strong>Notes:</strong> {resource.availabilityNote ?? resource.notes}</Typography>
          <Typography variant="caption" color="text.secondary">Owner: {resource.organizationType === "Barangay" ? `Barangay ${resource.barangayName ?? "Unassigned"}` : "LT-MDRRMO / municipal partner"}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CapacityDirectory({ environment, mode }: { environment: Environment; mode: "responders" | "resources" | "both" }) {
  const { responders, resources, error, loading, load } = useCapacity(environment);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [respondersPage, setRespondersPage] = useState(1);
  const [resourcesPage, setResourcesPage] = useState(1);
  const pageSize = 12;
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(new URLSearchParams(window.location.search).get("search") ?? ""), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleResponders = responders.filter((item) => (!normalizedSearch || `${item.name} ${item.role} ${item.agency} ${item.barangayName ?? ""}`.toLowerCase().includes(normalizedSearch) || normalizedSearch === "response team") && (statusFilter === "All" || item.availability === statusFilter));
  const visibleResources = resources.filter((item) => (!normalizedSearch || `${item.id} ${item.unitName} ${item.type} ${item.agency} ${item.barangayName ?? ""}`.toLowerCase().includes(normalizedSearch)) && (statusFilter === "All" || item.status === statusFilter));
  const pagedResponders = visibleResponders.slice((respondersPage - 1) * pageSize, respondersPage * pageSize);
  const pagedResources = visibleResources.slice((resourcesPage - 1) * pageSize, resourcesPage * pageSize);
  return (
    <AppShell>
      <PageHeader eyebrow={environment === "barangay" ? "Local Response Capacity" : "Municipal Response Capacity"} title={mode === "responders" ? "Responders" : mode === "resources" ? "Resources" : "Responders & Resources"} subtitle={environment === "barangay" ? "Barangay-owned personnel and resources remain identifiable and under local jurisdiction." : "Municipal capacity is assigned primarily to escalated incidents; barangay ownership remains visible."} />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && <LoadingSkeleton rows={4} />}
      <Card sx={{ mb: 3 }}><CardContent><Grid container spacing={1.5}><Grid size={{ xs: 12, md: 8 }}><TextField fullWidth label="Search capacity" placeholder="Name, ID, category, agency, or barangay" value={search} onChange={(event) => { setSearch(event.target.value); setRespondersPage(1); setResourcesPage(1); }} /></Grid><Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth label="Availability" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setRespondersPage(1); setResourcesPage(1); }}><MenuItem value="All">All availability states</MenuItem>{["Available", "Dispatched", "En Route", "On Scene", "Responding", "Busy", "Reserved", "Under Maintenance", "Unavailable", "Offline"].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField></Grid></Grid></CardContent></Card>
      {(mode === "responders" || mode === "both") && <><Typography variant="h6" color="secondary" sx={{ mb: 1.5 }}>Responder Availability · {visibleResponders.length} matching</Typography><Grid container spacing={2} sx={{ mb: 2 }}>{pagedResponders.map((item) => <Grid key={item.id} size={{ xs: 12, md: 6, xl: 4 }}><ResponderCard responder={item} /></Grid>)}{!visibleResponders.length && <Grid size={{ xs: 12 }}><EmptyState title="No responders match" description="Adjust the search or availability filter." /></Grid>}</Grid>{visibleResponders.length > pageSize && <Pagination aria-label="Responder list pages" page={respondersPage} count={Math.ceil(visibleResponders.length / pageSize)} onChange={(_, page) => setRespondersPage(page)} sx={{ mb: 3, display: "flex", justifyContent: "center" }} />}</>}
      {(mode === "resources" || mode === "both") && <><Typography variant="h6" color="secondary" sx={{ mb: 1.5 }}>Resource Availability · {visibleResources.length} matching</Typography><Grid container spacing={2} sx={{ mb: 2 }}>{pagedResources.map((item) => <Grid key={item.id} size={{ xs: 12, md: 6, xl: 4 }}><ResourceCard resource={item} /></Grid>)}{!visibleResources.length && <Grid size={{ xs: 12 }}><EmptyState title="No resources match" description="Adjust the search or availability filter." /></Grid>}</Grid>{visibleResources.length > pageSize && <Pagination aria-label="Resource list pages" page={resourcesPage} count={Math.ceil(visibleResources.length / pageSize)} onChange={(_, page) => setResourcesPage(page)} sx={{ display: "flex", justifyContent: "center" }} />}</>}
    </AppShell>
  );
}

export function ScopedNodesDirectory({ environment }: { environment: Environment }) {
  const seed = environment === "barangay" ? deviceSeed.filter((item) => item.barangayId === "brgy-pico") : deviceSeed;
  const [nodes, setNodes] = useState<DeviceNode[]>(isSupabaseConfigured() ? [] : seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(seed.find((node) => node.status === "Online")?.id ?? "");
  const [category, setCategory] = useState<EmergencyCategory>("Medical Emergency");
  const [forceAfterHours, setForceAfterHours] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const nextNodes = await fetchDeviceNodes();
      setNodes(nextNodes);
      setSelectedNodeId((current) => current || nextNodes.find((node) => node.status === "Online")?.id || "");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load nodes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadNodes(), 0); return () => window.clearTimeout(timer); }, [loadNodes]);
  useEffect(() => { const timer = window.setTimeout(() => setSearch(new URLSearchParams(window.location.search).get("search") ?? ""), 0); return () => window.clearTimeout(timer); }, []);
  const visible = useMemo(() => {
    const scoped = environment === "barangay" && !isSupabaseConfigured() ? nodes.filter((item) => item.barangayId === "brgy-pico") : nodes;
    const normalized = search.trim().toLowerCase();
    return normalized ? scoped.filter((item) => `${item.id} ${item.name} ${item.location} ${item.barangayName ?? ""} ${item.status} ${item.deviceHealth ?? ""}`.toLowerCase().includes(normalized)) : scoped;
  }, [environment, nodes, search]);
  const selectedNode = visible.find((node) => node.id === selectedNodeId) ?? null;

  const simulateActivation = async () => {
    if (!selectedNode) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await authorizedFetch("/api/iot-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedNode.id, category, forceAfterHours }),
      });
      const result = (await response.json()) as { ok: boolean; incident?: { id: string }; reason?: string };
      if (!result.ok || !result.incident) {
        setMessage({ tone: "error", text: result.reason ?? "Activation simulation failed." });
        return;
      }
      await loadNodes();
      setMessage({ tone: "success", text: `${result.incident.id} was created from ${selectedNode.id}. Mock SMS delivery is recorded as a prototype state only.` });
      window.dispatchEvent(new CustomEvent("nodeguard:realtime-change"));
    } catch {
      setMessage({ tone: "error", text: "Activation simulation could not reach the prototype service." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader eyebrow={environment === "barangay" ? "Barangay Device Network" : "Municipal Device Administration"} title={environment === "barangay" ? "NodeGuard Nodes" : "Nodes & Devices"} subtitle={environment === "barangay" ? "Nodes registered to your barangay only. Camera use is limited to activation-time validation captures." : "Monitor all registered nodes and their assigned barangay. System-wide registration and configuration are administrator functions."} />
      {error && <ErrorState message={error} onRetry={() => void loadNodes()} />}
      {loading && <LoadingSkeleton rows={4} />}
      <TextField fullWidth label="Search IoT nodes" placeholder="Node ID, location, barangay, or health" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2, maxWidth: 640 }} />
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" color="secondary">Prototype IoT Activation</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Simulate one of the three physical emergency buttons. The prototype creates an incident automatically and records camera, voice-context, after-hours routing, and mock SMS states without claiming live provider delivery.
          </Typography>
          <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth label="Registered node" value={selectedNodeId} onChange={(event) => setSelectedNodeId(event.target.value)}>{visible.map((node) => <MenuItem key={node.id} value={node.id} disabled={node.status !== "Online"}>{node.id} - {node.name} ({node.status})</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth label="Physical button category" value={category} onChange={(event) => setCategory(event.target.value as EmergencyCategory)}>{["Medical Emergency", "Security/Public Safety", "Fire/Disaster Emergency"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><FormControlLabel control={<Switch checked={forceAfterHours} onChange={(event) => setForceAfterHours(event.target.checked)} />} label="Simulate after-hours routing" /></Grid>
            <Grid size={{ xs: 12 }}><Button disabled={busy || !selectedNode || selectedNode.status !== "Online"} onClick={() => void simulateActivation()}>{busy ? "Creating Incident..." : "Simulate Node Activation"}</Button></Grid>
            {message && <Grid size={{ xs: 12 }}><Alert severity={message.tone}>{message.text}</Alert></Grid>}
          </Grid>
        </CardContent>
      </Card>
      <Grid container spacing={2}>{visible.map((node) => <Grid key={node.id} size={{ xs: 12, md: 6, xl: 4 }}><Card sx={{ height: "100%" }}><CardContent><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}><Typography sx={{ fontWeight: 900 }}>{node.id}</Typography><Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}><StatusChip status={node.status} /><OperationalChip kind="node" value={node.deviceHealth ?? node.status} /></Stack></Stack><Typography color="primary" sx={{ fontWeight: 800 }}>{node.name}</Typography><Stack spacing={0.5} sx={{ mt: 1 }}><Typography variant="body2"><strong>Registered location:</strong> {node.location}</Typography><Typography variant="body2"><strong>Barangay:</strong> {node.barangayName ?? "Not assigned"}</Typography><Typography variant="body2"><strong>Coordinates:</strong> {node.geoCoordinates ?? `${node.coordinates.x}, ${node.coordinates.y} (prototype map)`}</Typography><Typography variant="body2"><strong>Power / backup:</strong> {node.powerStatus ?? "Not reported"}</Typography><Typography variant="body2"><strong>Camera:</strong> {node.cameraAvailable ? "Activation capture available" : "Unavailable"}</Typography><Typography variant="body2"><strong>Operating hours:</strong> Configured per barangay routing settings</Typography><Typography variant="caption" color="text.secondary">Last communication: {node.lastCommunication ? `${formatPhilippineDateTime(node.lastCommunication)} PHT` : "Not reported"}</Typography><Typography variant="caption" color="text.secondary">Last activation: {node.lastActivationTime ? `${formatPhilippineDateTime(node.lastActivationTime)} PHT` : "No recorded activation"}</Typography>{node.recentActivations?.[0] && <Alert severity={node.recentActivations[0].smsNotification.status === "Failed" ? "error" : "info"} sx={{ mt: 1 }}><Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}><span>Recent alert {node.recentActivations[0].incidentId}</span><OperationalChip kind="sms" value={node.recentActivations[0].smsNotification.status} /></Stack></Alert>}</Stack></CardContent></Card></Grid>)}{!visible.length && <Grid size={{ xs: 12 }}><EmptyState title="No IoT nodes match" description="Adjust the node search." /></Grid>}</Grid>
    </AppShell>
  );
}
