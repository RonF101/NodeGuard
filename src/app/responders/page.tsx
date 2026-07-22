"use client";

import { useEffect, useMemo, useState } from "react";
import AirlineSeatFlatIcon from "@mui/icons-material/AirlineSeatFlat";
import FireTruckIcon from "@mui/icons-material/FireTruck";
import GroupsIcon from "@mui/icons-material/Groups";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
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
  ResourceStatusAction,
  ResourceStatusDialog,
} from "@/components/responders/ResourceStatusDialog";
import {
  ResponderFilters,
  RespondersResourcesFilters
} from "@/components/responders/RespondersResourcesFilters";
import { incidents } from "@/data/incidents";
import {
  fetchIncidents,
  fetchResponders,
  fetchResources,
} from "@/lib/nodeguardRepository";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import { mdrrmoPalette } from "@/theme/theme";
import { Responder, ResourceStatus, ResponseResource } from "@/types";
import { authorizedFetch } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

const initialFilters: ResponderFilters = {
  agency: "All",
  responderStatus: "All",
  resourceType: "All",
  resourceStatus: "All"
};

export default function RespondersPage() {
  const [responders, setResponders] = useState<Responder[]>(isSupabaseConfigured() ? [] : responderSeed);
  const [resources, setResources] = useState<ResponseResource[]>(isSupabaseConfigured() ? [] : resourceSeed);
  const [filters, setFilters] = useState<ResponderFilters>(initialFilters);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("Assignment updated successfully.");
  const [incidentItems, setIncidentItems] = useState(isSupabaseConfigured() ? [] : incidents);
  const [isAssigning, setIsAssigning] = useState(false);
  const [resourceStatusAction, setResourceStatusAction] = useState<ResourceStatusAction | null>(null);
  const [resourceStatusError, setResourceStatusError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadOperationsData = () => Promise.all([fetchResponders(), fetchIncidents(), fetchResources()])
      .then(([nextResponders, nextIncidents, nextResources]) => {
        if (!mounted) return;
        setResponders(nextResponders);
        setIncidentItems(nextIncidents);
        setResources(nextResources);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load responders and resources.");
      });
    void loadOperationsData();
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadOperationsData);
    return () => {
      mounted = false;
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadOperationsData);
    };
  }, []);

  const activeIncidents = useMemo(
    () =>
      incidentItems.filter((incident) =>
        ["Verified", "Dispatched", "Responding", "On Scene"].includes(incident.status),
      ),
    [incidentItems]
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
    responder.availability === "Unavailable"
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
    setSelectedIncident(activeIncidents[0]?.id ?? "");
  };

  const handleConfirmAssignment = async () => {
    if (!assignmentTarget) return;

    if (assignmentTarget.kind === "responder") {
      if (!selectedIncident) return;
      const incidentBeforeAssignment = incidentItems.find(
        (incident) => incident.id === selectedIncident,
      );
      setIsAssigning(true);
      const response = await authorizedFetch("/api/assign-responder", {
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
                availability: "Unavailable",
                currentAssignment: selectedIncident,
                lastStatusUpdate: "Just now"
              }
            : incidentBeforeAssignment?.assignedResponder !== "Unassigned" &&
                responder.name === incidentBeforeAssignment?.assignedResponder &&
                responder.currentAssignment === selectedIncident
              ? {
                  ...responder,
                  availability: "Available",
                  currentAssignment: "None",
                  lastStatusUpdate: "Just now",
                }
            : responder
        )
      );
      setIncidentItems((current) =>
        current.map((incident) =>
          incident.id === selectedIncident
            ? {
                ...incident,
                status: "Dispatched",
                assignedResponder: assignmentTarget.name
              }
            : incident
        )
      );
    } else {
      if (!selectedIncident) return;
      const selectedResource = resources.find(
        (resource) => resource.id === assignmentTarget.id,
      );
      if (!selectedResource) return;
      setIsAssigning(true);
      const response = await authorizedFetch("/api/assign-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: assignmentTarget.id,
          incidentId: selectedIncident,
        }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      setIsAssigning(false);
      if (!result.ok) {
        setSnackbarMessage(result.reason ?? "Resource assignment failed.");
        setSnackbarOpen(true);
        return;
      }
      setResources((current) =>
        current.map((resource) =>
          resource.id === assignmentTarget.id
            ? {
                ...resource,
                status: "Dispatched",
                assignedIncident: selectedIncident,
                lastUpdated: "Just now"
              }
            : resource
        )
      );
      setIncidentItems((current) =>
        current.map((incident) =>
          incident.id === selectedIncident
            ? {
                ...incident,
                assignedResources: [
                  ...(incident.assignedResources ?? []).filter(
                    (resource) => resource.id !== assignmentTarget.id,
                  ),
                  {
                    ...selectedResource,
                    status: "Dispatched" as const,
                    assignedIncident: selectedIncident,
                    availabilityNote: `Assigned to ${selectedIncident}.`,
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              }
            : incident,
        ),
      );
    }

    setAssignmentTarget(null);
    setSnackbarMessage("Assignment updated successfully.");
    setSnackbarOpen(true);
  };

  const handleResourceStatus = async (
    status: Exclude<ResourceStatus, "Dispatched">,
    reason: string,
  ) => {
    if (!resourceStatusAction) return;
    setIsAssigning(true);
    setResourceStatusError(null);
    const isRelease = resourceStatusAction.mode === "release";
    try {
      const response = await authorizedFetch(
        isRelease ? "/api/release-resource" : "/api/update-resource-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRelease
              ? {
                  resourceId: resourceStatusAction.resource.id,
                  nextStatus: status,
                  reason,
                }
              : {
                  resourceId: resourceStatusAction.resource.id,
                  status,
                  reason,
                },
          ),
        },
      );
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setResourceStatusError(result.reason ?? "Resource availability update failed.");
        return;
      }

      const resourceId = resourceStatusAction.resource.id;
      setResources((current) =>
        current.map((resource) =>
          resource.id === resourceId
            ? {
                ...resource,
                status,
                assignedIncident: isRelease ? "None" : resource.assignedIncident,
                availabilityNote: reason,
                lastUpdated: new Date().toISOString(),
              }
            : resource,
        ),
      );
      if (isRelease) {
        setIncidentItems((current) =>
          current.map((incident) => ({
            ...incident,
            assignedResources: incident.assignedResources?.filter(
              (resource) => resource.id !== resourceId,
            ),
          })),
        );
      }
      setResourceStatusAction(null);
      setSnackbarMessage(
        isRelease
          ? `Resource released and marked ${status.toLowerCase()}.`
          : `Resource availability changed to ${status.toLowerCase()}.`,
      );
      setSnackbarOpen(true);
    } catch {
      setResourceStatusError("The resource availability service could not be reached.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agency Coordination"
        title="Responders"
        subtitle="Monitor personnel availability and response resources for emergency dispatch support."
      />
      {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
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
              helper="Assigned to active incidents"
              icon={<ReportProblemIcon />}
              tone={mdrrmoPalette.setBlue}
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
              tone={mdrrmoPalette.muted}
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
              onRelease={(resource) => {
                setResourceStatusError(null);
                setResourceStatusAction({ mode: "release", resource });
              }}
              onUpdateStatus={(resource) => {
                setResourceStatusError(null);
                setResourceStatusAction({ mode: "availability", resource });
              }}
            />
          </CardContent>
        </Card>
      </Stack>

      <ResourceAssignmentDialog
        key={assignmentTarget?.id ?? "closed"}
        target={assignmentTarget}
        activeIncidents={activeIncidents}
        selectedIncident={selectedIncident}
        onSelectedIncident={setSelectedIncident}
        onClose={() => setAssignmentTarget(null)}
        onConfirm={handleConfirmAssignment}
        isConfirming={isAssigning}
      />
      <ResourceStatusDialog
        key={resourceStatusAction ? `${resourceStatusAction.mode}:${resourceStatusAction.resource.id}` : "resource-status-closed"}
        action={resourceStatusAction}
        busy={isAssigning}
        error={resourceStatusError}
        onClose={() => setResourceStatusAction(null)}
        onConfirm={handleResourceStatus}
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
