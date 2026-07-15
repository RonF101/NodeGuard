"use client";

import { useCallback, useEffect, useState } from "react";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MapIcon from "@mui/icons-material/Map";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
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
import { fetchIncidents, fetchResponders } from "@/lib/nodeguardRepository";
import { mdrrmoPalette } from "@/theme/theme";
import { incidents as incidentSeed } from "@/data/incidents";
import { responders as responderSeed } from "@/data/responders";
import { Incident, Responder } from "@/types";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>(
    isSupabaseConfigured() ? [] : incidentSeed,
  );
  const [responders, setResponders] = useState<Responder[]>(
    isSupabaseConfigured() ? [] : responderSeed,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOperations = useCallback(async () => {
    try {
      const [nextIncidents, nextResponders] = await Promise.all([
        fetchIncidents(),
        fetchResponders(),
      ]);
      setIncidents(nextIncidents);
      setResponders(nextResponders);
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

  const activeIncidents = incidents.filter((incident) => !["Resolved", "Closed", "False Alert"].includes(incident.status)).length;
  const newAlerts = incidents.filter((incident) => incident.status === "New Alert").length;
  const respondersActive = responders.filter((responder) => ["En Route", "On Scene", "Responding", "Busy"].includes(responder.availability)).length;
  const resolvedToday = incidents.filter((incident) => incident.status === "Resolved").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations Overview"
        title="Dashboard"
        actions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button href="/map" startIcon={<MapIcon />} variant="outlined">
              View Map
            </Button>
          </Stack>
        }
      />
      <Alert severity="info" sx={{ mb: 3, borderColor: mdrrmoPalette.cream }}>
        Private NodeGuard workspace for authorized La Trinidad MDRRMO personnel.
      </Alert>
      {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Active Incidents"
            value={activeIncidents}
            helper="Open incidents requiring monitoring"
            tone={mdrrmoPalette.setBlue}
            icon={<CrisisAlertIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="New Alerts"
            value={newAlerts}
            helper="Newly activated nodes needing triage"
            tone={mdrrmoPalette.setBlueDark}
            icon={<FactCheckIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Active Responders"
            value={respondersActive}
            helper="Busy, en route, on scene, or responding"
            tone={mdrrmoPalette.orange}
            icon={<AssignmentTurnedInIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Resolved Today"
            value={resolvedToday}
            helper="Closed from current operations"
            tone={mdrrmoPalette.successGreen}
            icon={<TaskAltIcon />}
          />
        </Grid>
      </Grid>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" color="secondary">
                Latest Alerts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recent device-triggered events from La Trinidad NodeGuard units.
              </Typography>
            </Box>
          </Stack>
          <DashboardIncidentPanel incidents={incidents.slice(0, 5)} responders={responders} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
