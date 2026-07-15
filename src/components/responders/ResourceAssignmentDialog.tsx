"use client";

import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Incident } from "@/types";
import { useState } from "react";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";

export type AssignmentTarget =
  | { kind: "responder"; id: string; name: string }
  | { kind: "resource"; id: string; name: string };

type ResourceAssignmentDialogProps = {
  target: AssignmentTarget | null;
  activeIncidents: Incident[];
  selectedIncident: string;
  onSelectedIncident: (incidentId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
};

export function ResourceAssignmentDialog({
  target,
  activeIncidents,
  selectedIncident,
  onSelectedIncident,
  onClose,
  onConfirm,
  isConfirming = false
}: ResourceAssignmentDialogProps) {
  const isResource = target?.kind === "resource";
  const [reviewed, setReviewed] = useState(false);
  const { online } = useConnectivity();
  const selectedIncidentOption = activeIncidents.find((incident) => incident.id === selectedIncident) ?? null;
  const canConfirm = Boolean(selectedIncident) && reviewed && online;

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isResource ? "Assign Resource to Incident" : "Assign Responder to Incident"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Selected {target?.kind === "resource" ? "resource" : "responder"}
          </Typography>
          <Typography variant="h6" color="secondary">
            {target?.name}
          </Typography>
          <Autocomplete
            options={activeIncidents}
            value={selectedIncidentOption}
            getOptionLabel={(incident) => `${incident.id} · ${incident.category} · ${incident.location}`}
            onChange={(_, incident) => {
              setReviewed(false);
              onSelectedIncident(incident?.id ?? "");
            }}
            renderInput={(params) => <TextField {...params} label="Search active incident" />}
          />
          {selectedIncidentOption && (
            <Alert severity="info">
              Review: dispatch {target?.name} to {selectedIncidentOption.id} at {selectedIncidentOption.location}.
            </Alert>
          )}
          {!online && <Alert severity="info">Offline · Local Sync. Dispatch commands wait for a network connection.</Alert>}
          <FormControlLabel
            control={<Checkbox checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />}
            label="I reviewed the incident, destination, and operational impact."
            sx={{ alignItems: "flex-start" }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => { setReviewed(false); onClose(); }}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!canConfirm || isConfirming}>
          {isConfirming ? "Assigning..." : "Confirm Dispatch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
