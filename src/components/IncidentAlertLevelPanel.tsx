"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { alertLevelConfig, alertLevelOrder } from "@/config/alertLevels";
import { formatPhilippineDateTime } from "@/config/incidentOperations";
import { authorizedFetch } from "@/lib/auth";
import type { AlertLevel, Incident } from "@/types";

type IncidentAlertLevelPanelProps = {
  incident: Incident;
  online: boolean;
  onIncidentUpdated?: (incident: Incident) => void;
};

type AlertLevelResponse = {
  ok: boolean;
  reason?: string;
  data?: {
    unchanged?: boolean;
    updated_at?: string;
    updated_by?: string;
  };
};

export function IncidentAlertLevelPanel({
  incident,
  online,
  onIncidentUpdated,
}: IncidentAlertLevelPanelProps) {
  const [selectedLevel, setSelectedLevel] = useState<AlertLevel>(incident.alertLevel);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [remoteChange, setRemoteChange] = useState<string | null>(null);
  const priorConfirmedLevel = useRef(incident.alertLevel);
  const hasDraft = selectedLevel !== incident.alertLevel || Boolean(reason.trim());

  useEffect(() => {
    if (incident.alertLevel === priorConfirmedLevel.current) return;
    const previous = priorConfirmedLevel.current;
    priorConfirmedLevel.current = incident.alertLevel;
    if (selectedLevel !== previous || reason.trim()) {
      setRemoteChange(
        `The confirmed alert level changed from ${previous} to ${incident.alertLevel} while you were reviewing this incident. Your draft has not been submitted.`,
      );
      return;
    }
    setSelectedLevel(incident.alertLevel);
    setRemoteChange(
      `The alert level was updated to ${incident.alertLevel} by another connected user.`,
    );
  }, [incident.alertLevel, reason, selectedLevel]);

  const saveAlertLevel = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(false);
    try {
      const response = await authorizedFetch("/api/update-alert-level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incident.id,
          alertLevel: selectedLevel,
          reason: reason.trim() || undefined,
        }),
      });
      const result = (await response.json()) as AlertLevelResponse;
      if (!result.ok) {
        setError(true);
        setMessage(result.reason ?? "The alert level could not be updated.");
        return;
      }

      const updatedAt = result.data?.updated_at ?? new Date().toISOString();
      const updatedBy = result.data?.updated_by ?? "Current dispatcher";
      const previousLevel = incident.alertLevel;
      const updatedIncident: Incident = {
        ...incident,
        alertLevel: selectedLevel,
        alertLevelUpdatedAt: updatedAt,
        alertLevelUpdatedBy: updatedBy,
        alertLevelUpdateSource: "Dashboard",
        alertLevelUpdateReason: reason.trim() || undefined,
        activityHistory:
          previousLevel === selectedLevel
            ? incident.activityHistory
            : [
                {
                  id: `local-alert-level-${updatedAt}`,
                  type: "Alert Level",
                  message: `Alert level changed from ${previousLevel} to ${selectedLevel} by ${updatedBy}.`,
                  actorName: updatedBy,
                  source: "Dashboard",
                  reason: reason.trim() || undefined,
                  createdAt: updatedAt,
                },
                ...(incident.activityHistory ?? []),
              ],
      };
      priorConfirmedLevel.current = selectedLevel;
      setRemoteChange(null);
      setReason("");
      setMessage(
        result.data?.unchanged
          ? `${selectedLevel} is already the confirmed alert level.`
          : `Alert level updated to ${selectedLevel}. Connected dashboard and personnel views will refresh automatically.`,
      );
      onIncidentUpdated?.(updatedIncident);
    } catch {
      setError(true);
      setMessage("The alert-level service could not be reached.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Alert Level Assessment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set urgency after reviewing the report and voice context.
          </Typography>
        </Box>
        <AlertLevelChip alertLevel={incident.alertLevel} />
      </Stack>

      {remoteChange && <Alert severity="warning">{remoteChange}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { sm: "flex-start" } }}>
        <TextField
          select
          fullWidth
          label="Alert level"
          value={selectedLevel}
          onChange={(event) => {
            setSelectedLevel(event.target.value as AlertLevel);
            setMessage(null);
          }}
          helperText={alertLevelConfig[selectedLevel].description}
          slotProps={{ htmlInput: { "aria-label": "Select incident alert level" } }}
        >
          {alertLevelOrder.map((level) => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          label="Assessment note (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, 500))}
          helperText={`${reason.length}/500`}
          multiline
          minRows={1}
          maxRows={3}
          slotProps={{ htmlInput: { "aria-label": "Optional reason for changing alert level" } }}
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
        <Button
          onClick={saveAlertLevel}
          disabled={!online || isSaving || !hasDraft || selectedLevel === incident.alertLevel && !reason.trim()}
          aria-label="Confirm incident alert level update"
        >
          {isSaving ? "Saving..." : "Update Alert Level"}
        </Button>
        {incident.alertLevelUpdatedAt && (
          <Typography variant="caption" color="text.secondary">
            Last confirmed {formatPhilippineDateTime(incident.alertLevelUpdatedAt)} PHT
            {incident.alertLevelUpdatedBy ? ` by ${incident.alertLevelUpdatedBy}` : ""}
            {incident.alertLevelUpdateSource ? ` via ${incident.alertLevelUpdateSource}` : ""}
          </Typography>
        )}
      </Stack>
      {message && <Alert severity={error ? "error" : "success"}>{message}</Alert>}
    </Stack>
  );
}
