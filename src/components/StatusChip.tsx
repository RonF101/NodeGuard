import Chip from "@mui/material/Chip";
import { IncidentStatus, ResponderStatus, ResourceStatus } from "@/types";
import { mdrrmoPalette } from "@/theme/theme";

type StatusChipProps = {
  status: IncidentStatus | ResponderStatus | ResourceStatus | "Active" | "Disabled" | "Online" | "Maintenance";
  size?: "small" | "medium";
};

const statusColors: Record<string, { bg: string; color: string }> = {
  "New Alert": { bg: mdrrmoPalette.setBlueSoft, color: mdrrmoPalette.setBlueDark },
  Assigned: { bg: mdrrmoPalette.setBlueSoft, color: mdrrmoPalette.setBlueDark },
  "En Route": { bg: mdrrmoPalette.setBlueSoft, color: mdrrmoPalette.setBlue },
  "On Scene": { bg: mdrrmoPalette.goRedSoft, color: mdrrmoPalette.goRed },
  Responding: { bg: mdrrmoPalette.goRedSoft, color: mdrrmoPalette.goRed },
  Resolved: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Closed: { bg: "#ECEFF1", color: "#455A64" },
  "Need Backup": { bg: "#FFEBEE", color: mdrrmoPalette.alertRed },
  "False Alert": { bg: "#ECEFF1", color: "#455A64" },
  Available: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Dispatched: { bg: mdrrmoPalette.setBlueSoft, color: mdrrmoPalette.setBlue },
  Busy: { bg: mdrrmoPalette.setBlueSoft, color: mdrrmoPalette.setBlueDark },
  Offline: { bg: "#ECEFF1", color: "#455A64" },
  "Under Maintenance": { bg: "#ECEFF1", color: "#455A64" },
  Unavailable: { bg: "#ECEFF1", color: "#455A64" },
  Reserved: { bg: "#FFF4D6", color: "#7A5200" },
  Active: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Disabled: { bg: "#ECEFF1", color: "#455A64" },
  Online: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Maintenance: { bg: "#FFF4D6", color: "#7A5200" }
};

export function StatusChip({ status, size = "small" }: StatusChipProps) {
  const colors = statusColors[status] ?? { bg: "#ECEFF1", color: "#455A64" };

  return (
    <Chip
      label={status}
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.color,
        borderRadius: 1
      }}
    />
  );
}
