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
import type { Incident, IncidentPriority, IncidentStatus } from "@/types";

type StatusConfiguration = {
  label: IncidentStatus;
  order: number;
  color: string;
  background: string;
  icon: SvgIconComponent;
};

type PriorityConfiguration = {
  label: IncidentPriority;
  order: number;
  color: string;
  background: string;
};

export const incidentStatusOrder: IncidentStatus[] = [
  "Pending Verification",
  "Verified",
  "Dispatched",
  "Responding",
  "On Scene",
  "Resolved",
  "Closed",
  "False Alert",
];

export const incidentStatusConfig = {
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
  Responding: {
    label: "Responding",
    order: 3,
    color: mdrrmoPalette.setBlueDark,
    background: "#DDEBFF",
    icon: CrisisAlertIcon,
  },
  "On Scene": {
    label: "On Scene",
    order: 4,
    color: mdrrmoPalette.setBlueDark,
    background: "#DDEBFF",
    icon: PinDropOutlinedIcon,
  },
  Resolved: {
    label: "Resolved",
    order: 5,
    color: mdrrmoPalette.successGreen,
    background: "#E7F4E8",
    icon: TaskAltOutlinedIcon,
  },
  Closed: {
    label: "Closed",
    order: 6,
    color: "#455A64",
    background: "#ECEFF1",
    icon: LockOutlinedIcon,
  },
  "False Alert": {
    label: "False Alert",
    order: 7,
    color: "#455A64",
    background: "#ECEFF1",
    icon: ReportOffOutlinedIcon,
  },
} satisfies Record<IncidentStatus, StatusConfiguration>;

export const priorityOrder: IncidentPriority[] = [
  "Critical",
  "High",
  "Moderate",
  "Low",
];

export const incidentPriorityConfig = {
  Critical: {
    label: "Critical",
    order: 0,
    color: mdrrmoPalette.alertRed,
    background: mdrrmoPalette.goRedSoft,
  },
  High: {
    label: "High",
    order: 1,
    color: "#7A5200",
    background: "#FFF4D6",
  },
  Moderate: {
    label: "Moderate",
    order: 2,
    color: mdrrmoPalette.setBlueDark,
    background: mdrrmoPalette.setBlueSoft,
  },
  Low: {
    label: "Low",
    order: 3,
    color: "#455A64",
    background: "#ECEFF1",
  },
} satisfies Record<IncidentPriority, PriorityConfiguration>;

export const finalIncidentStatuses: IncidentStatus[] = [
  "Resolved",
  "Closed",
  "False Alert",
];

export const activeResponseStatuses: IncidentStatus[] = [
  "Dispatched",
  "Responding",
  "On Scene",
];

export function isFinalIncident(status: IncidentStatus) {
  return finalIncidentStatuses.includes(status);
}

export function sortIncidentQueue(incidents: Incident[]) {
  return incidents.toSorted((a, b) => {
    const orderDifference =
      incidentStatusConfig[a.status].order - incidentStatusConfig[b.status].order;
    if (orderDifference !== 0) return orderDifference;
    return parseNodeGuardDate(a.timestamp).getTime() - parseNodeGuardDate(b.timestamp).getTime();
  });
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
      (incident) => incident.status === "Pending Verification",
    ).length,
    awaitingDispatch: incidents.filter(
      (incident) =>
        incident.status === "Verified" && incident.assignedResponder === "Unassigned",
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
  | "reassign"
  | "remove-assignment"
  | "start-response"
  | "mark-on-scene"
  | "resolve"
  | "close";

export function getValidIncidentActions(incident: Incident): IncidentAction[] {
  switch (incident.status) {
    case "Pending Verification":
      return ["verify", "false-alert"];
    case "Verified":
      return ["dispatch", "false-alert"];
    case "Dispatched":
      return ["reassign", "remove-assignment", "start-response", "mark-on-scene"];
    case "Responding":
      return ["reassign", "remove-assignment", "mark-on-scene", "resolve"];
    case "On Scene":
      return ["reassign", "remove-assignment", "resolve"];
    case "Resolved":
      return ["close"];
    case "Closed":
    case "False Alert":
      return [];
  }
}
