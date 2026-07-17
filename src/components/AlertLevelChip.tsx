import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { alertLevelConfig } from "@/config/alertLevels";
import type { AlertLevel } from "@/types";

type AlertLevelChipProps = {
  alertLevel: AlertLevel;
  size?: "small" | "medium";
};

export function AlertLevelChip({ alertLevel, size = "small" }: AlertLevelChipProps) {
  const configuration = alertLevelConfig[alertLevel];
  const Icon = configuration.icon;
  return (
    <Tooltip title={configuration.description} arrow>
      <Chip
        label={configuration.label}
        icon={<Icon aria-hidden="true" />}
        size={size}
        variant="outlined"
        aria-label={`${configuration.label} alert level. ${configuration.description}`}
        sx={{
          bgcolor: configuration.background,
          borderColor: `${configuration.color}55`,
          color: configuration.color,
          borderRadius: 1,
          minWidth: 104,
          fontWeight: 800,
          "& .MuiChip-icon": { color: configuration.color },
        }}
      />
    </Tooltip>
  );
}
