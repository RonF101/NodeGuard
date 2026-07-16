import Chip from "@mui/material/Chip";
import { incidentPriorityConfig } from "@/config/incidentOperations";
import type { IncidentPriority } from "@/types";

type PriorityChipProps = {
  priority: IncidentPriority;
  size?: "small" | "medium";
};

export function PriorityChip({ priority, size = "small" }: PriorityChipProps) {
  const configuration = incidentPriorityConfig[priority];
  return (
    <Chip
      label={configuration.label}
      size={size}
      variant="outlined"
      sx={{
        bgcolor: configuration.background,
        borderColor: `${configuration.color}55`,
        color: configuration.color,
        borderRadius: 1,
        minWidth: 76,
      }}
    />
  );
}
