import Chip from "@mui/material/Chip";
import { IncidentStatus, ResponderStatus, ResourceStatus } from "@/types";
import { mdrrmoPalette } from "@/theme/theme";

type StatusChipProps = {
  status: IncidentStatus | ResponderStatus | ResourceStatus | "Active" | "Disabled" | "Online" | "Maintenance";
  size?: "small" | "medium";
};

const statusColors: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "#FFF4D6", color: "#7A5200" },
  Verified: { bg: "#E8F2ED", color: mdrrmoPalette.darkGreen },
  Dispatched: { bg: "#FFE7D6", color: "#9A4A12" },
  Responding: { bg: "#E3F2FD", color: "#0D47A1" },
  Resolved: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Closed: { bg: "#ECEFF1", color: "#455A64" },
  Available: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Busy: { bg: "#FFF4D6", color: "#7A5200" },
  Offline: { bg: "#ECEFF1", color: "#455A64" },
  "Under Maintenance": { bg: "#FFEBEE", color: mdrrmoPalette.alertRed },
  Unavailable: { bg: "#FFEBEE", color: mdrrmoPalette.alertRed },
  Reserved: { bg: "#FFF4D6", color: "#7A5200" },
  Active: { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  Disabled: { bg: "#FFEBEE", color: mdrrmoPalette.alertRed },
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
