import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Chip from "@mui/material/Chip";
import { getValidationResultLabel } from "@/config/incidentOperations";
import { nodeGuardSemanticColors } from "@/theme/theme";
import type { EscalationStatus, SmsDeliveryStatus, ValidationResult } from "@/types";

type OperationalChipProps =
  | { kind: "validation"; value: ValidationResult }
  | { kind: "escalation"; value: EscalationStatus }
  | { kind: "node"; value: string }
  | { kind: "sms"; value: SmsDeliveryStatus };

export function OperationalChip({ kind, value }: OperationalChipProps) {
  const normalized = value.toLowerCase();
  const success = ["validated", "delivered", "healthy", "online", "completed", "acknowledged"].some((token) => normalized.includes(token));
  const danger = ["failed", "offline", "false", "fraudulent", "hoax", "prank"].some((token) => normalized.includes(token));
  const active = ["sent", "retrying", "coordinating"].some((token) => normalized.includes(token));
  const colors = success
    ? nodeGuardSemanticColors.success
    : danger
      ? nodeGuardSemanticColors.critical
      : active
        ? nodeGuardSemanticColors.active
        : nodeGuardSemanticColors.warning;
  const Icon = kind === "node"
    ? SensorsOutlinedIcon
    : danger
      ? ErrorOutlineIcon
      : success
        ? CheckCircleOutlineIcon
        : active
          ? HourglassTopOutlinedIcon
          : WarningAmberOutlinedIcon;
  const label = kind === "validation"
    ? getValidationResultLabel(value)
    : kind === "sms"
      ? `SMS: ${value}`
      : kind === "node"
        ? `Node: ${value}`
        : value;

  return (
    <Chip
      size="small"
      icon={<Icon aria-hidden="true" fontSize="small" />}
      label={label}
      aria-label={`${kind} state: ${label}`}
      sx={{ bgcolor: colors.soft, color: colors.text, "& .MuiChip-icon": { color: "inherit" } }}
    />
  );
}
