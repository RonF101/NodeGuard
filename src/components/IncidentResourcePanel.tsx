"use client";

import { useMemo, useState } from "react";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { isFinalIncident } from "@/config/incidentOperations";
import { authorizedFetch } from "@/lib/auth";
import { ResourceStatusChip } from "@/components/responders/ResourceStatusChip";
import {
  ResourceStatusAction,
  ResourceStatusDialog,
} from "@/components/responders/ResourceStatusDialog";
import type { Incident, ResourceStatus, ResourceType, ResponseResource } from "@/types";

type IncidentResourcePanelProps = {
  incident: Incident;
  resources: ResponseResource[];
  online: boolean;
  onIncidentUpdated?: (incident: Incident) => void;
  onResourcesUpdated?: (resources: ResponseResource[]) => void;
};

const recommendedTypes: Record<Incident["category"], ResourceType[]> = {
  "Medical Emergency": ["Ambulance", "First Aid Kit", "Communication Radio"],
  "Fire/Disaster Emergency": [
    "Fire Truck",
    "Rescue Vehicle",
    "Water Rescue Equipment",
    "Rescue Equipment",
  ],
  "Security/Public Safety": ["Patrol Vehicle", "Communication Radio", "Rescue Vehicle"],
};

export function IncidentResourcePanel({
  incident,
  resources,
  online,
  onIncidentUpdated,
  onResourcesUpdated,
}: IncidentResourcePanelProps) {
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [statusAction, setStatusAction] = useState<ResourceStatusAction | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const assignedResources = useMemo(() => {
    const byId = new Map<string, ResponseResource>();
    for (const resource of incident.assignedResources ?? []) byId.set(resource.id, resource);
    for (const resource of resources) {
      if (resource.status === "Dispatched" && resource.assignedIncident === incident.id) {
        byId.set(resource.id, resource);
      }
    }
    return Array.from(byId.values());
  }, [incident.assignedResources, incident.id, resources]);

  const availableResources = useMemo(() => {
    const recommendations = new Set(recommendedTypes[incident.category]);
    return resources
      .filter((resource) => resource.status === "Available")
      .toSorted((first, second) => {
        const firstRecommended = recommendations.has(first.type) ? 0 : 1;
        const secondRecommended = recommendations.has(second.type) ? 0 : 1;
        return firstRecommended - secondRecommended || first.id.localeCompare(second.id);
      });
  }, [incident.category, resources]);

  const selectedResource =
    availableResources.find((resource) => resource.id === selectedResourceId) ?? null;
  const backupNeedsEquipment = Boolean(
    incident.backupRequest?.assistanceTypes.includes("Equipment or Vehicle Support") &&
      ["Requested", "Assistance Offered", "Partially Filled", "Confirmed"].includes(
        incident.backupRequest.status,
      ),
  );
  const operationsLocked = isFinalIncident(incident.status);

  const assignResource = async () => {
    if (!selectedResource) return;
    setBusy(true);
    setMessage(null);
    setError(false);
    try {
      const response = await authorizedFetch("/api/assign-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: selectedResource.id, incidentId: incident.id }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setError(true);
        setMessage(result.reason ?? "Resource assignment failed.");
        return;
      }

      const updatedResource: ResponseResource = {
        ...selectedResource,
        status: "Reserved",
        assignedIncident: incident.id,
        availabilityNote: `Assigned to ${incident.id}.`,
        lastUpdated: new Date().toISOString(),
      };
      const nextResources = resources.map((resource) =>
        resource.id === updatedResource.id ? updatedResource : resource,
      );
      const nextAssigned = [
        ...assignedResources.filter((resource) => resource.id !== updatedResource.id),
        updatedResource,
      ];
      onResourcesUpdated?.(nextResources);
      onIncidentUpdated?.({ ...incident, assignedResources: nextAssigned });
      setSelectedResourceId("");
      setMessage(`${updatedResource.unitName} is now assigned to ${incident.id}.`);
    } catch {
      setError(true);
      setMessage("The resource dispatch service could not be reached.");
    } finally {
      setBusy(false);
    }
  };

  const releaseResource = async (
    status: Exclude<ResourceStatus, "Dispatched">,
    reason: string,
  ) => {
    if (!statusAction) return;
    const resource = statusAction.resource;
    setBusy(true);
    setStatusError(null);
    try {
      const response = await authorizedFetch("/api/release-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id, nextStatus: status, reason }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setStatusError(result.reason ?? "Resource release failed.");
        return;
      }

      const updatedResource: ResponseResource = {
        ...resource,
        status,
        assignedIncident: "None",
        availabilityNote: reason,
        lastUpdated: new Date().toISOString(),
      };
      onResourcesUpdated?.(
        resources.map((item) => (item.id === resource.id ? updatedResource : item)),
      );
      onIncidentUpdated?.({
        ...incident,
        assignedResources: assignedResources.filter((item) => item.id !== resource.id),
      });
      setStatusAction(null);
      setMessage(`${resource.unitName} was released and is now ${status.toLowerCase()}.`);
      setError(false);
    } catch {
      setStatusError("The resource release service could not be reached.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack
      spacing={1.5}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Vehicles &amp; Equipment
          </Typography>
          <Typography variant="h6" color="secondary">
            {assignedResources.length
              ? `${assignedResources.length} resource${assignedResources.length === 1 ? "" : "s"} assigned`
              : "No resources assigned"}
          </Typography>
        </Box>
        <Chip
          icon={<DirectionsCarOutlinedIcon />}
          label={`${availableResources.length} available`}
          color={availableResources.length ? "success" : "default"}
          variant="outlined"
        />
      </Stack>

      {backupNeedsEquipment && (
        <Alert severity={assignedResources.length ? "success" : "warning"} icon={<BuildOutlinedIcon />}>
          {assignedResources.length
            ? "Equipment or vehicle support was requested and a resource is now assigned."
            : "This team requested equipment or vehicle support. Assign an available resource below."}
        </Alert>
      )}

      {assignedResources.map((resource) => (
        <Stack
          key={resource.id}
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            p: 1.25,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            justifyContent: "space-between",
            alignItems: { sm: "center" },
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <AssignmentTurnedInOutlinedIcon color="primary" />
            <Box>
              <Typography sx={{ fontWeight: 900 }}>
                {resource.id} - {resource.unitName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {resource.type} - {resource.agency} - base: {resource.baseLocation}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <ResourceStatusChip status={resource.status} />
            {!operationsLocked && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={!online || busy}
                onClick={() => {
                  setStatusError(null);
                  setStatusAction({ mode: "release", resource });
                }}
              >
                Release
              </Button>
            )}
          </Stack>
        </Stack>
      ))}

      {!operationsLocked && (
        <>
          <Divider />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Autocomplete
              fullWidth
              options={availableResources}
              value={selectedResource}
              getOptionLabel={(resource) =>
                `${resource.id} - ${resource.unitName} (${resource.type}, ${resource.agency})`
              }
              onChange={(_, resource) => setSelectedResourceId(resource?.id ?? "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign available vehicle or equipment"
                  helperText="Incident-recommended resource types are listed first"
                />
              )}
              noOptionsText="No dispatch-ready resources"
            />
            <Button
              sx={{ minWidth: 180 }}
              disabled={!online || busy || !selectedResource}
              onClick={assignResource}
            >
              {busy ? "Saving..." : "Assign Resource"}
            </Button>
          </Stack>
        </>
      )}
      {message && <Alert severity={error ? "error" : "success"}>{message}</Alert>}
      {!online && !operationsLocked && (
        <Alert severity="info">Resource dispatch requires a live connection.</Alert>
      )}

      <ResourceStatusDialog
        key={statusAction ? `${statusAction.mode}:${statusAction.resource.id}` : "resource-release-closed"}
        action={statusAction}
        busy={busy}
        error={statusError}
        onClose={() => setStatusAction(null)}
        onConfirm={releaseResource}
      />
    </Stack>
  );
}
