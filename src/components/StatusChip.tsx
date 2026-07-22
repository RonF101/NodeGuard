import Chip from "@mui/material/Chip";
import { IncidentStatus, ResponderStatus, ResourceStatus } from "@/types";
import { mdrrmoPalette } from "@/theme/theme";
import { getIncidentStatusLabel, incidentStatusConfig } from "@/config/incidentOperations";

type StatusChipProps = {
  status: IncidentStatus | ResponderStatus | ResourceStatus | "Active" | "Disabled" | "Online" | "Maintenance";
  size?: "small" | "medium";
};

const statusColors: Record<string, { bg: string; color: string }> = {
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
  const incidentConfiguration = incidentStatusConfig[status as IncidentStatus];
  const colors = incidentConfiguration
    ? { bg: incidentConfiguration.background, color: incidentConfiguration.color }
    : statusColors[status] ?? { bg: "#ECEFF1", color: "#455A64" };
  const Icon = incidentConfiguration?.icon;
  const displayLabel = incidentConfiguration
    ? getIncidentStatusLabel(status as IncidentStatus)
    : status;

  return (
    <Chip
      label={displayLabel}
      icon={Icon ? <Icon aria-hidden fontSize="small" /> : undefined}
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.color,
        borderRadius: 1,
        "& .MuiChip-icon": { color: "inherit" },
      }}
    />
  );
}
