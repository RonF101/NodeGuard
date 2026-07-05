"use client";

import { useMemo, useState } from "react";
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
import { incidents } from "@/data/incidents";
import { EmergencyCategory, Incident, IncidentStatus } from "@/types";

const categories: Array<EmergencyCategory | "All"> = [
  "All",
  "Medical Emergency",
  "Security/Public Safety",
  "Fire/Disaster Emergency"
];
const statuses: Array<IncidentStatus | "All"> = ["All", "Pending", "Verified", "Dispatched", "Responding", "Resolved", "Closed"];

export default function LiveAlertsPage() {
  const [category, setCategory] = useState<EmergencyCategory | "All">("All");
  const [status, setStatus] = useState<IncidentStatus | "All">("All");
  const [selected, setSelected] = useState<Incident | null>(null);

  const filteredIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        const categoryMatch = category === "All" || incident.category === category;
        const statusMatch = status === "All" || incident.status === status;
        return categoryMatch && statusMatch;
      }),
    [category, status]
  );

  return (
    <AppShell>
      <PageHeader eyebrow="NodeGuard Device Intake" title="Live Alerts" />
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Category"
                value={category}
                onChange={(event) => setCategory(event.target.value as EmergencyCategory | "All")}
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
                onChange={(event) => setStatus(event.target.value as IncidentStatus | "All")}
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
        <IncidentTable incidents={filteredIncidents} onView={setSelected} showVoice />
      </Stack>
      <IncidentModal incident={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
