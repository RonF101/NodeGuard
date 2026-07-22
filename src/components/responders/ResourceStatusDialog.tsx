"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ResourceStatus, ResponseResource } from "@/types";

export type ResourceStatusAction = {
  mode: "release" | "availability";
  resource: ResponseResource;
};

type ResourceStatusDialogProps = {
  action: ResourceStatusAction | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (status: Exclude<ResourceStatus, "Dispatched">, reason: string) => void;
};

const availabilityStatuses: Array<Exclude<ResourceStatus, "Dispatched">> = [
  "Available",
  "Under Maintenance",
  "Unavailable",
  "Reserved",
];

export function ResourceStatusDialog({
  action,
  busy = false,
  error,
  onClose,
  onConfirm,
}: ResourceStatusDialogProps) {
  const [status, setStatus] = useState<Exclude<ResourceStatus, "Dispatched">>(
    action?.resource.status === "Dispatched" ? "Available" : action?.resource.status ?? "Available",
  );
  const [reason, setReason] = useState("");
  const isRelease = action?.mode === "release";

  return (
    <Dialog open={Boolean(action)} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isRelease ? "Release Resource" : "Update Resource Availability"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="h6" color="secondary">
            {action?.resource.id} - {action?.resource.unitName}
          </Typography>
          {isRelease && (
            <Alert severity="info">
              This ends the active assignment to {action?.resource.assignedIncident}. Select what
              condition the resource should have after release.
            </Alert>
          )}
          <TextField
            select
            label={isRelease ? "Status after release" : "Availability status"}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Exclude<ResourceStatus, "Dispatched">)
            }
          >
            {availabilityStatuses.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            autoFocus
            multiline
            minRows={3}
            label={isRelease ? "Release / condition note" : "Availability reason"}
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 500))}
            helperText={`${reason.length}/500 - required for the operations record`}
            slotProps={{ htmlInput: { "aria-label": "Resource availability reason" } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(status, reason.trim())}
          disabled={busy || !reason.trim()}
          color={isRelease ? "warning" : "primary"}
        >
          {busy ? "Saving..." : isRelease ? "Confirm Release" : "Save Availability"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
