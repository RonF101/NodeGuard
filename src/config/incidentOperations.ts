import type { SvgIconComponent } from "@mui/icons-material";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PinDropOutlinedIcon from "@mui/icons-material/PinDropOutlined";
import ReportOffOutlinedIcon from "@mui/icons-material/ReportOffOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { mdrrmoPalette } from "@/theme/theme";
import type { Incident, IncidentStatus, ValidationResult } from "@/types";
import { sortIncidentsByAlertLevel } from "@/config/alertLevels";

type StatusConfiguration = {
  label: IncidentStatus;
  order: number;
  color: string;
  background: string;
  icon: SvgIconComponent;
};

export const incidentStatusOrder: IncidentStatus[] = [
  "Reported",
  "Pending Validation",
  "Validated",
  "Assigned",
  "Dispatched",
  "Responding",
  "On Scene",
  "Resolved",
  "Closed",
  "Cancelled",
];

export const validationResultOrder: ValidationResult[] = [
  "Validated",
  "Unverified",
  "Duplicate Report",
  "Non-Emergency",
  "Accidental Activation",
  "False or Misleading Report",
  "Fraudulent, Hoax, or Prank Report",
];

export function getValidationResultLabel(result: ValidationResult) {
  if (result === "Validated") return "Validated Incident";
  if (result === "Unverified") return "Unverified Report";
  return result;
}

export const incidentStatusConfig = {
  Reported: {
    label: "Reported",
    order: 0,
    color: "#5C4B00",
    background: "#FFF8D9",
    icon: FactCheckOutlinedIcon,
  },
  "Pending Validation": {
    label: "Pending Validation",
    order: 1,
    color: "#7A5200",
    background: "#FFF4D6",
    icon: FactCheckOutlinedIcon,
  },
  Validated: {
    label: "Validated",
    order: 2,
    color: mdrrmoPalette.setBlueDark,
    background: mdrrmoPalette.setBlueSoft,
    icon: GppGoodOutlinedIcon,
  },
  Assigned: {
    label: "Assigned",
    order: 3,
    color: mdrrmoPalette.setBlue,
    background: mdrrmoPalette.setBlueSoft,
    icon: SendOutlinedIcon,
  },
  "Pending Verification": {
    label: "Pending Verification",
    order: 0,
    color: "#7A5200",
    background: "#FFF4D6",
    icon: FactCheckOutlinedIcon,
  },
  Verified: {
    label: "Verified",
    order: 1,
    color: mdrrmoPalette.setBlueDark,
    background: mdrrmoPalette.setBlueSoft,
    icon: GppGoodOutlinedIcon,
  },
  Dispatched: {
    label: "Dispatched",
    order: 2,
    color: mdrrmoPalette.setBlue,
    background: mdrrmoPalette.setBlueSoft,
    icon: SendOutlinedIcon,
  },
  Escalated: {
    label: "Escalated",
    order: 3,
    color: "#8A4B08",
    background: "#FFF0D9",
    icon: CrisisAlertIcon,
  },
  "Coordinated by LT-MDRRMO": {
    label: "Coordinated by LT-MDRRMO",
    order: 4,
    color: mdrrmoPalette.setBlueDark,
    background: mdrrmoPalette.setBlueSoft,
    icon: SendOutlinedIcon,
  },
  "Unable to Respond": {
    label: "Unable to Respond",
    order: 5,
    color: "#8B1E1E",
    background: "#FDE8E7",
    icon: ReportOffOutlinedIcon,
  },
  Responding: {
    label: "Responding",
    order: 6,
    color: mdrrmoPalette.setBlueDark,
    background: "#DDEBFF",
    icon: CrisisAlertIcon,
  },
  "On Scene": {
    label: "On Scene",
    order: 7,
    color: mdrrmoPalette.setBlueDark,
    background: "#DDEBFF",
    icon: PinDropOutlinedIcon,
  },
  Resolved: {
    label: "Resolved",
    order: 8,
    color: mdrrmoPalette.successGreen,
    background: "#E7F4E8",
    icon: TaskAltOutlinedIcon,
  },
  Closed: {
    label: "Closed",
    order: 9,
    color: "#455A64",
    background: "#ECEFF1",
    icon: LockOutlinedIcon,
  },
  Cancelled: {
    label: "Cancelled",
    order: 10,
    color: "#455A64",
    background: "#ECEFF1",
    icon: ReportOffOutlinedIcon,
  },
  "False Alert": {
    label: "False Alert",
    order: 10,
    color: "#455A64",
    background: "#ECEFF1",
    icon: ReportOffOutlinedIcon,
  },
} satisfies Record<IncidentStatus, StatusConfiguration>;

