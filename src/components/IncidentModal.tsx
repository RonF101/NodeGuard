"use client";

import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
import { authorizedFetch } from "@/lib/auth";
import { SafeConfirmDialog } from "@/components/SafeConfirmDialog";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";

type SafeAction = "assign" | "activate-buzzer" | "deactivate-buzzer" | "false-alarm" | null;

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
  const [safeAction, setSafeAction] = useState<SafeAction>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const { online, lowBandwidth } = useConnectivity();
  const isClosedForAssignment = ["Resolved", "Closed", "False Alert"].includes(
    incident?.status ?? "Closed",
  );

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
          title: "Review team dispatch",
          summary: `Dispatch ${selectedResponderOption?.name ?? "the selected team"} to ${incident.id} at ${incident.location}.`,
          confirmLabel: "Confirm Dispatch",
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

  const mapQuery = incident.coordinates || incident.approximateAddress || incident.location;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{incident.id}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["Category", incident.category],
            ["Device", incident.deviceId],
            ["Location", incident.location],
            ["Address", incident.approximateAddress ?? "Not recorded"],
            ["Coordinates", incident.coordinates ?? "Not recorded"],
            ["Timestamp", incident.timestamp],
            ["Trigger Method", incident.triggerMethod],
            ["Priority", incident.priority],
            ["Assigned Responder", incident.assignedResponder],
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              Status
            </Typography>
            <Stack direction="row" sx={{ mt: 0.5 }}>
              <StatusChip status={incident.status} />
            </Stack>
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
                  Alert Validation
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
              {(incident.validationStatus ?? "Pending Review") === "Pending Review" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    color="success"
                    startIcon={<FactCheckIcon />}
                    disabled={isValidating}
                    onClick={() => validateAlert("Confirmed")}
                  >
                    Confirm Alert
                  </Button>
                  <Button
                    color="primary"
                    variant="outlined"
                    startIcon={<ReportProblemIcon />}
                    disabled={isValidating}
                    onClick={() => setSafeAction("false-alarm")}
                  >
                    Mark False Alarm
                  </Button>
                </Stack>
              )}
            </Stack>
          </Grid>
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
              Field Notes / Response Updates
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
                {isClosedForAssignment
                  ? "Assignment Closed"
                  : "Assign Personnel"}
              </Typography>
              {isClosedForAssignment ? (
                <Typography variant="body2" color="text.secondary">
                  This alert is already final and cannot be assigned again.
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
              {draftSaved && !isClosedForAssignment && (
                <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>Dispatch draft saved locally on this device.</Typography>
              )}
              {!online && !isClosedForAssignment && (
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
          disabled={isClosedForAssignment || !selectedResponder || isAssigning || !online}
        >
          {isAssigning ? "Assigning..." : "Assign Personnel"}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <SafeConfirmDialog
        key={safeAction ?? "closed"}
        open={Boolean(safeAction)}
        title={safeDialogCopy.title}
        summary={safeDialogCopy.summary}
        confirmLabel={safeDialogCopy.confirmLabel}
        tone={safeDialogCopy.tone}
        busy={isAssigning || isTogglingBuzzer || isValidating}
        blockedReason={!online ? "Offline · Local Sync. High-impact commands are never queued automatically." : undefined}
        onCancel={() => setSafeAction(null)}
        onConfirm={() => void confirmSafeAction()}
      />
    </Dialog>
  );
}
