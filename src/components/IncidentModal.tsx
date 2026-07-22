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
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import MapIcon from "@mui/icons-material/Map";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import { useEffect, useMemo, useRef, useState } from "react";
import { Incident, Responder, ResponseResource, ValidationResult, ValidationStatus } from "@/types";
import { StatusChip } from "@/components/StatusChip";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { OperationalChip } from "@/components/OperationalChip";
import { IncidentAlertLevelPanel } from "@/components/IncidentAlertLevelPanel";
import { BackupCoordinationPanel } from "@/components/BackupCoordinationPanel";
import { IncidentResourcePanel } from "@/components/IncidentResourcePanel";
import { authorizedFetch } from "@/lib/auth";
import { SafeConfirmDialog } from "@/components/SafeConfirmDialog";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import {
  formatPhilippineDateTime,
  getElapsedWaitingTime,
  getValidationResultLabel,
  getValidIncidentActions,
  validationResultOrder,
} from "@/config/incidentOperations";

type SafeAction =
  | "assign"
  | "confirm-dispatch"
  | "activate-buzzer"
  | "deactivate-buzzer"
  | "false-alarm"
  | "remove-assignment"
  | "start-response"
  | "mark-on-scene"
  | "resolve"
  | "close"
  | null;

type IncidentModalProps = {
  incident: Incident | null;
  open: boolean;
  responders?: Responder[];
  resources?: ResponseResource[];
  onClose: () => void;
  onIncidentUpdated?: (incident: Incident) => void;
  onRespondersUpdated?: (responders: Responder[]) => void;
  onResourcesUpdated?: (resources: ResponseResource[]) => void;
  environment?: "barangay" | "mdrrmo" | "legacy";
};

