"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import { nodeGuardRoleColors } from "@/theme/theme";

type HeaderProps = {
  onMenuClick: () => void;
  operatorName: string;
  roleLabel: string;
  dashboardTitle: string;
  organizationName: string;
  onLogout?: () => void;
  publicDemo?: boolean;
  systemHealthy: boolean;
  lastSynced: Date | null;
  nodeHealth: { online: number; total: number };
  environment: "barangay" | "mdrrmo";
  attentionCount: number;
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
  dashboardTitle,
  organizationName,
  onLogout,
  publicDemo = false,
  systemHealthy,
  lastSynced,
  nodeHealth,
  environment,
  attentionCount,
}: HeaderProps) {
  const { online, manualLowBandwidth, setManualLowBandwidth } = useConnectivity();
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const connected = online && systemHealthy;
  const nodeLabel = `${nodeHealth.online} of ${nodeHealth.total} nodes online`;
  const lowBandwidthHelp = "Low-bandwidth mode reduces automatic refresh frequency, disables map animations, and minimizes heavy visual content.";
  const roleColors = nodeGuardRoleColors[environment];
  const notificationsHref = environment === "barangay" ? "/barangay/notifications" : "/mdrrmo/escalated-incidents";

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: roleColors.dark,
        borderBottom: `3px solid ${roleColors.primary}`,
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
          <Typography variant="h6" noWrap sx={{ display: { xs: "none", md: "block" } }}>{dashboardTitle}</Typography>
          <Typography variant="subtitle1" noWrap sx={{ display: { xs: "block", md: "none" }, fontWeight: 900 }}>NodeGuard</Typography>
          <Typography variant="caption" noWrap sx={{ display: { xs: "block", md: "none" }, color: "rgba(255,255,255,0.78)" }}>
            {connected ? "Connected" : "Disconnected"} · {nodeHealth.online}/{nodeHealth.total} nodes
          </Typography>
          <Typography variant="caption" noWrap sx={{ display: { xs: "none", md: "block" }, color: "rgba(255,255,255,0.78)" }}>{organizationName} · {roleLabel}</Typography>
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

        <Tooltip title={`${attentionCount} notification${attentionCount === 1 ? "" : "s"} requiring attention`}>
          <IconButton component={Link} href={notificationsHref} color="inherit" aria-label={`Open notifications. ${attentionCount} requiring attention.`}>
            <Badge badgeContent={attentionCount} color="error" max={99}><NotificationsOutlinedIcon /></Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title={`Open profile and system menu for ${operatorName}`}>
          <IconButton color="inherit" onClick={(event) => setProfileAnchor(event.currentTarget)} aria-label={`Open profile and system menu for ${operatorName}`} aria-haspopup="menu" aria-expanded={Boolean(profileAnchor)}>
            <AccountCircleOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)} slotProps={{ paper: { sx: { width: 300, maxWidth: "calc(100vw - 24px)" } } }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>{operatorName}</Typography>
            <Typography variant="body2" color="text.secondary">{roleLabel}</Typography>
            <Typography variant="caption" color="text.secondary">{organizationName}</Typography>
          </Box>
          {publicDemo && <Box sx={{ px: 2, pb: 1 }}><Chip label="Public Demo" color="info" size="small" /></Box>}
          <MenuItem disableRipple sx={{ cursor: "default", whiteSpace: "normal" }}>
            <FormControlLabel
              sx={{ m: 0, width: "100%" }}
              control={<Switch checked={manualLowBandwidth} onChange={(event) => setManualLowBandwidth(event.target.checked)} slotProps={{ input: { "aria-label": "Use low-bandwidth mode" } }} />}
              label={<Box><Typography variant="body2" sx={{ fontWeight: 700 }}>Low-bandwidth mode</Typography><Typography variant="caption" color="text.secondary">{lowBandwidthHelp}</Typography></Box>}
            />
          </MenuItem>
          {onLogout && <MenuItem onClick={() => { setProfileAnchor(null); void onLogout(); }}><LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />Sign out</MenuItem>}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
