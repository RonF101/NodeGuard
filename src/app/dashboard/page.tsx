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
import { IncidentTable } from "@/components/IncidentTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { incidents } from "@/data/incidents";
import { responders } from "@/data/responders";
import { mdrrmoPalette } from "@/theme/theme";

export default function DashboardPage() {
  const activeIncidents = incidents.filter((incident) => !["Resolved", "Closed"].includes(incident.status)).length;
  const pending = incidents.filter((incident) => incident.status === "Pending").length;
  const dispatched = responders.filter((responder) => ["Dispatched", "Responding"].includes(responder.availability)).length;
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
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Active Incidents"
            value={activeIncidents}
            helper="Open incidents requiring monitoring"
            tone={mdrrmoPalette.alertRed}
            icon={<CrisisAlertIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Pending Verification"
            value={pending}
            helper="Awaiting personnel review"
            tone={mdrrmoPalette.warningAmber}
            icon={<FactCheckIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Responders Dispatched"
            value={dispatched}
            helper="Teams en route or responding"
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
          <IncidentTable incidents={incidents.slice(0, 5)} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
