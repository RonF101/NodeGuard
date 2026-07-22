import Link from "next/link";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@/components/OperationalFeedback";
import { nodeGuardSemanticColors } from "@/theme/theme";

export type AttentionQueueItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  href: string;
  action: string;
  urgency: "critical" | "high" | "warning" | "normal";
};

const tones = {
  critical: nodeGuardSemanticColors.critical.main,
  high: nodeGuardSemanticColors.high.main,
  warning: nodeGuardSemanticColors.warning.main,
  normal: nodeGuardSemanticColors.active.main,
};

export function AttentionQueue({ items, emptyMessage }: { items: AttentionQueueItem[]; emptyMessage: string }) {
  if (!items.length) return <EmptyState title="No immediate attention required" description={emptyMessage} />;
  return (
    <Stack spacing={1.25}>
      {items.map((item) => (
        <Box key={item.id} component="article" sx={{ borderLeft: "4px solid", borderColor: tones[item.urgency], bgcolor: "background.default", borderRadius: 1, p: 1.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{item.detail}</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">{item.meta}</Typography>
            <Button component={Link} href={item.href} size="small" variant="text" endIcon={<ArrowForwardOutlinedIcon />} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>{item.action}</Button>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
