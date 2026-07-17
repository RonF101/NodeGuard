"use client";

import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import MapIcon from "@mui/icons-material/Map";
import { useEffect, useMemo, useRef, useState } from "react";
import { Incident, Responder, ValidationStatus } from "@/types";
import { StatusChip } from "@/components/StatusChip";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { IncidentAlertLevelPanel } from "@/components/IncidentAlertLevelPanel";
import { BackupCoordinationPanel } from "@/components/BackupCoordinationPanel";
import { authorizedFetch } from "@/lib/auth";
import { SafeConfirmDialog } from "@/components/SafeConfirmDialog";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import {
  formatPhilippineDateTime,
  getElapsedWaitingTime,
  getValidIncidentActions,
} from "@/config/incidentOperations";

type SafeAction =
  | "assign"
  | "activate-buzzer"
  | "deactivate-buzzer"
  | "false-alarm"
  | "remove-assignment"
  | "start-response"
  | "mark-on-scene"
  | "close"
  | null;

type IncidentModalProps = {
  incident: Incident | null;
  open: boolean;
  responders?: Responder[];
  onClose: () => void;
  onIncidentUpdated?: (incident: Incident) => void;
  onRespondersUpdated?: (responders: Responder[]) => void;
};

export function IncidentModal({
  incident,
  open,
  responders = [],
  onClose,
  onIncidentUpdated,
  onRespondersUpdated,
}: IncidentModalProps) {
  const [selectedResponder, setSelectedResponder] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isTogglingBuzzer, setIsTogglingBuzzer] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(
    null,
  );
  const [assignmentError, setAssignmentError] = useState(false);
  const [buzzerMessage, setBuzzerMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [safeAction, setSafeAction] = useState<SafeAction>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const validationInFlight = useRef(false);
  const { online, lowBandwidth } = useConnectivity();
  const validActions = incident ? getValidIncidentActions(incident) : [];
  const canAssign = validActions.includes("dispatch") || validActions.includes("reassign");
  const canCorrectValidation = Boolean(
    incident &&
      ["Pending Verification", "Verified", "False Alert"].includes(incident.status),
  );
  const isVerified = incident?.validationStatus === "Confirmed";
  const isFalseAlert = incident?.validationStatus === "False Alarm";

  const assignableResponders = useMemo(
    () => responders.filter((responder) => responder.availability === "Available"),
    [responders],
  );

  const selectedResponderOption = assignableResponders.find((item) => item.id === selectedResponder) ?? null;
  const assignedResponderProfile =
    incident?.assignedResponder && incident.assignedResponder !== "Unassigned"
      ? responders.find((responder) => responder.name === incident.assignedResponder) ?? null
      : null;
  const draftKey = incident ? `nodeguard.dispatch-draft:${incident.id}` : "";

  useEffect(() => {
    if (!open || !draftKey) return;
    const restoreDraft = window.setTimeout(() => {
      const restored = window.localStorage.getItem(draftKey) ?? "";
      const validDraft = assignableResponders.some((item) => item.id === restored) ? restored : "";
      setSelectedResponder(validDraft);
      setDraftSaved(Boolean(validDraft));
      if (restored && !validDraft) window.localStorage.removeItem(draftKey);
    }, 0);
    return () => window.clearTimeout(restoreDraft);
  }, [assignableResponders, draftKey, open]);

  if (!incident) return null;

  const assignResponder = async () => {
    if (!selectedResponderOption || selectedResponderOption.availability !== "Available") {
      setAssignmentError(true);
      setAssignmentMessage(
        "That responder/team is unavailable. Select a team marked Available.",
      );
      return;
    }
    setIsAssigning(true);
    setAssignmentError(false);
    setAssignmentMessage(null);
    try {
      const response = await authorizedFetch("/api/assign-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responderId: selectedResponder,
          incidentId: incident.id,
        }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setAssignmentError(true);
        setAssignmentMessage(result.reason ?? "Assignment failed.");
        return;
      }

      const previousResponderName = incident.assignedResponder;
      const updatedIncident: Incident = {
        ...incident,
        assignedResponder: selectedResponderOption.name,
        status: "Dispatched",
      };
      const updatedResponders = responders.map((responder) => {
        if (responder.id === selectedResponderOption.id) {
          return {
            ...responder,
            availability: "Unavailable" as const,
            currentAssignment: incident.id,
            lastStatusUpdate: new Date().toISOString(),
          };
        }
        if (
          previousResponderName !== "Unassigned" &&
          responder.name === previousResponderName &&
          responder.currentAssignment === incident.id
        ) {
          return {
            ...responder,
            availability: "Available" as const,
            currentAssignment: "None",
            lastStatusUpdate: new Date().toISOString(),
          };
        }
        return responder;
      });

      setAssignmentMessage(
        `${selectedResponderOption.name} assigned. The team is now unavailable for other incidents.`,
      );
      window.localStorage.removeItem(draftKey);
      setSelectedResponder("");
      setDraftSaved(false);
      onIncidentUpdated?.(updatedIncident);
      onRespondersUpdated?.(updatedResponders);
    } catch {
      setAssignmentError(true);
      setAssignmentMessage("Assignment failed because the dispatch service could not be reached.");
    } finally {
      setIsAssigning(false);
    }
  };

  const removeAssignment = async () => {
    if (incident.assignedResponder === "Unassigned") return;
    setIsAssigning(true);
    setAssignmentError(false);
    setAssignmentMessage(null);
    try {
      const response = await authorizedFetch("/api/remove-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setAssignmentError(true);
        setAssignmentMessage(result.reason ?? "Unable to remove the team assignment.");
        return;
      }

      const removedResponderName = incident.assignedResponder;
      const updatedIncident: Incident = {
        ...incident,
        assignedResponder: "Unassigned",
        status: "Verified",
        validationStatus: "Confirmed",
      };
      const updatedResponders = responders.map((responder) =>
        responder.name === removedResponderName &&
        responder.currentAssignment === incident.id
          ? {
              ...responder,
              availability: "Available" as const,
              currentAssignment: "None",
              lastStatusUpdate: new Date().toISOString(),
            }
          : responder,
      );

      setAssignmentMessage(
        `${removedResponderName} was formally removed and is available for reassignment.`,
      );
      onIncidentUpdated?.(updatedIncident);
      onRespondersUpdated?.(updatedResponders);
    } catch {
      setAssignmentError(true);
      setAssignmentMessage("The team assignment could not be removed because the service is unavailable.");
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleBuzzer = async () => {
    setIsTogglingBuzzer(true);
    setBuzzerMessage(null);
    const nextActive = !incident.buzzerActive;
    const response = await authorizedFetch("/api/device-buzzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: incident.deviceId, active: nextActive }),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string };
    setIsTogglingBuzzer(false);
    if (!result.ok) {
      setBuzzerMessage(result.reason ?? "Buzzer command failed.");
      return;
    }
    setBuzzerMessage(
      nextActive
        ? "Buzzer activation command sent."
        : "Buzzer deactivation command sent.",
    );
    onIncidentUpdated?.({
      ...incident,
      buzzerActive: nextActive,
      buzzerUpdatedAt: new Date().toISOString(),
    });
  };

  const safeDialogCopy = (() => {
    switch (safeAction) {
      case "assign":
        return {
          title: validActions.includes("reassign") ? "Review team reassignment" : "Review team dispatch",
          summary: `${validActions.includes("reassign") ? "Reassign" : "Dispatch"} ${selectedResponderOption?.name ?? "the selected team"} to ${incident.id} at ${incident.location}.`,
          confirmLabel: validActions.includes("reassign") ? "Confirm Reassignment" : "Confirm Dispatch",
          tone: "set" as const,
        };
      case "activate-buzzer":
        return {
          title: "Activate municipal node buzzer",
          summary: `This sends an urgent audible command to ${incident.deviceId}. Confirm the device and field impact before continuing.`,
          confirmLabel: "Activate Buzzer",
          tone: "critical" as const,
        };
      case "deactivate-buzzer":
        return {
          title: "Deactivate node buzzer",
          summary: `This stops the active audible command on ${incident.deviceId}.`,
          confirmLabel: "Confirm Deactivation",
          tone: "set" as const,
        };
      case "false-alarm":
        return {
          title: "Mark alert as false alarm",
          summary: `This removes ${incident.id} from the active response queue. Confirm that verification is complete.`,
          confirmLabel: "Mark False Alarm",
          tone: "critical" as const,
        };
      case "remove-assignment":
        return {
          title: "Remove response-team assignment",
          summary: `Formally remove ${incident.assignedResponder} from ${incident.id}. The incident will return to Verified and await a new dispatch.`,
          confirmLabel: "Remove Assignment",
          tone: "critical" as const,
        };
      case "start-response":
        return { title: "Start active response", summary: `Confirm that the dispatched team is actively responding to ${incident.id}.`, confirmLabel: "Mark Responding", tone: "set" as const };
      case "mark-on-scene":
        return { title: "Confirm team arrival", summary: `Confirm that the assigned team has reached ${incident.location}.`, confirmLabel: "Mark On Scene", tone: "set" as const };
      case "close":
        return { title: "Close incident record", summary: `Close ${incident.id} after operational review. This removes it from active monitoring.`, confirmLabel: "Close Incident", tone: "set" as const };
      default:
        return { title: "Review action", summary: "Review this action before continuing.", confirmLabel: "Confirm", tone: "set" as const };
    }
  })();

  const confirmSafeAction = async () => {
    const action = safeAction;
    setSafeAction(null);
    if (action === "assign") await assignResponder();
    if (action === "activate-buzzer" || action === "deactivate-buzzer") await toggleBuzzer();
    if (action === "false-alarm") await validateAlert("False Alarm");
    if (action === "remove-assignment") await removeAssignment();
    if (action === "start-response") await updateWorkflowStatus("Responding");
    if (action === "mark-on-scene") await updateWorkflowStatus("On Scene");
    if (action === "close") await updateWorkflowStatus("Closed");
  };

  const validateAlert = async (validationStatus: ValidationStatus) => {
    if (validationInFlight.current || incident.validationStatus === validationStatus) {
      setValidationMessage(
        validationStatus === "Confirmed"
          ? "This alert is already verified."
          : "This incident is already marked as a false alert.",
      );
      return;
    }
    validationInFlight.current = true;
    setIsValidating(true);
    setValidationMessage(null);
    try {
      const response = await authorizedFetch("/api/validate-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, validationStatus }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setValidationMessage(result.reason ?? "Alert validation failed.");
        return;
      }

      const updatedIncident: Incident = {
        ...incident,
        validationStatus,
        status: validationStatus === "Confirmed" ? "Verified" : "False Alert",
      };
      setValidationMessage(
        validationStatus === "Confirmed"
          ? "Alert verified. Verify Alert is now disabled; False Alert remains available for correction."
          : "Incident marked as a false alert. False Alert is now disabled; Verify Alert remains available for correction.",
      );
      onIncidentUpdated?.(updatedIncident);
    } catch {
      setValidationMessage("Alert validation failed because the service could not be reached.");
    } finally {
      validationInFlight.current = false;
      setIsValidating(false);
    }
  };

  const updateWorkflowStatus = async (
    status: "Responding" | "On Scene" | "Closed",
  ) => {
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const response = await authorizedFetch("/api/update-incident-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, status }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setStatusMessage(result.reason ?? "Status update failed.");
        return;
      }

      const updatedIncident: Incident = { ...incident, status };
      onIncidentUpdated?.(updatedIncident);
      setStatusMessage(`Incident marked ${status.toLowerCase()}.`);
    } catch {
      setStatusMessage("Status update failed because the workflow service could not be reached.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const mapQuery = incident.coordinates || incident.approximateAddress || incident.location;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="incident-details-title">
      <DialogTitle id="incident-details-title">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" color="secondary">{incident.id}</Typography>
            <Typography variant="body2" color="text.secondary">Incident details and valid operational actions</Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <AlertLevelChip alertLevel={incident.alertLevel} />
            <StatusChip status={incident.status} />
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["Category", incident.category],
            ["Registered Location", incident.location],
            ["Reported", `${formatPhilippineDateTime(incident.timestamp)} PHT`],
            ["Assigned Team", incident.assignedResponder],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 12, sm: 6 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 800 }}
              >
                {label}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <Box
              component="details"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                "& summary": { cursor: "pointer", fontWeight: 800 },
              }}
            >
              <Box component="summary">Incident &amp; device details</Box>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                {[
                  ["Node ID", incident.deviceId],
                  ["Address / Landmark", incident.approximateAddress ?? "Not recorded"],
                  ["Coordinates", incident.coordinates ?? "Not recorded"],
                  ["Elapsed Time", getElapsedWaitingTime(incident)],
                  ["Trigger Method", incident.triggerMethod],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}><Divider /></Grid>
          <Grid size={{ xs: 12 }}>
            <IncidentAlertLevelPanel
              incident={incident}
              online={online}
              onIncidentUpdated={onIncidentUpdated}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <BackupCoordinationPanel
              incident={incident}
              online={online}
              onIncidentUpdated={onIncidentUpdated}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                border: "1px solid rgba(36,77,58,0.12)",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Stack spacing={0.4}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Verification
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {incident.validationStatus ?? "Pending Review"}
                </Typography>
                {validationMessage && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {validationMessage}
                  </Typography>
                )}
              </Stack>
              {canCorrectValidation && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    color="success"
                    startIcon={<FactCheckIcon />}
                    disabled={isValidating || isVerified || !online}
                    onClick={() => validateAlert("Confirmed")}
                  >
                    Verify Alert
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<ReportProblemIcon />}
                    disabled={isValidating || isFalseAlert || !online}
                    onClick={() => setSafeAction("false-alarm")}
                  >
                    Mark as False Alert
                  </Button>
                </Stack>
              )}
            </Stack>
            {!canCorrectValidation && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Verification is locked because dispatch or response activity has already started.
              </Typography>
            )}
          </Grid>
          {incident.assignedResponder !== "Unassigned" && (
            <Grid size={{ xs: 12 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: "rgba(25, 103, 210, 0.04)",
                }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                  <GroupsOutlinedIcon color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Current Response Assignment
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900 }}>
                      {incident.assignedResponder}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assignedResponderProfile
                        ? `${assignedResponderProfile.agency} · ${assignedResponderProfile.role}`
                        : "MDRRMO responder or partner unit"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {["Dispatched", "Responding", "On Scene"].includes(incident.status)
                        ? `Assigned to ${incident.id} · unavailable for another dispatch until resolved or formally removed`
                        : `Assignment retained in the incident record · responder/team released from active duty`}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                  <StatusChip
                    status={
                      ["Dispatched", "Responding", "On Scene"].includes(incident.status)
                        ? "Unavailable"
                        : assignedResponderProfile?.availability ?? "Available"
                    }
                  />
                  {validActions.includes("remove-assignment") && (
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<PersonRemoveOutlinedIcon />}
                      disabled={isAssigning || !online}
                      onClick={() => setSafeAction("remove-assignment")}
                    >
                      Remove Assignment
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>
          {validActions.some((action) => ["start-response", "mark-on-scene", "close"].includes(action)) && (
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Valid Status Actions</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {validActions.includes("start-response") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("start-response")}>Start Response</Button>}
                  {validActions.includes("mark-on-scene") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("mark-on-scene")}>Mark On Scene</Button>}
                  {validActions.includes("close") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("close")}>Close Incident</Button>}
                </Stack>
                {statusMessage && <Typography variant="body2" color={statusMessage.includes("failed") ? "error" : "success.main"} sx={{ fontWeight: 700 }}>{statusMessage}</Typography>}
              </Stack>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              Voice Context Summary
            </Typography>
            <Typography variant="body1">
              {incident.voiceTranscript || incident.callerContext}
            </Typography>
            {lowBandwidth && incident.voiceUrl && (
              <Alert severity="info" sx={{ mt: 1 }}>Voice media is deferred in Low-Bandwidth Mode. The transcript remains available.</Alert>
            )}
            {incident.voiceUrl && !lowBandwidth && (
              <audio
                controls
                preload="metadata"
                src={incident.voiceUrl}
                style={{ width: "100%", marginTop: 12 }}
              >
                Your browser does not support audio playback.
              </audio>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                border: "1px solid rgba(36,77,58,0.12)",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Stack spacing={0.25}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 800 }}
                >
                  Node Buzzer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                  {incident.buzzerActive ? "Active" : "Inactive"} on{" "}
                  {incident.deviceId}
                </Typography>
                {incident.buzzerUpdatedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last command: {incident.buzzerUpdatedAt}
                  </Typography>
                )}
                {buzzerMessage && (
                  <Typography
                    variant="caption"
                    color={
                      buzzerMessage.includes("failed")
                        ? "error"
                        : "success.main"
                    }
                    sx={{ fontWeight: 800 }}
                  >
                    {buzzerMessage}
                  </Typography>
                )}
              </Stack>
              <Button
                variant={incident.buzzerActive ? "outlined" : "contained"}
                color={incident.buzzerActive ? "primary" : "error"}
                startIcon={
                  incident.buzzerActive ? (
                    <NotificationsOffIcon />
                  ) : (
                    <NotificationsActiveIcon />
                  )
                }
                onClick={() => setSafeAction(incident.buzzerActive ? "deactivate-buzzer" : "activate-buzzer")}
                disabled={isTogglingBuzzer || !online}
              >
                {isTogglingBuzzer
                  ? "Sending..."
                  : incident.buzzerActive
                    ? "Deactivate Buzzer"
                    : "Activate Buzzer"}
              </Button>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box
              component="details"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                "& summary": { cursor: "pointer" },
              }}
            >
              <Box component="summary">
                <Typography component="span" variant="subtitle2" sx={{ fontWeight: 900 }}>
                  Activity &amp; Field Updates ({(incident.activityHistory?.length ?? 0) + (incident.fieldNoteCount ?? 0)})
                </Typography>
              </Box>
            {(incident.activityHistory?.length ?? 0) > 0 && (
              <Stack spacing={1} sx={{ mt: 0.75, mb: 1.5 }}>
                {incident.activityHistory?.map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.25 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {activity.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatPhilippineDateTime(activity.createdAt)} PHT
                      {activity.source ? ` · ${activity.source}` : ""}
                      {activity.reason ? ` · Reason: ${activity.reason}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
            {incident.fieldNoteCount ? (
              <Stack spacing={1} sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {incident.fieldNoteCount} total note
                  {incident.fieldNoteCount === 1 ? "" : "s"}, newest first
                </Typography>
                {(incident.fieldNotes ?? []).map((note, index) => (
                  <Stack
                    key={`${note.createdAt}-${index}`}
                    spacing={0.5}
                    sx={{
                      border: "1px solid rgba(36,77,58,0.12)",
                      borderRadius: 1,
                      p: 1.25,
                      bgcolor:
                        index === 0
                          ? "rgba(244,127,53,0.06)"
                          : "background.default",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ alignItems: "center", flexWrap: "wrap" }}
                    >
                      <StatusChip status={note.status} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 800 }}
                      >
                        {note.createdAt}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: index === 0 ? 800 : 600 }}
                    >
                      {note.remarks}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No field notes received yet.
              </Typography>
            )}
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="h6" color="secondary">
                {canAssign
                  ? validActions.includes("reassign") ? "Reassign Response Team" : "Dispatch Response Team"
                  : "Team Assignment"}
              </Typography>
              {!canAssign ? (
                <Typography variant="body2" color="text.secondary">
                  Team dispatch is not valid during the current workflow stage.
                </Typography>
              ) : (
                <Autocomplete
                  options={assignableResponders}
                  value={selectedResponderOption}
                  getOptionLabel={(responder) => `${responder.name} · ${responder.agency} · ${responder.availability}`}
                  onChange={(_, responder) => {
                    const nextId = responder?.id ?? "";
                    setSelectedResponder(nextId);
                    if (nextId) window.localStorage.setItem(draftKey, nextId);
                    else window.localStorage.removeItem(draftKey);
                    setDraftSaved(Boolean(nextId));
                  }}
                  renderInput={(params) => <TextField {...params} label="Search responder or team" />}
                />
              )}
              {canAssign && (
                <Typography variant="caption" color="text.secondary">
                  Only responders and teams marked Available are listed. {responders.length - assignableResponders.length} unavailable or offline option{responders.length - assignableResponders.length === 1 ? "" : "s"} hidden.
                </Typography>
              )}
              {draftSaved && canAssign && (
                <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>Dispatch draft saved locally on this device.</Typography>
              )}
              {!online && canAssign && (
                <Alert severity="info">Offline · Local Sync. Drafts remain available, but dispatch commands wait for a network connection.</Alert>
              )}
              {assignmentMessage && (
                <Alert severity={assignmentError ? "error" : "success"}>
                  {assignmentMessage}
                </Alert>
              )}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          startIcon={<MapIcon />}
          component="a"
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open Map
        </Button>
        <Button
          variant="outlined"
          startIcon={<VolumeUpIcon />}
          component={incident.voiceUrl ? "a" : "button"}
          href={incident.voiceUrl}
          target={incident.voiceUrl ? "_blank" : undefined}
          rel={incident.voiceUrl ? "noreferrer" : undefined}
          disabled={!incident.voiceUrl || lowBandwidth}
        >
          {incident.voiceUrl ? "Open Voice Context" : "Voice Unavailable"}
        </Button>
        <Button
          onClick={() => setSafeAction("assign")}
          disabled={!canAssign || !selectedResponder || isAssigning || !online}
        >
          {isAssigning ? "Sending..." : validActions.includes("reassign") ? "Reassign Team" : "Dispatch Team"}
        </Button>
        <Button onClick={onClose}>Close Details</Button>
      </DialogActions>
      <SafeConfirmDialog
        key={safeAction ?? "closed"}
        open={Boolean(safeAction)}
        title={safeDialogCopy.title}
        summary={safeDialogCopy.summary}
        confirmLabel={safeDialogCopy.confirmLabel}
        tone={safeDialogCopy.tone}
        busy={isAssigning || isTogglingBuzzer || isValidating || isUpdatingStatus}
        blockedReason={!online ? "Offline · Local Sync. High-impact commands are never queued automatically." : undefined}
        onCancel={() => setSafeAction(null)}
        onConfirm={() => void confirmSafeAction()}
      />
    </Dialog>
  );
}
