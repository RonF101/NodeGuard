"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useMemo, useState } from "react";
import { Incident, Responder } from "@/types";
import { StatusChip } from "@/components/StatusChip";

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

  if (!incident) return null;

  const assignResponder = async () => {
    if (!selectedResponder) return;
    setIsAssigning(true);
    setAssignmentMessage(null);
    const response = await fetch("/api/assign-responder", {
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
    onAssigned?.();
  };

  const toggleBuzzer = async () => {
    setIsTogglingBuzzer(true);
    setBuzzerMessage(null);
    const nextActive = !incident.buzzerActive;
    const response = await fetch("/api/device-buzzer", {
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{incident.id}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["Category", incident.category],
            ["Device", incident.deviceId],
            ["Location", incident.location],
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              Voice Context Summary
            </Typography>
            <Typography variant="body1">{incident.callerContext}</Typography>
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
                color={incident.buzzerActive ? "inherit" : "warning"}
                startIcon={
                  incident.buzzerActive ? (
                    <NotificationsOffIcon />
                  ) : (
                    <NotificationsActiveIcon />
                  )
                }
                onClick={toggleBuzzer}
                disabled={isTogglingBuzzer}
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
                <TextField
                  select
                  fullWidth
                  label="Responder / Team"
                  value={selectedResponder}
                  onChange={(event) => setSelectedResponder(event.target.value)}
                >
                  {assignableResponders.map((responder) => (
                    <MenuItem key={responder.id} value={responder.id}>
                      {responder.name} - {responder.agency} -{" "}
                      {responder.availability}
                    </MenuItem>
                  ))}
                </TextField>
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
        <Button variant="outlined" startIcon={<VolumeUpIcon />}>
          Play Voice Context
        </Button>
        <Button
          onClick={assignResponder}
          disabled={isClosedForAssignment || !selectedResponder || isAssigning}
        >
          {isAssigning ? "Assigning..." : "Assign Personnel"}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
