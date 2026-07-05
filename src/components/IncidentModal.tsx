"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { Incident } from "@/types";
import { StatusChip } from "@/components/StatusChip";

type IncidentModalProps = {
  incident: Incident | null;
  open: boolean;
  onClose: () => void;
};

export function IncidentModal({ incident, open, onClose }: IncidentModalProps) {
  if (!incident) return null;

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
            ["Assigned Responder", incident.assignedResponder]
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                {label}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Status
            </Typography>
            <Stack direction="row" sx={{ mt: 0.5 }}>
              <StatusChip status={incident.status} />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Voice Context Summary
            </Typography>
            <Typography variant="body1">{incident.callerContext}</Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" startIcon={<VolumeUpIcon />}>
          Play Voice Context
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
