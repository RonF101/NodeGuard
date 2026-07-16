"use client";

import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import NetworkCheckOutlinedIcon from "@mui/icons-material/NetworkCheckOutlined";
import SensorsOffOutlinedIcon from "@mui/icons-material/SensorsOffOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { appHeaderHeight } from "@/components/Header";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import { mdrrmoPalette } from "@/theme/theme";

export const connectivityBarHeight = 48;

type ConnectivityBarProps = {
  systemHealthy: boolean;
  unavailableNodes: number;
};

export function ConnectivityBar({ systemHealthy, unavailableNodes }: ConnectivityBarProps) {
  const { mode } = useConnectivity();
  const disconnected = mode === "offline" || !systemHealthy;
  const lowBandwidth = mode === "low-bandwidth";
  const multipleUnavailable = unavailableNodes >= 2;
  if (!disconnected && !lowBandwidth && !multipleUnavailable) return null;

  const Icon = disconnected ? CloudOffOutlinedIcon : lowBandwidth ? NetworkCheckOutlinedIcon : SensorsOffOutlinedIcon;
  const label = disconnected
    ? "System connection unavailable"
    : lowBandwidth
      ? "Low-bandwidth mode active"
      : `${unavailableNodes} NodeGuard nodes unavailable`;
  const helper = disconnected
    ? "Local drafts remain available; dispatch commands wait for a verified connection."
    : lowBandwidth
      ? "Automatic refresh is reduced and heavy map or media content is minimized."
      : "Review device connectivity and maintenance status on the Nodes page.";

  return (
    <Box role="alert" sx={{ position: "fixed", zIndex: (theme) => theme.zIndex.drawer + 1, top: appHeaderHeight, left: 0, right: 0, minHeight: connectivityBarHeight, px: { xs: 1.5, md: 3 }, bgcolor: disconnected ? mdrrmoPalette.goRedSoft : "#FFF4D6", color: mdrrmoPalette.navy, borderBottom: `1px solid ${disconnected ? mdrrmoPalette.alertRed : "#D8A400"}` }}>
      <Stack direction="row" spacing={1} sx={{ minHeight: connectivityBarHeight, alignItems: "center" }}>
        <Icon color={disconnected ? "error" : "warning"} fontSize="small" />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{label}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }} noWrap>{helper}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}
