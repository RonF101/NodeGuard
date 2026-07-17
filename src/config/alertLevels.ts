import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import PriorityHighOutlinedIcon from "@mui/icons-material/PriorityHighOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { AlertLevel, Incident } from "@/types";
import { mdrrmoPalette } from "@/theme/theme";

export type AlertLevelConfiguration = {
  value: AlertLevel;
  label: AlertLevel;
  rank: number;
  sortingPriority: number;
  color: string;
  background: string;
  icon: SvgIconComponent;
  description: string;
};

export const alertLevelOrder: AlertLevel[] = [
  "Unassessed",
  "Critical",
  "High",
  "Moderate",
  "Low",
];

export const alertLevelConfig = {
  Unassessed: {
    value: "Unassessed",
    label: "Unassessed",
    rank: 5,
    sortingPriority: 0,
    color: "#6B4F00",
    background: "#FFF4D6",
    icon: HelpOutlineOutlinedIcon,
    description: "Received and awaiting an authorized urgency assessment.",
  },
  Critical: {
    value: "Critical",
    label: "Critical",
    rank: 4,
    sortingPriority: 1,
    color: mdrrmoPalette.alertRed,
    background: mdrrmoPalette.goRedSoft,
    icon: ErrorOutlineOutlinedIcon,
    description: "Immediate threat to life or rapidly escalating danger.",
  },
  High: {
    value: "High",
    label: "High",
    rank: 3,
    sortingPriority: 2,
    color: "#9A4B00",
    background: "#FFF0D5",
    icon: ReportProblemOutlinedIcon,
    description: "Urgent intervention is required for a serious situation.",
  },
  Moderate: {
    value: "Moderate",
    label: "Moderate",
    rank: 2,
    sortingPriority: 3,
    color: mdrrmoPalette.setBlueDark,
    background: mdrrmoPalette.setBlueSoft,
    icon: PriorityHighOutlinedIcon,
    description: "Timely attention is required without an immediate life threat.",
  },
  Low: {
    value: "Low",
    label: "Low",
    rank: 1,
    sortingPriority: 4,
    color: "#2E6B3A",
    background: "#E7F4E8",
    icon: KeyboardArrowDownOutlinedIcon,
    description: "Minor or controlled situation requiring routine coordination.",
  },
} satisfies Record<AlertLevel, AlertLevelConfiguration>;

export function compareAlertLevels(a: AlertLevel, b: AlertLevel) {
  return alertLevelConfig[b].rank - alertLevelConfig[a].rank;
}

export function compareReportedNewestFirst(a: Incident, b: Incident) {
  const timeDifference = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  return timeDifference || a.id.localeCompare(b.id);
}

export function sortIncidentsByAlertLevel(incidents: Incident[], reverse = false) {
  return incidents.toSorted((a, b) => {
    const levelDifference = compareAlertLevels(a.alertLevel, b.alertLevel);
    if (levelDifference !== 0) return reverse ? -levelDifference : levelDifference;
    return compareReportedNewestFirst(a, b);
  });
}

export function mapDatabaseAlertLevel(value: string | null | undefined): AlertLevel {
  switch (value) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Moderate";
    case "low":
      return "Low";
    case "unassessed":
    default:
      return "Unassessed";
  }
}

export function mapAlertLevelToDatabase(value: AlertLevel) {
  switch (value) {
    case "Unassessed":
      return "unassessed";
    case "Critical":
      return "critical";
    case "High":
      return "high";
    case "Moderate":
      return "medium";
    case "Low":
      return "low";
  }
}
