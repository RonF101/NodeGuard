"use client";

import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import NetworkCheckOutlinedIcon from "@mui/icons-material/NetworkCheckOutlined";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import { mdrrmoPalette } from "@/theme/theme";

export const connectivityBarHeight = 48;

export function ConnectivityBar() {
  const { mode, manualLowBandwidth, setManualLowBandwidth } = useConnectivity();
  const offline = mode === "offline";
  const low = mode === "low-bandwidth";
  const Icon = offline ? CloudOffOutlinedIcon : low ? NetworkCheckOutlinedIcon : CloudDoneOutlinedIcon;
  const label = offline ? "Offline · Local Sync" : low ? "Low-Bandwidth Mode" : "Online · Synced";
  const helper = offline
    ? "Forms save locally; dispatch commands wait for network."
    : low
      ? "Remote media and map tiles are deferred."
      : "Live operational data is available.";

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "fixed",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        top: 64,
        left: 0,
        right: 0,
        minHeight: connectivityBarHeight,
        px: { xs: 1.5, md: 3 },
        bgcolor: offline ? mdrrmoPalette.readyWhite : mdrrmoPalette.setBlueSoft,
        color: mdrrmoPalette.navy,
        borderBottom: `1px solid ${mdrrmoPalette.border}`,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ minHeight: connectivityBarHeight, alignItems: "center" }}>
        <Icon color="primary" fontSize="small" />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{label}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }} noWrap>
            {helper}
          </Typography>
        </Box>
        <FormControlLabel
          sx={{ m: 0, minHeight: 48 }}
          control={
            <Switch
              checked={manualLowBandwidth}
              onChange={(event) => setManualLowBandwidth(event.target.checked)}
              disabled={offline}
              slotProps={{ input: { "aria-label": "Use low-bandwidth mode" } }}
            />
          }
          label={<Typography variant="body2" sx={{ display: { xs: "none", sm: "block" }, fontWeight: 800 }}>Low bandwidth</Typography>}
        />
      </Stack>
    </Box>
  );
}