export function getIncidentStatusLabel(status: IncidentStatus) {
  if (status === "Pending Verification") return "Pending Validation";
  if (status === "Validated" || status === "Verified" || status === "Unable to Respond") return "Awaiting Assignment";
  if (status === "Escalated" || status === "Coordinated by LT-MDRRMO") return "Responding";
  if (status === "False Alert") return "Closed";
  return status;
}

export const finalIncidentStatuses: IncidentStatus[] = [
  "Resolved",
  "Closed",
  "Cancelled",
  "False Alert",
];

export const activeResponseStatuses: IncidentStatus[] = [
  "Assigned",
  "Dispatched",
  "Escalated",
  "Coordinated by LT-MDRRMO",
  "Unable to Respond",
  "Responding",
  "On Scene",
];

export function isFinalIncident(status: IncidentStatus) {
  return finalIncidentStatuses.includes(status);
}

export function sortIncidentQueue(incidents: Incident[]) {
  return sortIncidentsByAlertLevel(incidents);
}

export function parseNodeGuardDate(value: string) {
  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}+08:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function formatPhilippineDateTime(value: string) {
  const parsed = parseNodeGuardDate(value);
  if (parsed.getTime() === 0) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(parsed);
}

export function formatRelativeTime(value: string, now = Date.now()) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - parseNodeGuardDate(value).getTime()) / 1_000),
  );
  if (elapsedSeconds < 60) return "Just now";
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function getElapsedWaitingTime(incident: Incident, now = Date.now()) {
  if (isFinalIncident(incident.status) && incident.resolvedAt) {
    const minutes = Math.max(
      0,
      Math.floor(
        (parseNodeGuardDate(incident.resolvedAt).getTime() -
          parseNodeGuardDate(incident.timestamp).getTime()) /
          60_000,
      ),
    );
    return `${minutes} minute${minutes === 1 ? "" : "s"} to final status`;
  }
  return formatRelativeTime(incident.timestamp, now).replace(" ago", " waiting");
}

export function getOperationalMetrics(incidents: Incident[]) {
  return {
    pendingVerification: incidents.filter(
      (incident) => ["Reported", "Pending Validation", "Pending Verification"].includes(incident.status),
    ).length,
    awaitingDispatch: incidents.filter(
      (incident) =>
        ["Validated", "Verified"].includes(incident.status) && incident.assignedResponder === "Unassigned",
    ).length,
    activeResponses: incidents.filter((incident) =>
      activeResponseStatuses.includes(incident.status),
    ).length,
  };
}

export type IncidentAction =
  | "verify"
  | "false-alert"
  | "dispatch"
  | "confirm-dispatch"
  | "reassign"
  | "remove-assignment"
  | "start-response"
  | "mark-on-scene"
  | "resolve"
  | "escalate"
  | "acknowledge-escalation"
  | "close";

export function getValidIncidentActions(incident: Incident): IncidentAction[] {
  switch (incident.status) {
    case "Reported":
    case "Pending Validation":
    case "Pending Verification":
      return ["verify", "false-alert"];
    case "Validated":
    case "Verified":
      return ["dispatch", "false-alert", "escalate"];
    case "Assigned":
      return ["confirm-dispatch", "reassign", "remove-assignment", "escalate"];
    case "Dispatched":
      return ["reassign", "remove-assignment", "start-response", "mark-on-scene", "escalate"];
    case "Escalated":
      return ["acknowledge-escalation"];
    case "Coordinated by LT-MDRRMO":
      return ["reassign", "start-response", "mark-on-scene"];
    case "Unable to Respond":
      return ["dispatch", "reassign", "remove-assignment", "escalate"];
    case "Responding":
      return ["reassign", "remove-assignment", "mark-on-scene", "resolve"];
    case "On Scene":
      return ["reassign", "remove-assignment", "resolve"];
    case "Resolved":
      return ["close"];
    case "Closed":
    case "Cancelled":
    case "False Alert":
      return [];
  }
}
