"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { StatusChip } from "@/components/StatusChip";
import { formatPhilippineDateTime, formatRelativeTime } from "@/config/incidentOperations";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { incidents as incidentSeed } from "@/data/incidents";
import { fetchDeviceNodes, fetchIncidents } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { mdrrmoPalette } from "@/theme/theme";
import type { DeviceNode, Incident } from "@/types";

type NodeStatusFilter = DeviceNode["status"] | "All";

export function NodesView() {
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const initialStatus: NodeStatusFilter = ["Online", "Maintenance", "Offline"].includes(requestedStatus ?? "")
    ? (requestedStatus as DeviceNode["status"])
    : "All";
  const [nodes, setNodes] = useState<DeviceNode[]>(isSupabaseConfigured() ? [] : deviceSeed);
  const [incidents, setIncidents] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NodeStatusFilter>(initialStatus);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relativeNow, setRelativeNow] = useState<number | null>(null);

  const loadNodes = useCallback(async () => {
    try {
      const [nextNodes, nextIncidents] = await Promise.all([
        fetchDeviceNodes(),
        fetchIncidents(),
      ]);
      setNodes(nextNodes);
      setIncidents(nextIncidents);
      setLoadError(null);
      setRelativeNow(Date.now());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load registered nodes.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNodes(), 0);
    const interval = window.setInterval(() => setRelativeNow(Date.now()), 60_000);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadNodes);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadNodes);
    };
  }, [loadNodes]);

  const alertCounts = useMemo(() => {
    const counts = new Map<string, number>();
    incidents.forEach((incident) => {
      if (incident.deviceId) counts.set(incident.deviceId, (counts.get(incident.deviceId) ?? 0) + 1);
    });
    return counts;
  }, [incidents]);

  const visibleNodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return nodes.filter((node) => {
      const searchable = [node.id, node.name, node.location, node.approximateAddress].join(" ").toLowerCase();
      return (!term || searchable.includes(term)) && (status === "All" || node.status === status);
    });
  }, [nodes, search, status]);

  const onlineCount = nodes.filter((node) => node.status === "Online").length;
  const maintenanceCount = nodes.filter((node) => node.status === "Maintenance").length;
  const offlineCount = nodes.filter((node) => node.status === "Offline").length;

  const lastCommunication = (node: DeviceNode) => {
    if (!node.lastCommunication) return <Typography variant="body2" color="text.secondary">Not reported</Typography>;
    const full = `${formatPhilippineDateTime(node.lastCommunication)} PHT`;
    return (
      <Tooltip title={full}>
        <Box component="span">
          <Typography variant="body2" sx={{ fontWeight: 800 }}>{relativeNow ? formatRelativeTime(node.lastCommunication, relativeNow) : full}</Typography>
          <Typography variant="caption" color="text.secondary">{full}</Typography>
        </Box>
      </Tooltip>
    );
  };

  return (
    <AppShell>
      <PageHeader eyebrow="GIS and Devices" title="Nodes" subtitle="Monitor registered NodeGuard connectivity, power reporting, communications, and maintenance state." />
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ["Online", onlineCount, mdrrmoPalette.successGreen],
          ["Maintenance", maintenanceCount, mdrrmoPalette.warningAmber],
          ["Offline", offlineCount, mdrrmoPalette.alertRed],
        ].map(([label, value, color]) => (
          <Grid key={String(label)} size={{ xs: 12, sm: 4 }}>
            <Card><CardContent><Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography><Typography variant="h4" sx={{ color, mt: 0.5 }}>{value}</Typography></CardContent></Card>
          </Grid>
        ))}
      </Grid>
      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <TextField fullWidth label="Search nodes" placeholder="Node ID, name, or registered location" value={search} onChange={(event) => setSearch(event.target.value)} />
            <TextField select label="Connectivity" value={status} onChange={(event) => setStatus(event.target.value as NodeStatusFilter)} sx={{ minWidth: { sm: 180 } }}>
              <MenuItem value="All">All states</MenuItem>
              <MenuItem value="Online">Online</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
              <MenuItem value="Offline">Offline</MenuItem>
            </TextField>
            <Button variant="outlined" startIcon={<FilterAltOffOutlinedIcon />} onClick={() => { setSearch(""); setStatus("All"); }}>Clear</Button>
          </Stack>
        </Box>
        <Stack spacing={1.5} sx={{ display: { xs: "flex", lg: "none" }, p: 1.5 }}>
          {visibleNodes.map((node) => (
            <Box component="article" key={node.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}><Box><Typography color="secondary" sx={{ fontWeight: 900 }}>{node.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{node.id}</Typography></Box><StatusChip status={node.status} /></Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.25, mt: 1.5 }}>
                {[["Registered Location", node.location], ["Power Status", node.powerStatus ?? "Not reported"], ["Alert Count", String(alertCounts.get(node.id) ?? 0)], ["Maintenance", node.maintenanceStatus ?? "Not reported"]].map(([label, value]) => <Box key={label}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography></Box>)}
                <Box sx={{ gridColumn: { sm: "1 / -1" } }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Last Communication</Typography>{lastCommunication(node)}</Box>
              </Box>
            </Box>
          ))}
        </Stack>
        <Table sx={{ display: { xs: "none", lg: "table" }, minWidth: 1150 }} aria-label="Registered NodeGuard devices">
          <TableHead><TableRow><TableCell>Device</TableCell><TableCell>Registered Location</TableCell><TableCell>Connectivity</TableCell><TableCell>Power Status</TableCell><TableCell>Last Communication</TableCell><TableCell align="center">Alerts</TableCell><TableCell>Maintenance Status</TableCell></TableRow></TableHead>
          <TableBody>
            {visibleNodes.map((node) => <TableRow key={node.id} hover><TableCell><Typography variant="body2" color="secondary" sx={{ fontWeight: 900 }}>{node.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{node.id}</Typography></TableCell><TableCell>{node.location}</TableCell><TableCell><StatusChip status={node.status} /></TableCell><TableCell>{node.powerStatus ?? "Not reported"}</TableCell><TableCell>{lastCommunication(node)}</TableCell><TableCell align="center" sx={{ fontWeight: 900 }}>{alertCounts.get(node.id) ?? 0}</TableCell><TableCell>{node.maintenanceStatus ?? "Not reported"}</TableCell></TableRow>)}
            {!visibleNodes.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>No nodes match the selected filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </AppShell>
  );
}
