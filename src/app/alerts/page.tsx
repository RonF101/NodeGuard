"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { AppShell } from "@/components/AppShell";
import { IncidentModal } from "@/components/IncidentModal";
import { IncidentTable } from "@/components/IncidentTable";
import { PageHeader } from "@/components/PageHeader";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { incidents } from "@/data/incidents";
import { fetchIncidents, fetchResponders } from "@/lib/nodeguardRepository";
import {
  EmergencyCategory,
  Incident,
  IncidentStatus,
  Responder,
} from "@/types";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

const categories: Array<EmergencyCategory | "All"> = [
  "All",
  "Medical Emergency",
  "Security/Public Safety",
  "Fire/Disaster Emergency",
];
const statuses: Array<IncidentStatus | "All"> = [
  "All",
  "New Alert",
  "Assigned",
  "En Route",
  "On Scene",
  "Responding",
  "Resolved",
  "Closed",
  "Need Backup",
  "False Alert",
];

export default function LiveAlertsPage() {
  const [category, setCategory] = useState<EmergencyCategory | "All">("All");
  const [status, setStatus] = useState<IncidentStatus | "All">("All");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [items, setItems] = useState<Incident[]>(
    isSupabaseConfigured() ? [] : incidents,
  );
  const [responders, setResponders] = useState<Responder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIncidents = useCallback(() => {
    return Promise.all([fetchIncidents(), fetchResponders()])
      .then(([nextIncidents, nextResponders]) => {
        setItems(nextIncidents);
        setResponders(nextResponders);
        setIsConnected(isSupabaseConfigured());
        setLoadError(null);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load live alerts.");
      });
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadIfMounted = () =>
      loadIncidents().then(() => {
        if (!mounted) return;
      });
    loadIfMounted();
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadIfMounted);
    return () => {
      mounted = false;
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadIfMounted);
    };
  }, [loadIncidents]);

  const filteredIncidents = useMemo(
    () =>
      items.filter((incident) => {
        const categoryMatch =
          category === "All" || incident.category === category;
        const statusMatch = status === "All" || incident.status === status;
        return categoryMatch && statusMatch;
      }),
    [category, items, status],
  );

  return (
    <AppShell>
      <PageHeader eyebrow="NodeGuard Device Intake" title="Live Alerts" />
      <Alert severity={isConnected ? "success" : "info"} sx={{ mb: 2 }}>
        {isConnected
          ? "Connected to Supabase incident data."
          : "Using local mock data until Supabase environment variables are configured."}
      </Alert>
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as EmergencyCategory | "All")
                }
              >
                {categories.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as IncidentStatus | "All")
                }
              >
                {statuses.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Stack spacing={2}>
        <IncidentTable
          incidents={filteredIncidents}
          onView={setSelected}
          showVoice
          showFilters={false}
        />
      </Stack>
      <IncidentModal
        key={selected?.id ?? "alerts-incident-modal"}
        incident={selected}
        open={Boolean(selected)}
        responders={responders}
        onClose={() => setSelected(null)}
        onAssigned={loadIncidents}
      />
    </AppShell>
  );
}
