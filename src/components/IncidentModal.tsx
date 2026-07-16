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
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import MapIcon from "@mui/icons-material/Map";
import { useEffect, useMemo, useState } from "react";
import { Incident, Responder, ValidationStatus } from "@/types";
import { StatusChip } from "@/components/StatusChip";
import { PriorityChip } from "@/components/PriorityChip";
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
  | "start-response"
  | "mark-on-scene"
  | "resolve"
  | "close"
  | null;

type IncidentModalProps = {
  incident: Incident | null;
  open: boolean;
  responders?: Responder[];
  onClose: () => void;
  onAssigned?: () => void;
};

export function IncidentModal({
  incident,
  open,
  responders = [],
  onClose,
  onAssigned,
}: IncidentModalProps) {
  const [selectedResponder, setSelectedResponder] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isTogglingBuzzer, setIsTogglingBuzzer] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(
    null,
  );
  const [buzzerMessage, setBuzzerMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [safeAction, setSafeAction] = useState<SafeAction>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const { online, lowBandwidth } = useConnectivity();
  const validActions = incident ? getValidIncidentActions(incident) : [];
  const canAssign = validActions.includes("dispatch") || validActions.includes("reassign");

  const assignableResponders = useMemo(
    () =>
      responders.filter((responder) =>
        ["Available", "Dispatched", "Busy"].includes(responder.availability),
      ),
    [responders],
  );

  const selectedResponderOption = assignableResponders.find((item) => item.id === selectedResponder) ?? null;
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
    if (!selectedResponder) return;
    setIsAssigning(true);
    setAssignmentMessage(null);
    const response = await authorizedFetch("/api/assign-responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responderId: selectedResponder,
        incidentId: incident.id,
      }),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string };
    setIsAssigning(false);
    if (!result.ok) {
      setAssignmentMessage(result.reason ?? "Assignment failed.");
      return;
    }
    setAssignmentMessage("Responder assigned and notified.");
    window.localStorage.removeItem(draftKey);
    setDraftSaved(false);
    onAssigned?.();
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
    onAssigned?.();
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
          tone: "set" as const,
        };
      case "start-response":
        return { title: "Start active response", summary: `Confirm that the dispatched team is actively responding to ${incident.id}.`, confirmLabel: "Mark Responding", tone: "set" as const };
      case "mark-on-scene":
        return { title: "Confirm team arrival", summary: `Confirm that the assigned team has reached ${incident.location}.`, confirmLabel: "Mark On Scene", tone: "set" as const };
      case "resolve":
        return { title: "Resolve incident", summary: `Confirm that the immediate emergency for ${incident.id} has been addressed. The record can still be reviewed before closure.`, confirmLabel: "Resolve Incident", tone: "set" as const };
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
    if (action === "start-response") await updateWorkflowStatus("Responding");
    if (action === "mark-on-scene") await updateWorkflowStatus("On Scene");
    if (action === "resolve") await updateWorkflowStatus("Resolved");
    if (action === "close") await updateWorkflowStatus("Closed");
  };

  const validateAlert = async (validationStatus: ValidationStatus) => {
    setIsValidating(true);
    setValidationMessage(null);
    const response = await authorizedFetch("/api/validate-incident", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: incident.id, validationStatus }),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string };
    setIsValidating(false);
    if (!result.ok) {
      setValidationMessage(result.reason ?? "Alert validation failed.");
      return;
    }
    setValidationMessage(`Alert marked ${validationStatus.toLowerCase()}.`);
    onAssigned?.();
  };

  const updateWorkflowStatus = async (
    status: "Responding" | "On Scene" | "Resolved" | "Closed",
  ) => {
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    const response = await authorizedFetch("/api/update-incident-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: incident.id, status }),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string };
    setIsUpdatingStatus(false);
    if (!result.ok) {
      setStatusMessage(result.reason ?? "Status update failed.");
      return;
    }
    setStatusMessage(`Incident marked ${status.toLowerCase()}.`);
    onAssigned?.();
  };

  const mapQuery = incident.coordinates || incident.approximateAddress || incident.location;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="incident-details-title">
      <DialogTitle id="incident-details-title">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" color="secondary">{incident.id}</Typography>
            <Typography variant="body2" color="text.secondary">Incident details and valid operational actions</Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <PriorityChip priority={incident.priority} />
            <StatusChip status={incident.status} />
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["Category", incident.category],
            ["Node ID", incident.deviceId],
            ["Registered Location", incident.location],
            ["Address / Landmark", incident.approximateAddress ?? "Not recorded"],
            ["Coordinates", incident.coordinates ?? "Not recorded"],
            ["Reported", `${formatPhilippineDateTime(incident.timestamp)} PHT`],
            ["Elapsed Time", getElapsedWaitingTime(incident)],
            ["Trigger Method", incident.triggerMethod],
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
          <Grid size={{ xs: 12 }}><Divider /></Grid>
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
              {(validActions.includes("verify") || validActions.includes("false-alert")) && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {validActions.includes("verify") && <Button
                    color="success"
                    startIcon={<FactCheckIcon />}
                    disabled={isValidating}
                    onClick={() => validateAlert("Confirmed")}
                  >
                    Verify Alert
                  </Button>}
                  {validActions.includes("false-alert") && <Button
                    color="primary"
                    variant="outlined"
                    startIcon={<ReportProblemIcon />}
                    disabled={isValidating}
                    onClick={() => setSafeAction("false-alarm")}
                  >
                    Mark as False Alert
                  </Button>}
                </Stack>
              )}
            </Stack>
          </Grid>
          {validActions.some((action) => ["start-response", "mark-on-scene", "resolve", "close"].includes(action)) && (
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Valid Status Actions</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {validActions.includes("start-response") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("start-response")}>Start Response</Button>}
                  {validActions.includes("mark-on-scene") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("mark-on-scene")}>Mark On Scene</Button>}
                  {validActions.includes("resolve") && <Button color="success" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("resolve")}>Resolve</Button>}
                  {validActions.includes("close") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("close")}>Close Incident</Button>}
                </Stack>
                {statusMessage && <Typography variant="body2" color={statusMessage.includes("failed") ? "error" : "success.main"} sx={{ fontWeight: 700 }}>{statusMessage}</Typography>}
              </Stack>
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              Incident History &amp; Field Updates
            </Typography>
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
              {draftSaved && canAssign && (
                <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>Dispatch draft saved locally on this device.</Typography>
              )}
              {!online && canAssign && (
                <Alert severity="info">Offline · Local Sync. Drafts remain available, but dispatch commands wait for a network connection.</Alert>
              )}
              {assignmentMessage && (
                <Typography
                  variant="body2"
                  color={
                    assignmentMessage.includes("failed")
                      ? "error"
                      : "success.main"
                  }
                >
                  {assignmentMessage}
                </Typography>
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
