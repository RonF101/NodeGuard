"use client";

import { useEffect, useMemo, useState } from "react";
import AirlineSeatFlatIcon from "@mui/icons-material/AirlineSeatFlat";
import FireTruckIcon from "@mui/icons-material/FireTruck";
import GroupsIcon from "@mui/icons-material/Groups";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { ResponderSummaryCard } from "@/components/responders/ResponderSummaryCard";
import { ResponderTable } from "@/components/responders/ResponderTable";
import { ResourceAssignmentDialog, AssignmentTarget } from "@/components/responders/ResourceAssignmentDialog";
import { ResourceTable } from "@/components/responders/ResourceTable";
import {
  ResponderFilters,
  RespondersResourcesFilters
} from "@/components/responders/RespondersResourcesFilters";
import { incidents } from "@/data/incidents";
import { fetchIncidents, fetchResponders } from "@/lib/nodeguardRepository";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import { mdrrmoPalette } from "@/theme/theme";
import { Responder, ResponseResource } from "@/types";

const initialFilters: ResponderFilters = {
  agency: "All",
  responderStatus: "All",
  resourceType: "All",
  resourceStatus: "All"
};

export default function RespondersPage() {
  const [responders, setResponders] = useState<Responder[]>(responderSeed);
  const [resources, setResources] = useState<ResponseResource[]>(resourceSeed);
  const [filters, setFilters] = useState<ResponderFilters>(initialFilters);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("Assignment updated successfully.");
  const [incidentItems, setIncidentItems] = useState(incidents);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadOperationsData = () => Promise.all([fetchResponders(), fetchIncidents()]).then(([nextResponders, nextIncidents]) => {
      if (!mounted) return;
      setResponders(nextResponders);
      setIncidentItems(nextIncidents);
    });
    loadOperationsData();
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadOperationsData);
    return () => {
      mounted = false;
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadOperationsData);
    };
  }, []);

  const activeIncidents = useMemo(
    () => incidentItems.filter((incident) => !["Resolved", "Closed", "False Alert"].includes(incident.status)),
    [incidentItems]
  );

  const assignableTeams = useMemo(
    () =>
      responders.filter((responder) =>
        ["Available", "En Route", "On Scene", "Responding", "Busy"].includes(responder.availability)
      ),
    [responders]
  );

  const agencies = useMemo(
    () =>
      Array.from(new Set([...responders.map((responder) => responder.agency), ...resources.map((resource) => resource.agency)])).sort(),
    [responders, resources]
  );

  const filteredResponders = useMemo(
    () =>
      responders
        .filter((responder) => filters.agency === "All" || responder.agency === filters.agency)
        .filter((responder) => filters.responderStatus === "All" || responder.availability === filters.responderStatus),
    [filters.agency, filters.responderStatus, responders]
  );

  const filteredResources = useMemo(
    () =>
      resources
        .filter((resource) => filters.agency === "All" || resource.agency === filters.agency)
        .filter((resource) => filters.resourceType === "All" || resource.type === filters.resourceType)
        .filter((resource) => filters.resourceStatus === "All" || resource.status === filters.resourceStatus),
    [filters.agency, filters.resourceStatus, filters.resourceType, resources]
  );

  const availableResponders = responders.filter((responder) => responder.availability === "Available").length;
  const activeResponders = responders.filter((responder) =>
    ["En Route", "On Scene", "Responding", "Busy"].includes(responder.availability)
  ).length;
  const availableAmbulances = resources.filter(
    (resource) => resource.type === "Ambulance" && resource.status === "Available"
  ).length;
  const availableFireTrucks = resources.filter(
    (resource) => resource.type === "Fire Truck" && resource.status === "Available"
  ).length;
  const unavailableResources = resources.filter((resource) =>
    ["Under Maintenance", "Unavailable"].includes(resource.status)
  ).length;

  const openAssignment = (target: AssignmentTarget) => {
    setAssignmentTarget(target);
    setSelectedIncident(target.kind === "responder" ? (activeIncidents[0]?.id ?? "") : "");
    setSelectedTeam(target.kind === "resource" ? (assignableTeams[0]?.id ?? "") : "");
  };

  const handleConfirmAssignment = async () => {
    if (!assignmentTarget) return;

    if (assignmentTarget.kind === "responder") {
      if (!selectedIncident) return;
      setIsAssigning(true);
      const response = await fetch("/api/assign-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responderId: assignmentTarget.id, incidentId: selectedIncident })
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      setIsAssigning(false);
      if (!result.ok) {
        setSnackbarMessage(result.reason ?? "Assignment failed.");
        setSnackbarOpen(true);
        return;
      }
      setResponders((current) =>
        current.map((responder) =>
          responder.id === assignmentTarget.id
            ? {
                ...responder,
                availability: "Busy",
                currentAssignment: selectedIncident,
                lastStatusUpdate: "Just now"
              }
            : responder
        )
      );
      setIncidentItems((current) =>
        current.map((incident) =>
          incident.id === selectedIncident
            ? {
                ...incident,
                status: "Assigned",
                assignedResponder: assignmentTarget.name
              }
            : incident
        )
      );
    } else {
      if (!selectedTeam) return;
      const team = responders.find((responder) => responder.id === selectedTeam);
      setResources((current) =>
        current.map((resource) =>
          resource.id === assignmentTarget.id
            ? {
                ...resource,
                status: "Dispatched",
                assignedIncident: team?.name ?? selectedTeam,
                lastUpdated: "Just now"
              }
            : resource
        )
      );
    }

    setAssignmentTarget(null);
    setSnackbarMessage("Assignment updated successfully.");
    setSnackbarOpen(true);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agency Coordination"
        title="Responders & Resources"
        subtitle="Monitor personnel availability and response resources for emergency dispatch support."
      />
      <Stack spacing={3}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <ResponderSummaryCard
              label="Available Responders"
              value={availableResponders}
              helper="Ready for dispatch"
              icon={<GroupsIcon />}
              tone={mdrrmoPalette.successGreen}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <ResponderSummaryCard
              label="Active Responders"
              value={activeResponders}
              helper="Busy, en route, on scene, or responding"
              icon={<ReportProblemIcon />}
              tone={mdrrmoPalette.warningAmber}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <ResponderSummaryCard
              label="Available Ambulances"
              value={availableAmbulances}
              helper="Available medical transport"
              icon={<LocalHospitalIcon />}
              tone={mdrrmoPalette.successGreen}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <ResponderSummaryCard
              label="Available Fire Trucks"
              value={availableFireTrucks}
              helper="Ready fire response units"
              icon={<FireTruckIcon />}
              tone={mdrrmoPalette.successGreen}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <ResponderSummaryCard
              label="Unavailable Resources"
              value={unavailableResources}
              helper="Maintenance or unavailable"
              icon={<AirlineSeatFlatIcon />}
              tone={mdrrmoPalette.alertRed}
            />
          </Grid>
        </Grid>

        <RespondersResourcesFilters filters={filters} agencies={agencies} onChange={setFilters} />

        <Card>
          <CardContent>
            <Typography variant="h5" color="secondary" sx={{ mb: 2 }}>
              Personnel Availability
            </Typography>
            <ResponderTable
              responders={filteredResponders}
              onAssign={(responder) =>
                openAssignment({
                  kind: "responder",
                  id: responder.id,
                  name: responder.name
                })
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h5" color="secondary" sx={{ mb: 2 }}>
              Response Resource Availability
            </Typography>
            <ResourceTable
              resources={filteredResources}
              onAssign={(resource) =>
                openAssignment({
                  kind: "resource",
                  id: resource.id,
                  name: `${resource.id} - ${resource.unitName}`
                })
              }
            />
          </CardContent>
        </Card>
      </Stack>

      <ResourceAssignmentDialog
        target={assignmentTarget}
        activeIncidents={activeIncidents}
        availableTeams={assignableTeams}
        selectedIncident={selectedIncident}
        selectedTeam={selectedTeam}
        onSelectedIncident={setSelectedIncident}
        onSelectedTeam={setSelectedTeam}
        onClose={() => setAssignmentTarget(null)}
        onConfirm={handleConfirmAssignment}
        isConfirming={isAssigning}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3200}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </AppShell>
  );
}
