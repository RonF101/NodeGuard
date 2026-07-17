"use client";

import Image from "next/image";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import NetworkCheckOutlinedIcon from "@mui/icons-material/NetworkCheckOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import { mdrrmoPalette } from "@/theme/theme";

type HeaderProps = {
  onMenuClick: () => void;
  operatorName: string;
  roleLabel: string;
  onLogout?: () => void;
  publicDemo?: boolean;
  systemHealthy: boolean;
  lastSynced: Date | null;
  nodeHealth: { online: number; total: number };
};

export const appHeaderHeight = 64;

function formatSyncTime(value: Date | null) {
  if (!value) return "Waiting for sync";
  return `Last synced: ${new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(value)}`;
}

export function Header({
  onMenuClick,
  operatorName,
  roleLabel,
  onLogout,
  publicDemo = false,
  systemHealthy,
  lastSynced,
  nodeHealth,
}: HeaderProps) {
  const { online, manualLowBandwidth, setManualLowBandwidth } = useConnectivity();
  const connected = online && systemHealthy;
  const nodeLabel = `${nodeHealth.online} of ${nodeHealth.total} nodes online`;
  const lowBandwidthHelp = "Low-bandwidth mode reduces automatic refresh frequency, disables map animations, and minimizes heavy visual content.";

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: mdrrmoPalette.setBlueDark,
        borderBottom: `3px solid ${mdrrmoPalette.setBlue}`,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ minHeight: `${appHeaderHeight}px !important`, gap: { xs: 0.25, sm: 1, lg: 1.5 }, px: { xs: 0.75, sm: 1.5 } }}>
        <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ display: { md: "none" } }} aria-label="Open navigation">
          <MenuIcon />
        </IconButton>
        <Box sx={{ width: 40, height: 40, display: { xs: "none", sm: "block" }, borderRadius: "50%", bgcolor: "white", overflow: "hidden", flexShrink: 0, border: "2px solid rgba(255,255,255,0.65)", position: "relative" }}>
          <Image src="/mdrrmc-logo.png" alt="La Trinidad MDRRMC logo" fill sizes="40px" style={{ objectFit: "contain" }} priority />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ display: { xs: "none", md: "block" } }}>NodeGuard Emergency Operations</Typography>
          <Typography variant="subtitle1" noWrap sx={{ display: { xs: "block", md: "none" }, fontWeight: 900 }}>NodeGuard</Typography>
          <Typography variant="caption" noWrap sx={{ display: { xs: "block", md: "none" }, color: "rgba(255,255,255,0.78)" }}>
            {connected ? "Connected" : "Disconnected"} · {nodeHealth.online}/{nodeHealth.total} nodes
          </Typography>
          <Typography variant="caption" noWrap sx={{ display: { xs: "none", md: "block" }, color: "rgba(255,255,255,0.78)" }}>La Trinidad MDRRMO</Typography>
        </Box>

        <Stack direction="row" spacing={1.25} sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center" }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} role="status" aria-live="polite">
            {connected ? <CloudDoneOutlinedIcon sx={{ color: "#8EE0B0" }} /> : <CloudOffOutlinedIcon sx={{ color: "#FFB4AB" }} />}
            <Box>
              <Typography variant="caption" sx={{ display: "block", fontWeight: 900, lineHeight: 1.2 }}>{connected ? "System Connected" : "System Disconnected"}</Typography>
              <Typography variant="caption" sx={{ display: "block", color: "rgba(255,255,255,0.72)", lineHeight: 1.2 }}>{formatSyncTime(lastSynced)}</Typography>
            </Box>
          </Stack>
          <Chip icon={<SensorsOutlinedIcon />} label={nodeLabel} size="small" sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white", "& .MuiChip-icon": { color: "inherit" } }} />
        </Stack>
        <Stack direction="row" spacing={0.25} sx={{ display: { xs: "none", md: "flex", lg: "none" }, alignItems: "center" }}>
          <Tooltip title={`${connected ? "System Connected" : "System Disconnected"}. ${formatSyncTime(lastSynced)}`}>
            <Box role="status" aria-label={`${connected ? "System connected" : "System disconnected"}. ${formatSyncTime(lastSynced)}`} sx={{ width: 48, height: 48, display: "grid", placeItems: "center" }}>
              {connected ? <CloudDoneOutlinedIcon sx={{ color: "#8EE0B0" }} /> : <CloudOffOutlinedIcon sx={{ color: "#FFB4AB" }} />}
            </Box>
          </Tooltip>
          <Tooltip title={nodeLabel}>
            <Chip icon={<SensorsOutlinedIcon />} label={`${nodeHealth.online}/${nodeHealth.total}`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white", "& .MuiChip-icon": { color: "inherit" } }} />
          </Tooltip>
        </Stack>

        <Tooltip title={lowBandwidthHelp} arrow>
          <FormControlLabel
            sx={{ display: { xs: "none", sm: "flex" }, m: 0, minHeight: 48, color: "white", "& .MuiFormControlLabel-label": { display: { sm: "none", xl: "block" } } }}
            control={<Switch size="small" checked={manualLowBandwidth} onChange={(event) => setManualLowBandwidth(event.target.checked)} slotProps={{ input: { "aria-label": "Use low-bandwidth mode" } }} />}
            label="Low-bandwidth mode"
          />
        </Tooltip>
        <Tooltip title={`${manualLowBandwidth ? "Disable" : "Enable"} low-bandwidth mode. ${lowBandwidthHelp}`} arrow>
          <IconButton color="inherit" onClick={() => setManualLowBandwidth(!manualLowBandwidth)} sx={{ display: { xs: "inline-flex", sm: "none" } }} aria-label={`${manualLowBandwidth ? "Disable" : "Enable"} low-bandwidth mode`}>
            <NetworkCheckOutlinedIcon color={manualLowBandwidth ? "primary" : "inherit"} />
          </IconButton>
        </Tooltip>
        <Chip
          label={publicDemo ? "Public Demo" : roleLabel}
          size="small"
          sx={{
            display: { xs: "none", xl: "flex" },
            bgcolor: publicDemo ? "rgba(144, 202, 249, 0.24)" : "rgba(255,255,255,0.14)",
            color: "white",
          }}
        />
        {onLogout && (
          <Tooltip title={`Sign out ${operatorName}`}>
            <IconButton color="inherit" onClick={onLogout} aria-label={`Sign out ${operatorName}`}><LogoutIcon /></IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  );
}
