"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Incident, Responder } from "@/types";

export type AssignmentTarget =
  | { kind: "responder"; id: string; name: string }
  | { kind: "resource"; id: string; name: string };

type ResourceAssignmentDialogProps = {
  target: AssignmentTarget | null;
  activeIncidents: Incident[];
  availableTeams: Responder[];
  selectedIncident: string;
  selectedTeam: string;
  onSelectedIncident: (incidentId: string) => void;
  onSelectedTeam: (teamId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ResourceAssignmentDialog({
  target,
  activeIncidents,
  availableTeams,
  selectedIncident,
  selectedTeam,
  onSelectedIncident,
  onSelectedTeam,
  onClose,
  onConfirm
}: ResourceAssignmentDialogProps) {
  const isResource = target?.kind === "resource";
  const canConfirm = isResource ? Boolean(selectedTeam) : Boolean(selectedIncident);

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isResource ? "Assign Resource to Team" : "Assign to Incident"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Selected {target?.kind === "resource" ? "resource" : "responder"}
          </Typography>
          <Typography variant="h6" color="secondary">
            {target?.name}
          </Typography>
          {isResource ? (
            <TextField
              select
              fullWidth
              label="Responding Team"
              value={selectedTeam}
              onChange={(event) => onSelectedTeam(event.target.value)}
            >
              {availableTeams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name} - {team.agency} - {team.availability}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              fullWidth
              label="Active Incident"
              value={selectedIncident}
              onChange={(event) => onSelectedIncident(event.target.value)}
            >
              {activeIncidents.map((incident) => (
                <MenuItem key={incident.id} value={incident.id}>
                  {incident.id} - {incident.category} - {incident.location}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!canConfirm}>
          Confirm Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
