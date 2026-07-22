import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Stack role="status" spacing={1} sx={{ minHeight: 150, alignItems: "center", justifyContent: "center", p: 3, textAlign: "center" }}>
      <InboxOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Stack>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" icon={<ErrorOutlineIcon />} action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined}>
      {message}
    </Alert>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Box role="status" aria-label="Loading operational data" sx={{ py: 1 }}>
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} height={56} sx={{ mb: 1 }} />)}
    </Box>
  );
}
