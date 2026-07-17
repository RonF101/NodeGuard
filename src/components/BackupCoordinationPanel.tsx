"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { formatPhilippineDateTime } from "@/config/incidentOperations";
import { authorizedFetch } from "@/lib/auth";
import type { BackupOffer, BackupRequestStatus, Incident } from "@/types";

type BackupCoordinationPanelProps = {
  incident: Incident;
  online: boolean;
  onIncidentUpdated?: (incident: Incident) => void;
};

type ActionResult = {
  ok: boolean;
  reason?: string;
  data?: { request_status?: string; approved_count?: number };
};

const activeStatuses: BackupRequestStatus[] = [
  "Requested",
  "Assistance Offered",
  "Partially Filled",
  "Confirmed",
];

function mapRequestStatus(value?: string): BackupRequestStatus | undefined {
  if (value === "assistance_offered") return "Assistance Offered";
  if (value === "partially_filled") return "Partially Filled";
  if (value === "confirmed") return "Confirmed";
  if (value === "fulfilled") return "Fulfilled";
  if (value === "cancelled") return "Cancelled";
  if (value === "closed") return "Closed";
  if (value === "requested") return "Requested";
  return undefined;
}

export function BackupCoordinationPanel({
  incident,
  online,
  onIncidentUpdated,
}: BackupCoordinationPanelProps) {
  const request = incident.backupRequest;
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!request) {
    return (
      <Stack spacing={0.5} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
          Backup Coordination
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No backup request has been submitted for this incident.
        </Typography>
      </Stack>
    );
  }

  const isActive = activeStatuses.includes(request.status);
  const offered = request.offers.filter((offer) => offer.status === "Offered");

  const decideOffer = async (offer: BackupOffer, decision: "approved" | "declined") => {
    setPendingOfferId(offer.id);
    setMessage(null);
    setError(false);
    try {
      const response = await authorizedFetch("/api/backup-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, decision, note: decisionNote.trim() || undefined }),
      });
      const result = (await response.json()) as ActionResult;
      if (!result.ok) {
        setError(true);
        setMessage(result.reason ?? "The assistance offer could not be updated.");
        return;
      }
      const nextOffer: BackupOffer = {
        ...offer,
        status: decision === "approved" ? "Approved" : "Declined",
        decidedAt: new Date().toISOString(),
        decisionNote: decisionNote.trim() || undefined,
      };
      const nextOffers = request.offers.map((item) => item.id === offer.id ? nextOffer : item);
      const requestStatus = mapRequestStatus(result.data?.request_status) ?? request.status;
      onIncidentUpdated?.({
        ...incident,
        backupRequest: {
          ...request,
          status: requestStatus,
          offers: nextOffers,
          confirmedResponders: nextOffers.filter((item) => item.status === "Approved"),
        },
      });
      setDecisionNote("");
      setMessage(
        decision === "approved"
          ? `${offer.responderName} was confirmed as an additional responder. Their assignment will synchronize automatically.`
          : `${offer.responderName}'s assistance offer was declined.`,
      );
    } catch {
      setError(true);
      setMessage("The backup coordination service could not be reached.");
    } finally {
      setPendingOfferId(null);
    }
  };

  const cancelRequest = async () => {
    if (!cancellationReason.trim()) {
      setError(true);
      setMessage("Enter a reason before cancelling the backup request.");
      return;
    }
    setIsCancelling(true);
    setMessage(null);
    setError(false);
    try {
      const response = await authorizedFetch("/api/backup-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, reason: cancellationReason.trim() }),
      });
      const result = (await response.json()) as ActionResult;
      if (!result.ok) {
        setError(true);
        setMessage(result.reason ?? "The backup request could not be cancelled.");
        return;
      }
      onIncidentUpdated?.({
        ...incident,
        backupRequest: {
          ...request,
          status: "Cancelled",
          cancelledAt: new Date().toISOString(),
          cancellationReason: cancellationReason.trim(),
        },
      });
      setMessage("Backup request cancelled. Connected responders will be notified.");
    } catch {
      setError(true);
      setMessage("The backup coordination service could not be reached.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Backup Coordination
          </Typography>
          <Typography variant="h6" color="secondary">
            {request.status}
          </Typography>
        </Box>
        <AlertLevelChip alertLevel={incident.alertLevel} />
      </Stack>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
        {request.assistanceTypes.map((type) => <Chip key={type} label={type} size="small" />)}
      </Stack>
      <Typography variant="body2"><strong>Requesting team:</strong> {request.requestingTeam}</Typography>
      <Typography variant="body2"><strong>Reason:</strong> {request.reason}</Typography>
      <Typography variant="body2">
        <strong>Requested:</strong> {formatPhilippineDateTime(request.requestedAt)} PHT · {request.respondersNeeded} responder{request.respondersNeeded === 1 ? "" : "s"} needed · {request.confirmedResponders.length} confirmed
      </Typography>

      <Divider />
      <Typography variant="subtitle2">Assistance offers</Typography>
      {!request.offers.length && (
        <Typography variant="body2" color="text.secondary">No responder has offered assistance yet.</Typography>
      )}
      {request.offers.map((offer) => (
        <Stack
          key={offer.id}
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 1, justifyContent: "space-between", alignItems: { sm: "center" } }}
        >
          <Box>
            <Typography sx={{ fontWeight: 800 }}>{offer.responderName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {offer.responderAvailability} · offered {formatPhilippineDateTime(offer.offeredAt)} PHT · {offer.status}
            </Typography>
          </Box>
          {offer.status === "Offered" && isActive && (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                color="success"
                disabled={!online || Boolean(pendingOfferId)}
                onClick={() => decideOffer(offer, "approved")}
                aria-label={`Confirm ${offer.responderName} for backup assignment`}
              >
                Confirm
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={!online || Boolean(pendingOfferId)}
                onClick={() => decideOffer(offer, "declined")}
                aria-label={`Decline ${offer.responderName}'s backup offer`}
              >
                Decline
              </Button>
            </Stack>
          )}
        </Stack>
      ))}

      {offered.length > 0 && (
        <TextField
          label="Coordination note (optional)"
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value.slice(0, 500))}
          helperText={`${decisionNote.length}/500`}
          slotProps={{ htmlInput: { "aria-label": "Optional backup offer decision note" } }}
        />
      )}

      {isActive && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-start" } }}>
          <TextField
            fullWidth
            label="Cancellation reason"
            value={cancellationReason}
            onChange={(event) => setCancellationReason(event.target.value.slice(0, 500))}
            helperText="Required only when cancelling"
            slotProps={{ htmlInput: { "aria-label": "Backup request cancellation reason" } }}
          />
          <Button
            variant="outlined"
            color="error"
            disabled={!online || isCancelling || !cancellationReason.trim()}
            onClick={cancelRequest}
            aria-label="Cancel active backup request"
            sx={{ minWidth: 170 }}
          >
            {isCancelling ? "Cancelling..." : "Cancel Request"}
          </Button>
        </Stack>
      )}
      {message && <Alert severity={error ? "error" : "success"}>{message}</Alert>}
    </Stack>
  );
}
