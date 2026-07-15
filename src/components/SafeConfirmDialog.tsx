"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { useState } from "react";

type SafeConfirmDialogProps = {
  open: boolean;
  title: string;
  summary: string;
  confirmLabel: string;
  tone?: "set" | "critical";
  busy?: boolean;
  blockedReason?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SafeConfirmDialog({
  open,
  title,
  summary,
  confirmLabel,
  tone = "set",
  busy = false,
  blockedReason,
  onCancel,
  onConfirm,
}: SafeConfirmDialogProps) {
  const [reviewed, setReviewed] = useState(false);
  const cancel = () => {
    setReviewed(false);
    onCancel();
  };
  const confirm = () => {
    setReviewed(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : cancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 2 }}>{summary}</Typography>
        {blockedReason && <Alert severity="info" sx={{ mb: 2 }}>{blockedReason}</Alert>}
        <FormControlLabel
          control={<Checkbox checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />}
          label="I reviewed the incident, destination, and operational impact."
          sx={{ alignItems: "flex-start" }}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={cancel} disabled={busy}>Cancel</Button>
        <Button
          color={tone === "critical" ? "error" : "primary"}
          onClick={confirm}
          disabled={!reviewed || busy || Boolean(blockedReason)}
        >
          {busy ? "Sending…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
