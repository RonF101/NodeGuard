"use client";

import { useCallback, useEffect, useState } from "react";
import MapIcon from "@mui/icons-material/Map";
import PortableWifiOffOutlinedIcon from "@mui/icons-material/PortableWifiOffOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { DashboardIncidentPanel } from "@/components/DashboardIncidentPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { fetchDeviceNodes, fetchIncidents, fetchResponders } from "@/lib/nodeguardRepository";
import { mdrrmoPalette } from "@/theme/theme";
import { incidents as incidentSeed } from "@/data/incidents";
import { responders as responderSeed } from "@/data/responders";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { DeviceNode, Incident, Responder } from "@/types";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { getOperationalMetrics, incidentStatusConfig, isFinalIncident, sortIncidentQueue } from "@/config/incidentOperations";

const PendingVerificationIcon = incidentStatusConfig["Pending Verification"].icon;
const AwaitingDispatchIcon = incidentStatusConfig.Dispatched.icon;
const ActiveResponseIcon = incidentStatusConfig.Responding.icon;

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>(
    isSupabaseConfigured() ? [] : incidentSeed,
  );
  const [responders, setResponders] = useState<Responder[]>(
    isSupabaseConfigured() ? [] : responderSeed,
  );
  const [devices, setDevices] = useState<DeviceNode[]>(
    isSupabaseConfigured() ? [] : deviceSeed,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    try {
      const [nextIncidents, nextResponders, nextDevices] = await Promise.all([
        fetchIncidents(),
        fetchResponders(),
        fetchDeviceNodes(),
      ]);
      setIncidents(nextIncidents);
      setResponders(nextResponders);
      setDevices(nextDevices);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load operations data.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOperations(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadOperations);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadOperations);
    };
  }, [loadOperations]);

  const metrics = getOperationalMetrics(incidents);
  const offlineNodes = devices.filter((device) => device.status === "Offline").length;
  const incidentQueue = sortIncidentQueue(
    incidents.filter((incident) => !isFinalIncident(incident.status)),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations Overview"
        title="Dashboard"
        subtitle="Prioritize unverified alerts, dispatch delays, active field response, and NodeGuard availability."
        actions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button href="/map" startIcon={<MapIcon />} variant="outlined">
              View Map
            </Button>
          </Stack>
        }
      />
      {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Pending Verification"
            value={metrics.pendingVerification}
            helper="New alerts requiring MDRRMO verification"
            tone={incidentStatusConfig["Pending Verification"].color}
            icon={<PendingVerificationIcon />}
            href="/alerts?status=Pending%20Verification"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Awaiting Dispatch"
            value={metrics.awaitingDispatch}
            helper="Verified incidents without a dispatched team"
            tone={incidentStatusConfig.Dispatched.color}
            icon={<AwaitingDispatchIcon />}
            href="/alerts?status=Verified"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Active Responses"
            value={metrics.activeResponses}
            helper="Teams dispatched, responding, or on scene"
            tone={incidentStatusConfig.Responding.color}
            icon={<ActiveResponseIcon />}
            href="/alerts?scope=active"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Offline Nodes"
            value={offlineNodes}
            helper="Registered devices currently unreachable"
            tone={offlineNodes ? mdrrmoPalette.alertRed : mdrrmoPalette.successGreen}
            icon={<PortableWifiOffOutlinedIcon />}
            href="/nodes?status=Offline"
          />
        </Grid>
      </Grid>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" color="secondary">
                Live Incident Queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Incidents are ordered by alert level, then by newest reported time. Unassessed alerts stay first for prompt evaluation.
              </Typography>
            </Box>
          </Stack>
          <DashboardIncidentPanel
            incidents={incidentQueue}
            responders={responders}
            onIncidentUpdated={(updatedIncident) =>
              setIncidents((current) =>
                current.map((incident) =>
                  incident.id === updatedIncident.id ? updatedIncident : incident,
                ),
              )
            }
            onRespondersUpdated={setResponders}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