export function IncidentModal({
  incident,
  open,
  responders = [],
  resources = [],
  onClose,
  onIncidentUpdated,
  onRespondersUpdated,
  onResourcesUpdated,
  environment = "legacy",
}: IncidentModalProps) {
  const [selectedResponder, setSelectedResponder] = useState("");
  const [dispatchInstructions, setDispatchInstructions] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isTogglingBuzzer, setIsTogglingBuzzer] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(
    null,
  );
  const [assignmentError, setAssignmentError] = useState(false);
  const [buzzerMessage, setBuzzerMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [safeAction, setSafeAction] = useState<SafeAction>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [classification, setClassification] = useState<ValidationResult>(incident?.validationResult ?? "Validated");
  const [validationNotes, setValidationNotes] = useState(incident?.validationNotes ?? "");
  const [validationMethod, setValidationMethod] = useState(incident?.validationMethod ?? "Phone or radio confirmation");
  const [validationContact, setValidationContact] = useState(incident?.validationContact ?? "");
  const [validationEvidence, setValidationEvidence] = useState(incident?.validationEvidence ?? "");
  const [escalationNotes, setEscalationNotes] = useState(incident?.escalationReason ?? "");
  const [coordinationMessage, setCoordinationMessage] = useState<string | null>(null);
  const [isCoordinating, setIsCoordinating] = useState(false);
  const [afterHoursNotes, setAfterHoursNotes] = useState("");
  const [isAcknowledgingAfterHours, setIsAcknowledgingAfterHours] = useState(false);
  const [closureActions, setClosureActions] = useState(incident?.actionsTaken ?? "");
  const [closureOutcome, setClosureOutcome] = useState(incident?.resolutionDetails ?? "");
  const [closureNotes, setClosureNotes] = useState(incident?.closureDetails ?? "");
  const [fieldUpdate, setFieldUpdate] = useState("");
  const [fieldUpdateMessage, setFieldUpdateMessage] = useState<string | null>(null);
  const [isSubmittingFieldUpdate, setIsSubmittingFieldUpdate] = useState(false);
  const validationInFlight = useRef(false);
  const { online, lowBandwidth } = useConnectivity();
  const validActions = incident ? getValidIncidentActions(incident) : [];
  const municipalControl = Boolean(incident && (
    ["LT-MDRRMO Direct", "Municipal Coordination"].includes(incident.managementMode ?? "")
    || incident.mdrrmoFallbackActive
    || (incident.escalationStatus && incident.escalationStatus !== "Not Escalated")
  ));
  const mdrrmoCanCoordinate = environment === "mdrrmo"
    ? municipalControl
    : environment === "barangay"
      ? !["LT-MDRRMO Direct", "Municipal Coordination"].includes(incident?.managementMode ?? "")
      : true;
  const canUpdateWorkflow = environment === "barangay"
    ? incident?.managementMode !== "LT-MDRRMO Direct"
    : mdrrmoCanCoordinate;
  const canAssign = mdrrmoCanCoordinate && (validActions.includes("dispatch") || validActions.includes("reassign"));
  const canCorrectValidation = Boolean(
    incident &&
      (environment === "barangay" || (environment === "mdrrmo" && (
        ["LT-MDRRMO Direct", "Municipal Coordination"].includes(incident.managementMode ?? "")
        || incident.mdrrmoFallbackActive
      ))) &&
      (["Reported", "Pending Validation", "Pending Verification", "Validated", "Verified", "False Alert"].includes(incident.status)
        || (incident.status === "Closed" && incident.validationStatus === "False Alarm")),
  );
  const isIotIncident = incident?.sourceType === "IoT Node" && Boolean(incident.deviceId);
  const isVerified = incident?.validationStatus === "Confirmed";
  const isFalseAlert = incident?.validationStatus === "False Alarm";

  const assignableResponders = useMemo(
    () => responders.filter((responder) =>
      responder.availability === "Available" &&
      (environment === "legacy" ||
        (environment === "barangay" && responder.organizationType === "Barangay" && (!incident?.barangayId || responder.barangayId === incident.barangayId)) ||
        (environment === "mdrrmo" && responder.organizationType === "LT-MDRRMO")),
    ),
    [environment, incident, responders],
  );
  const assignableResources = useMemo(
    () => resources.filter((resource) =>
      environment === "legacy" ||
      (environment === "barangay" && resource.organizationType === "Barangay" && (!incident?.barangayId || resource.barangayId === incident.barangayId)) ||
      (environment === "mdrrmo" && resource.organizationType === "LT-MDRRMO"),
    ),
    [environment, incident, resources],
  );

  const selectedResponderOption = assignableResponders.find((item) => item.id === selectedResponder) ?? null;
  const assignedResponderProfile =
    incident?.assignedResponder && incident.assignedResponder !== "Unassigned"
      ? responders.find((responder) => responder.name === incident.assignedResponder) ?? null
      : null;
  const draftKey = incident ? `nodeguard.dispatch-draft:${incident.id}` : "";
  const instructionsDraftKey = `${draftKey}:instructions`;

  useEffect(() => {
    if (!open || !draftKey) return;
    const restoreDraft = window.setTimeout(() => {
      const restored = window.localStorage.getItem(draftKey) ?? "";
      const restoredInstructions = window.localStorage.getItem(instructionsDraftKey) ?? "";
      const validDraft = assignableResponders.some((item) => item.id === restored) ? restored : "";
      setSelectedResponder(validDraft);
      setDispatchInstructions(restoredInstructions);
      setDraftSaved(Boolean(validDraft || restoredInstructions));
      if (restored && !validDraft) window.localStorage.removeItem(draftKey);
    }, 0);
    return () => window.clearTimeout(restoreDraft);
  }, [assignableResponders, draftKey, instructionsDraftKey, open]);

  if (!incident) return null;

  const withActivity = (
    nextIncident: Incident,
    type: NonNullable<Incident["activityHistory"]>[number]["type"],
    message: string,
    reason?: string,
  ): Incident => ({
    ...nextIncident,
    activityHistory: [{
      id: `UI-${Date.now()}-${type}`,
      type,
      message,
      actorName: environment === "barangay" ? "Barangay operator" : "LT-MDRRMO operator",
      actorRole: environment === "barangay" ? "Barangay personnel" : "Municipal personnel",
      reason,
      createdAt: new Date().toISOString(),
    }, ...(incident.activityHistory ?? [])],
  });

  const assignResponder = async () => {
    if (!selectedResponderOption || selectedResponderOption.availability !== "Available") {
      setAssignmentError(true);
      setAssignmentMessage(
        "That responder/team is unavailable. Select a team marked Available.",
      );
      return;
    }
    setIsAssigning(true);
    setAssignmentError(false);
    setAssignmentMessage(null);
    try {
      const response = await authorizedFetch("/api/assign-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responderId: selectedResponder,
          incidentId: incident.id,
          instructions: dispatchInstructions.trim(),
        }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setAssignmentError(true);
        setAssignmentMessage(result.reason ?? "Assignment failed.");
        return;
      }

      const previousResponderName = incident.assignedResponder;
      const updatedIncident = withActivity({
        ...incident,
        assignedResponder: selectedResponderOption.name,
        status: "Assigned",
        assignmentSource: environment === "barangay" ? "Barangay" : "LT-MDRRMO",
        assignmentInstructions: dispatchInstructions.trim() || undefined,
      }, "Assignment", `${selectedResponderOption.name} assigned to the incident.`, dispatchInstructions.trim() || undefined);
      const updatedResponders = responders.map((responder) => {
        if (responder.id === selectedResponderOption.id) {
          return {
            ...responder,
            availability: "Unavailable" as const,
            currentAssignment: incident.id,
            lastStatusUpdate: new Date().toISOString(),
          };
        }
        if (
          previousResponderName !== "Unassigned" &&
          responder.name === previousResponderName &&
          responder.currentAssignment === incident.id
        ) {
          return {
            ...responder,
            availability: "Available" as const,
            currentAssignment: "None",
            lastStatusUpdate: new Date().toISOString(),
          };
        }
        return responder;
      });

      setAssignmentMessage(
        `${selectedResponderOption.name} assigned. The team is now unavailable for other incidents.`,
      );
      window.localStorage.removeItem(draftKey);
      window.localStorage.removeItem(instructionsDraftKey);
      setSelectedResponder("");
      setDispatchInstructions("");
      setDraftSaved(false);
      onIncidentUpdated?.(updatedIncident);
      onRespondersUpdated?.(updatedResponders);
    } catch {
      setAssignmentError(true);
      setAssignmentMessage("Assignment failed because the dispatch service could not be reached.");
    } finally {
      setIsAssigning(false);
    }
  };

  const removeAssignment = async () => {
    if (incident.assignedResponder === "Unassigned") return;
    setIsAssigning(true);
    setAssignmentError(false);
    setAssignmentMessage(null);
    try {
      const response = await authorizedFetch("/api/remove-responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setAssignmentError(true);
        setAssignmentMessage(result.reason ?? "Unable to remove the team assignment.");
        return;
      }

      const removedResponderName = incident.assignedResponder;
      const updatedIncident = withActivity({
        ...incident,
        assignedResponder: "Unassigned",
        status: "Validated",
        validationStatus: "Confirmed",
      }, "Assignment", `${removedResponderName} removed from the active assignment.`);
      const updatedResponders = responders.map((responder) =>
        responder.name === removedResponderName &&
        responder.currentAssignment === incident.id
          ? {
              ...responder,
              availability: "Available" as const,
              currentAssignment: "None",
              lastStatusUpdate: new Date().toISOString(),
            }
          : responder,
      );

      setAssignmentMessage(
        `${removedResponderName} was formally removed and is available for reassignment.`,
      );
      onIncidentUpdated?.(updatedIncident);
      onRespondersUpdated?.(updatedResponders);
    } catch {
      setAssignmentError(true);
      setAssignmentMessage("The team assignment could not be removed because the service is unavailable.");
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleBuzzer = async () => {
    if (!incident.deviceId) {
      setBuzzerMessage("This incident is not associated with an IoT node.");
      return;
    }
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
    onIncidentUpdated?.({
      ...incident,
      buzzerActive: nextActive,
      buzzerUpdatedAt: new Date().toISOString(),
    });
  };

  const handleAfterHoursAction = async (action: "barangay_acknowledge" | "mdrrmo_claim") => {
    if (!afterHoursNotes.trim()) return;
    setIsAcknowledgingAfterHours(true);
    setCoordinationMessage(null);
    try {
      const response = await authorizedFetch("/api/incidents/after-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, action, notes: afterHoursNotes.trim() }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setCoordinationMessage(result.reason ?? "After-hours acknowledgement failed.");
        return;
      }
      const updated: Incident = action === "barangay_acknowledge"
        ? { ...incident, barangayAcknowledgedAt: new Date().toISOString(), mdrrmoFallbackActive: false }
        : { ...incident, managementMode: "Municipal Coordination", mdrrmoFallbackActive: true };
      onIncidentUpdated?.(withActivity(updated, "Coordination", action === "barangay_acknowledge" ? "Responsible barangay acknowledged the after-hours alert." : "LT-MDRRMO claimed after-hours fallback coordination.", afterHoursNotes.trim()));
      setAfterHoursNotes("");
      setCoordinationMessage(action === "barangay_acknowledge" ? "Barangay acknowledgement recorded." : "LT-MDRRMO fallback coordination claimed.");
    } finally {
      setIsAcknowledgingAfterHours(false);
    }
  };

  const closeIncident = async () => {
    if (!closureActions.trim() || !closureOutcome.trim() || !closureNotes.trim()) return;
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const response = await authorizedFetch("/api/incidents/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incident.id,
          actionsTaken: closureActions.trim(),
          resultOutcome: closureOutcome.trim(),
          closureNotes: closureNotes.trim(),
        }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setStatusMessage(result.reason ?? "Incident closure failed.");
        return;
      }
      onIncidentUpdated?.(withActivity({
        ...incident,
        status: "Closed",
        actionsTaken: closureActions.trim(),
        resolutionDetails: closureOutcome.trim(),
        closureDetails: closureNotes.trim(),
      }, "Status", "Incident closure completed with response history preserved.", closureNotes.trim()));
      setStatusMessage("Incident closed with response history, resources, outcome, and closure notes preserved.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const safeDialogCopy = (() => {
    switch (safeAction) {
      case "assign":
        return {
          title: validActions.includes("reassign") ? "Review team reassignment" : "Review team assignment",
          summary: `${validActions.includes("reassign") ? "Reassign" : "Assign"} ${selectedResponderOption?.name ?? "the selected team"} to ${incident.id} at ${incident.location}.`,
          confirmLabel: validActions.includes("reassign") ? "Confirm Reassignment" : "Confirm Assignment",
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
          title: "Record a false or misleading report",
          summary: `This removes ${incident.id} from the active response queue. Confirm that verification is complete.`,
          confirmLabel: "Record Classification",
          tone: "critical" as const,
        };
      case "remove-assignment":
        return {
          title: "Remove response-team assignment",
          summary: `Formally remove ${incident.assignedResponder} from ${incident.id}. The incident will return to Awaiting Assignment.`,
          confirmLabel: "Remove Assignment",
          tone: "critical" as const,
        };
      case "start-response":
        return { title: "Start active response", summary: `Confirm that the dispatched team is actively responding to ${incident.id}.`, confirmLabel: "Mark Responding", tone: "set" as const };
      case "confirm-dispatch":
        return { title: "Confirm team dispatch", summary: `Confirm that the assigned team and reserved resources have been dispatched to ${incident.location}.`, confirmLabel: "Confirm Dispatch", tone: "set" as const };
      case "mark-on-scene":
        return { title: "Confirm team arrival", summary: `Confirm that the assigned team has reached ${incident.location}.`, confirmLabel: "Mark On Scene", tone: "set" as const };
      case "resolve":
        return { title: "Resolve incident", summary: `Confirm that active response for ${incident.id} is complete. A final closure record is still required.`, confirmLabel: "Mark Resolved", tone: "set" as const };
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
    if (action === "confirm-dispatch") await updateWorkflowStatus("Dispatched");
    if (action === "activate-buzzer" || action === "deactivate-buzzer") await toggleBuzzer();
    if (action === "false-alarm") await validateAlert("False Alarm");
    if (action === "remove-assignment") await removeAssignment();
    if (action === "start-response") await updateWorkflowStatus("Responding");
    if (action === "mark-on-scene") await updateWorkflowStatus("On Scene");
    if (action === "resolve") await updateWorkflowStatus("Resolved");
    if (action === "close") await updateWorkflowStatus("Closed");
  };

  const validateAlert = async (validationStatus: ValidationStatus) => {
    if (validationInFlight.current || incident.validationStatus === validationStatus) {
      setValidationMessage(
        validationStatus === "Confirmed"
          ? "This alert is already verified."
          : "This incident is already marked as a false alert.",
      );
      return;
    }
    validationInFlight.current = true;
    setIsValidating(true);
    setValidationMessage(null);
    try {
      const response = await authorizedFetch("/api/validate-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, validationStatus }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setValidationMessage(result.reason ?? "Alert validation failed.");
        return;
      }

      const updatedIncident: Incident = {
        ...incident,
        validationStatus,
        status: validationStatus === "Confirmed" ? "Verified" : "False Alert",
      };
      setValidationMessage(
        validationStatus === "Confirmed"
          ? "Alert verified. Verify Alert is now disabled; the false-or-misleading classification remains available for correction."
          : "Report recorded as false or misleading. That classification is now disabled; Verify Alert remains available for correction.",
      );
      onIncidentUpdated?.(updatedIncident);
    } catch {
      setValidationMessage("Alert validation failed because the service could not be reached.");
    } finally {
      validationInFlight.current = false;
      setIsValidating(false);
    }
  };

  const classifyAlert = async () => {
    if (!validationNotes.trim()) {
      setValidationMessage("Validation notes are required for every classification.");
      return;
    }
    validationInFlight.current = true;
    setIsValidating(true);
    setValidationMessage(null);
    try {
      const response = await authorizedFetch("/api/classify-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incident.id,
          result: classification,
          notes: validationNotes,
          method: validationMethod,
          contacted: validationContact,
          evidence: validationEvidence,
        }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setValidationMessage(result.reason ?? "Alert classification failed.");
        return;
      }
      const validated = classification === "Validated";
      const unverified = classification === "Unverified";
      onIncidentUpdated?.(withActivity({
        ...incident,
        validationResult: classification,
        validationNotes: validationNotes.trim(),
        validationMethod: validationMethod.trim(),
        validationContact: validationContact.trim() || undefined,
        validationEvidence: validationEvidence.trim() || undefined,
        validationStatus: validated ? "Confirmed" : unverified ? "Pending Review" : "False Alarm",
        status: validated ? "Validated" : unverified ? "Pending Validation" : "Closed",
        validatedAt: new Date().toISOString(),
      }, "Validation", `Validation classified as ${classification}.`, validationNotes.trim()));
      setValidationMessage(`Classification saved as ${classification}.`);
    } catch {
      setValidationMessage("Alert classification failed because the service could not be reached.");
    } finally {
      validationInFlight.current = false;
      setIsValidating(false);
    }
  };

  const submitEscalation = async () => {
    if (!escalationNotes.trim()) {
      setCoordinationMessage("Select or enter a clear escalation reason.");
      return;
    }
    setIsCoordinating(true);
    setCoordinationMessage(null);
    try {
      const response = await authorizedFetch("/api/escalate-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, reason: escalationNotes }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setCoordinationMessage(result.reason ?? "Escalation failed.");
        return;
      }
      onIncidentUpdated?.(withActivity({
        ...incident,
        escalationStatus: "Pending Acknowledgement",
        escalationReason: escalationNotes.trim(),
        escalatedAt: new Date().toISOString(),
      }, "Escalation", "Incident escalated to LT-MDRRMO with its complete response record.", escalationNotes.trim()));
      setCoordinationMessage("Complete incident history sent to LT-MDRRMO. Barangay access remains active.");
    } catch {
      setCoordinationMessage("Escalation failed because the coordination service could not be reached.");
    } finally {
      setIsCoordinating(false);
    }
  };

  const acknowledgeIncidentEscalation = async () => {
    if (!escalationNotes.trim()) {
      setCoordinationMessage("Acknowledgement notes are required.");
      return;
    }
    setIsCoordinating(true);
    setCoordinationMessage(null);
    try {
      const response = await authorizedFetch("/api/acknowledge-escalation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, notes: escalationNotes }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setCoordinationMessage(result.reason ?? "Acknowledgement failed.");
        return;
      }
      onIncidentUpdated?.(withActivity({
        ...incident,
        escalationStatus: "Coordinating",
        managementMode: "Municipal Coordination",
        mdrrmoAcknowledgedAt: new Date().toISOString(),
        assignmentInstructions: escalationNotes.trim(),
      }, "Coordination", "LT-MDRRMO acknowledged the escalation and began coordination.", escalationNotes.trim()));
      setCoordinationMessage("Escalation acknowledged. Municipal coordination is now active.");
    } catch {
      setCoordinationMessage("Acknowledgement failed because the coordination service could not be reached.");
    } finally {
      setIsCoordinating(false);
    }
  };

  const updateWorkflowStatus = async (
    status: "Dispatched" | "Responding" | "On Scene" | "Resolved" | "Closed",
  ) => {
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const response = await authorizedFetch("/api/update-incident-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, status }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setStatusMessage(result.reason ?? "Status update failed.");
        return;
      }

      const updatedIncident = withActivity({
        ...incident,
        status,
        assignedResources: status === "Dispatched"
          ? (incident.assignedResources ?? []).map((resource) => ({ ...resource, status: "Dispatched" }))
          : incident.assignedResources,
        resolvedAt: status === "Resolved" ? new Date().toISOString() : incident.resolvedAt,
      }, "Status", `Incident status changed from ${incident.status} to ${status}.`);
      onIncidentUpdated?.(updatedIncident);
      if (status === "Dispatched") {
        onRespondersUpdated?.(responders.map((responder) => responder.currentAssignment === incident.id ? { ...responder, availability: "Dispatched", lastStatusUpdate: new Date().toISOString() } : responder));
        onResourcesUpdated?.(resources.map((resource) => resource.assignedIncident === incident.id ? { ...resource, status: "Dispatched", lastUpdated: new Date().toISOString() } : resource));
      }
      if (status === "Resolved") {
        onRespondersUpdated?.(responders.map((responder) =>
          responder.currentAssignment === incident.id
            ? { ...responder, availability: "Available", currentAssignment: "None", lastStatusUpdate: new Date().toISOString() }
            : responder,
        ));
        onResourcesUpdated?.(resources.map((resource) =>
          resource.assignedIncident === incident.id
            ? { ...resource, status: "Available", assignedIncident: "None", lastUpdated: new Date().toISOString() }
            : resource,
        ));
      }
      setStatusMessage(`Incident marked ${status.toLowerCase()}.`);
    } catch {
      setStatusMessage("Status update failed because the workflow service could not be reached.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const submitFieldUpdate = async () => {
    if (!fieldUpdate.trim()) return;
    setIsSubmittingFieldUpdate(true);
    setFieldUpdateMessage(null);
    try {
      const response = await authorizedFetch("/api/incidents/field-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, remarks: fieldUpdate.trim() }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) {
        setFieldUpdateMessage(result.reason ?? "Field update could not be saved.");
        return;
      }
      const createdAt = new Date().toISOString();
      const note = { status: incident.status, remarks: fieldUpdate.trim(), createdAt };
      onIncidentUpdated?.(withActivity({
        ...incident,
        fieldNotes: [note, ...(incident.fieldNotes ?? [])],
        fieldNoteCount: (incident.fieldNoteCount ?? 0) + 1,
        latestFieldNote: note.remarks,
        latestFieldNoteAt: createdAt,
      }, "Status", "Field update submitted.", note.remarks));
      setFieldUpdate("");
      setFieldUpdateMessage("Field update saved to the incident timeline.");
    } catch {
      setFieldUpdateMessage("Field update failed because the service could not be reached.");
    } finally {
      setIsSubmittingFieldUpdate(false);
    }
  };

  const mapQuery = incident.coordinates || incident.approximateAddress || incident.location;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="incident-details-title">
      <DialogTitle id="incident-details-title">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" color="secondary">{incident.id}</Typography>
            <Typography variant="body2" color="text.secondary">Incident details and valid operational actions</Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <AlertLevelChip alertLevel={incident.alertLevel} />
            <StatusChip status={incident.status} />
            {incident.validationResult && <OperationalChip kind="validation" value={incident.validationResult} />}
            {incident.escalationStatus && incident.escalationStatus !== "Not Escalated" && <OperationalChip kind="escalation" value={incident.escalationStatus} />}
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["Owning Barangay", incident.barangayName ?? "Not assigned"],
            ["Source Type", incident.sourceType ?? "Manual Entry"],
            ["Reporting Channel", incident.reportingChannel ?? "Not recorded"],
            ["Category", incident.category],
            ["Incident Location", incident.location],
            ["Reported", `${formatPhilippineDateTime(incident.timestamp)} PHT`],
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
          <Grid size={{ xs: 12 }}>
            <Box
              component="details"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                "& summary": { cursor: "pointer", fontWeight: 800 },
              }}
            >
              <Box component="summary">Incident intake &amp; supporting details</Box>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                {[
                  ["Reporter / Source", incident.reportingPersonOrSource ?? "Not recorded"],
                  ["Reporter Contact", incident.reporterContact ?? "Not available"],
                  ["Reporting Office", incident.reportingOffice ?? "Not recorded"],
                  ["Incident Subtype", incident.incidentSubtype ?? "Not recorded"],
                  ["Landmark", incident.landmark ?? incident.approximateAddress ?? "Not recorded"],
                  ["Persons Affected", String(incident.personsAffected ?? 0)],
                  ["Affected-person Condition", incident.affectedPersonsCondition ?? "Not recorded"],
                  ["Validation Method", incident.validationMethod ?? "Not yet validated"],
                  ["Validation Contact", incident.validationContact ?? "Not recorded"],
                  ["Validation Evidence", incident.validationEvidence ?? "Not recorded"],
                  ["Management", incident.managementMode ?? "Barangay Managed"],
                  ["Node ID", incident.deviceId ?? "Not applicable"],
                  ["Coordinates", incident.coordinates ?? "Not recorded"],
                  ["Elapsed Time", getElapsedWaitingTime(incident)],
                  ["Trigger Method", incident.triggerMethod ?? "Not applicable"],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
          {incident.afterHoursAlert && <Grid size={{ xs: 12 }}>
            <Stack spacing={1.25} sx={{ border: "1px solid", borderColor: "warning.main", borderRadius: 1, p: 1.5 }}>
              <Alert severity={incident.barangayAcknowledgedAt ? "success" : incident.managementMode === "Municipal Coordination" ? "warning" : "info"}>
                After-hours IoT alert · Barangay acknowledgement due {incident.barangayAcknowledgementDueAt ? `${formatPhilippineDateTime(incident.barangayAcknowledgementDueAt)} PHT` : "under the configured schedule"}.
              </Alert>
              {!incident.barangayAcknowledgedAt && incident.managementMode !== "Municipal Coordination" && <TextField label="Required acknowledgement or coordination notes" multiline minRows={2} value={afterHoursNotes} onChange={(event) => setAfterHoursNotes(event.target.value)} />}
              {environment === "barangay" && !incident.barangayAcknowledgedAt && incident.managementMode !== "Municipal Coordination" && <Button disabled={!afterHoursNotes.trim() || isAcknowledgingAfterHours} onClick={() => void handleAfterHoursAction("barangay_acknowledge")} sx={{ alignSelf: { sm: "flex-start" } }}>Acknowledge for Barangay</Button>}
              {environment === "mdrrmo" && incident.mdrrmoFallbackActive && !incident.barangayAcknowledgedAt && incident.managementMode !== "Municipal Coordination" && <Button color="warning" disabled={!afterHoursNotes.trim() || isAcknowledgingAfterHours} onClick={() => void handleAfterHoursAction("mdrrmo_claim")} sx={{ alignSelf: { sm: "flex-start" } }}>Claim Fallback Coordination</Button>}
              {incident.barangayAcknowledgedAt && <Typography variant="body2" sx={{ fontWeight: 800 }}>Acknowledged by the responsible barangay at {formatPhilippineDateTime(incident.barangayAcknowledgedAt)} PHT.</Typography>}
              {incident.managementMode === "Municipal Coordination" && <Typography variant="body2" sx={{ fontWeight: 800 }}>LT-MDRRMO Operations holds fallback coordination. The barangay retains record visibility.</Typography>}
            </Stack>
          </Grid>}
          <Grid size={{ xs: 12 }}><Divider /></Grid>
          {mdrrmoCanCoordinate && <Grid size={{ xs: 12 }}>
            <IncidentAlertLevelPanel
              incident={incident}
              online={online}
              onIncidentUpdated={onIncidentUpdated}
            />
          </Grid>}
          {mdrrmoCanCoordinate && <Grid size={{ xs: 12 }}>
            <BackupCoordinationPanel
              incident={incident}
              online={online}
              onIncidentUpdated={onIncidentUpdated}
            />
          </Grid>}
          {mdrrmoCanCoordinate && <Grid size={{ xs: 12 }}>
            <IncidentResourcePanel
              incident={incident}
              resources={assignableResources}
              online={online}
              onIncidentUpdated={onIncidentUpdated}
              onResourcesUpdated={onResourcesUpdated}
            />
          </Grid>}
          {environment === "mdrrmo" && !mdrrmoCanCoordinate && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">This incident remains under barangay operational control. LT-MDRRMO retains central-record visibility and can coordinate after escalation or an eligible after-hours fallback.</Alert>
            </Grid>
          )}
          {canCorrectValidation && (
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1.25} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{environment === "mdrrmo" ? "LT-MDRRMO Incident Validation" : "Barangay Incident Validation"}</Typography>
                  <Typography variant="body2" color="text.secondary">Review all information available for this reporting channel. Camera evidence is optional and its absence does not make a report false.</Typography>
                </Box>
                <TextField select label="Validation classification" value={classification} onChange={(event) => setClassification(event.target.value as ValidationResult)}>
                  {validationResultOrder.map((item) => <MenuItem key={item} value={item}>{getValidationResultLabel(item)}</MenuItem>)}
                </TextField>
                <TextField select required label="Verification method" value={validationMethod} onChange={(event) => setValidationMethod(event.target.value)}>
                  {["Phone or radio confirmation", "Reporter follow-up", "Barangay official confirmation", "Field responder confirmation", "Activation capture review", "Document or attachment review", "Multiple-source verification", "Other authorized method"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
                <Grid container spacing={1.25}>
                  <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Person or office contacted" value={validationContact} onChange={(event) => setValidationContact(event.target.value)} /></Grid>
                  <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Supporting evidence summary" value={validationEvidence} onChange={(event) => setValidationEvidence(event.target.value)} /></Grid>
                </Grid>
                <TextField label="Required validation notes" multiline minRows={3} value={validationNotes} onChange={(event) => setValidationNotes(event.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                <Button startIcon={<FactCheckIcon />} disabled={isValidating || !online || !validationMethod.trim() || !validationNotes.trim()} onClick={classifyAlert} sx={{ alignSelf: { sm: "flex-start" } }}>
                  {isValidating ? "Saving Classification..." : "Save Classification"}
                </Button>
                {validationMessage && <Typography variant="body2" color={validationMessage.includes("failed") || validationMessage.includes("required") ? "error" : "success.main"}>{validationMessage}</Typography>}
              </Stack>
            </Grid>
          )}
          {environment === "legacy" && <Grid size={{ xs: 12 }}>
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
              {canCorrectValidation && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    color="success"
                    startIcon={<FactCheckIcon />}
                    disabled={isValidating || isVerified || !online}
                    onClick={() => validateAlert("Confirmed")}
                  >
                    Verify Alert
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<ReportProblemIcon />}
                    disabled={isValidating || isFalseAlert || !online}
                    onClick={() => setSafeAction("false-alarm")}
                  >
                    Mark as False or Misleading Report
                  </Button>
                </Stack>
              )}
            </Stack>
            {!canCorrectValidation && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Verification is locked because dispatch or response activity has already started.
              </Typography>
            )}
          </Grid>}
          {environment === "barangay" && incident.validationResult === "Validated" && incident.escalationStatus === "Not Escalated" && ["Validated", "Verified", "Dispatched", "Responding", "On Scene"].includes(incident.status) && (
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1.25} sx={{ border: "1px solid", borderColor: "warning.light", bgcolor: "rgba(255,152,0,0.05)", borderRadius: 1, p: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Escalate to LT-MDRRMO</Typography>
                  <Typography variant="body2" color="text.secondary">Use when the incident exceeds barangay capacity, spans multiple areas, or requires specialized personnel, equipment, or external coordination.</Typography>
                </Box>
                <TextField select label="Escalation reason" value={escalationNotes} onChange={(event) => setEscalationNotes(event.target.value)}>
                  {["Beyond barangay capacity", "Major or severe incident", "Multiple victims", "Incident affecting multiple barangays", "Specialized equipment required", "Additional personnel required", "External office coordination required"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
                <Button color="warning" variant="contained" disabled={isCoordinating || !online || !escalationNotes.trim()} onClick={submitEscalation} sx={{ alignSelf: { sm: "flex-start" } }}>
                  {isCoordinating ? "Escalating..." : "Escalate to LT-MDRRMO"}
                </Button>
                {coordinationMessage && <Typography variant="body2" sx={{ fontWeight: 700 }}>{coordinationMessage}</Typography>}
              </Stack>
            </Grid>
          )}
          {environment === "mdrrmo" && incident.escalationStatus === "Pending Acknowledgement" && (
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1.25} sx={{ border: "1px solid", borderColor: "warning.light", borderRadius: 1, p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Acknowledge Barangay Escalation</Typography>
                <Typography variant="body2"><strong>Reason:</strong> {incident.escalationReason}</Typography>
                <TextField label="Acknowledgement and initial coordination notes" multiline minRows={3} value={escalationNotes} onChange={(event) => setEscalationNotes(event.target.value)} />
                <Button disabled={isCoordinating || !online || !escalationNotes.trim()} onClick={acknowledgeIncidentEscalation} sx={{ alignSelf: { sm: "flex-start" } }}>
                  {isCoordinating ? "Acknowledging..." : "Acknowledge & Coordinate"}
                </Button>
                {coordinationMessage && <Typography variant="body2" sx={{ fontWeight: 700 }}>{coordinationMessage}</Typography>}
              </Stack>
            </Grid>
          )}
          {incident.assignedResponder !== "Unassigned" && mdrrmoCanCoordinate && (
            <Grid size={{ xs: 12 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: "rgba(25, 103, 210, 0.04)",
                }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                  <GroupsOutlinedIcon color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Current Response Assignment
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 900 }}>
                      {incident.assignedResponder}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assignedResponderProfile
                        ? `${assignedResponderProfile.agency} · ${assignedResponderProfile.role}`
                        : "Authorized response unit"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {["Assigned", "Dispatched", "Escalated", "Coordinated by LT-MDRRMO", "Responding", "On Scene"].includes(incident.status)
                        ? `Assigned to ${incident.id} · unavailable for another dispatch until resolved or formally removed`
                        : `Assignment retained in the incident record · responder/team released from active duty`}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                  <StatusChip
                    status={
                      ["Dispatched", "Escalated", "Coordinated by LT-MDRRMO", "Responding", "On Scene"].includes(incident.status)
                        ? "Unavailable"
                        : assignedResponderProfile?.availability ?? "Available"
                    }
                  />
                  {validActions.includes("remove-assignment") && (
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<PersonRemoveOutlinedIcon />}
                      disabled={isAssigning || !online}
                      onClick={() => setSafeAction("remove-assignment")}
                    >
                      Remove Assignment
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Grid>
          )}
          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>
          {canUpdateWorkflow && validActions.some((action) => ["confirm-dispatch", "start-response", "mark-on-scene", "resolve", "close"].includes(action)) && (
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Valid Status Actions</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {validActions.includes("confirm-dispatch") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("confirm-dispatch")}>Confirm Dispatch</Button>}
                  {validActions.includes("start-response") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("start-response")}>Start Response</Button>}
                  {validActions.includes("mark-on-scene") && <Button variant="outlined" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("mark-on-scene")}>Mark On Scene</Button>}
                  {validActions.includes("resolve") && <Button color="success" variant="contained" disabled={!online || isUpdatingStatus} onClick={() => setSafeAction("resolve")}>Resolve Incident</Button>}
                  {validActions.includes("close") && <Stack spacing={1.25} sx={{ width: "100%", mt: 0.5 }}>
                    <Alert severity="info">Assigned personnel, resource assignments, field updates, and supporting attachments are retained automatically. Complete the final closure record below.</Alert>
                    <TextField required label="Actions taken" multiline minRows={2} value={closureActions} onChange={(event) => setClosureActions(event.target.value)} />
                    <TextField required label="Result or outcome" multiline minRows={2} value={closureOutcome} onChange={(event) => setClosureOutcome(event.target.value)} />
                    <TextField required label="Closure notes" multiline minRows={2} value={closureNotes} onChange={(event) => setClosureNotes(event.target.value)} />
                    <Button variant="outlined" disabled={!online || isUpdatingStatus || !closureActions.trim() || !closureOutcome.trim() || !closureNotes.trim()} onClick={() => void closeIncident()} sx={{ alignSelf: { sm: "flex-start" } }}>Complete Incident Closure</Button>
                  </Stack>}
                </Stack>
                {statusMessage && <Typography variant="body2" color={statusMessage.includes("failed") ? "error" : "success.main"} sx={{ fontWeight: 700 }}>{statusMessage}</Typography>}
              </Stack>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              Report / Voice Context Summary
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Activation-Time Camera Capture</Typography>
            {incident.cameraCaptureUrl && !lowBandwidth ? (
              <Box component="img" src={incident.cameraCaptureUrl} alt={`Activation capture for ${incident.id}`} sx={{ display: "block", width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 1, mt: 0.75 }} />
            ) : (
              <Alert severity="info" sx={{ mt: 0.75 }}>{lowBandwidth ? "Camera capture deferred in Low-Bandwidth Mode." : "No activation-time camera capture is attached."}</Alert>
            )}
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Authorized Incident Attachments
            </Typography>
            {incident.attachments?.length ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.75 }}>
                {incident.attachments.map((attachment) => (
                  <Button
                    key={attachment.id}
                    component={attachment.url ? "a" : "button"}
                    href={attachment.url || undefined}
                    target={attachment.url ? "_blank" : undefined}
                    rel={attachment.url ? "noreferrer" : undefined}
                    disabled={!attachment.url}
                    variant="outlined"
                    size="small"
                    startIcon={<AttachFileOutlinedIcon />}
                  >
                    {attachment.mediaType} - {attachment.fileName}{attachment.url ? "" : " (protected prototype metadata)"}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                No report or field attachments are recorded.
              </Typography>
            )}
          </Grid>
          {environment !== "mdrrmo" && isIotIncident && <Grid size={{ xs: 12 }}>
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
          </Grid>}
          <Grid size={{ xs: 12 }}>
            <Box
              component="details"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1.5,
                py: 1,
                "& summary": { cursor: "pointer" },
              }}
            >
              <Box component="summary">
                <Typography component="span" variant="subtitle2" sx={{ fontWeight: 900 }}>
                  Activity &amp; Field Updates ({(incident.activityHistory?.length ?? 0) + (incident.fieldNoteCount ?? 0)})
                </Typography>
              </Box>
            {!['Closed', 'Cancelled'].includes(incident.status) && (
              <Stack spacing={1} sx={{ mt: 1.25, mb: 1.5, p: 1.25, bgcolor: "rgba(25,103,210,0.04)", borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Submit operational field update</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Update remarks"
                  placeholder="Observed conditions, actions completed, assistance needed, or handoff notes"
                  value={fieldUpdate}
                  onChange={(event) => setFieldUpdate(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                />
                <Button
                  variant="outlined"
                  disabled={!online || isSubmittingFieldUpdate || !fieldUpdate.trim()}
                  onClick={() => void submitFieldUpdate()}
                  sx={{ alignSelf: { sm: "flex-start" } }}
                >
                  {isSubmittingFieldUpdate ? "Saving Update..." : "Add to Timeline"}
                </Button>
                {fieldUpdateMessage && <Typography variant="body2" color={fieldUpdateMessage.includes("failed") || fieldUpdateMessage.includes("could not") ? "error" : "success.main"}>{fieldUpdateMessage}</Typography>}
              </Stack>
            )}
            {(incident.activityHistory?.length ?? 0) > 0 && (
              <Stack spacing={1} sx={{ mt: 0.75, mb: 1.5 }}>
                {incident.activityHistory?.map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.25 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {activity.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatPhilippineDateTime(activity.createdAt)} PHT
                      {activity.source ? ` · ${activity.source}` : ""}
                      {activity.reason ? ` · Reason: ${activity.reason}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
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
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="h6" color="secondary">
                {canAssign
                  ? validActions.includes("reassign") ? "Reassign Response Team" : "Assign Response Team"
                  : "Team Assignment"}
              </Typography>
              {!canAssign ? (
                <Typography variant="body2" color="text.secondary">
                  Team assignment is not valid during the current workflow stage.
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
                    setDraftSaved(Boolean(nextId || dispatchInstructions));
                  }}
                  renderInput={(params) => <TextField {...params} label="Search responder or team" />}
                />
              )}
              {canAssign && (
                <TextField
                  label="Assignment and dispatch instructions"
                  value={dispatchInstructions}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setDispatchInstructions(nextValue);
                    if (nextValue) window.localStorage.setItem(instructionsDraftKey, nextValue);
                    else window.localStorage.removeItem(instructionsDraftKey);
                    setDraftSaved(Boolean(selectedResponder || nextValue));
                  }}
                  placeholder="Access point, immediate hazards, caller context, or coordination instructions"
                  minRows={2}
                  multiline
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                />
              )}
              {canAssign && (
                <Typography variant="caption" color="text.secondary">
                  Only responders and teams marked Available are listed. {responders.length - assignableResponders.length} unavailable or offline option{responders.length - assignableResponders.length === 1 ? "" : "s"} hidden.
                </Typography>
              )}
              {draftSaved && canAssign && (
                <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>Assignment draft saved locally on this device.</Typography>
              )}
              {!online && canAssign && (
                <Alert severity="info">Offline · Local Sync. Drafts remain available, but assignment commands wait for a network connection.</Alert>
              )}
              {assignmentMessage && (
                <Alert severity={assignmentError ? "error" : "success"}>
                  {assignmentMessage}
                </Alert>
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
          {isAssigning ? "Sending..." : validActions.includes("reassign") ? "Reassign Team" : "Assign Team"}
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
