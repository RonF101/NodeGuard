"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { mdrrmoPalette } from "@/theme/theme";

type HeaderProps = {
  onMenuClick: () => void;
  operatorName: string;
  roleLabel: string;
  onLogout: () => void;
};

export const appHeaderHeight = 64;

function formatManilaTime() {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date());
}

function subscribeToClock(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 30000);
  return () => window.clearInterval(interval);
}

export function Header({
  onMenuClick,
  operatorName,
  roleLabel,
  onLogout,
}: HeaderProps) {
  const now = useSyncExternalStore(
    subscribeToClock,
    formatManilaTime,
    () => "Asia/Manila",
  );

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
      <Toolbar
        sx={{
          minHeight: `${appHeaderHeight}px !important`,
          gap: { xs: 0.5, sm: 2 },
          px: { xs: 1, sm: 2 },
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { md: "none" } }}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </IconButton>
        <Box
          sx={{
            width: 42,
            height: 42,
            "@media (max-width:300px)": { display: "none" },
            borderRadius: "50%",
            bgcolor: "white",
            overflow: "hidden",
            flexShrink: 0,
            border: "2px solid rgba(255,255,255,0.65)",
            position: "relative",
          }}
        >
          <Image
            src="/mdrrmc-logo.png"
            alt="La Trinidad MDRRMC logo"
            fill
            sizes="42px"
            style={{ objectFit: "contain" }}
            priority
          />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
            NodeGuard Emergency Operations
          </Typography>
          <Typography variant="subtitle1" noWrap sx={{ display: { xs: "block", sm: "none" }, fontWeight: 900 }}>
            NodeGuard
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            La Trinidad MDRRMO Emergency Coordination Dashboard
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2" sx={{ display: { xs: "none", lg: "block" }, fontWeight: 700 }}>
            {now}
          </Typography>
          <Chip
            label={roleLabel}
            size="small"
            sx={{ display: { xs: "none", sm: "flex" }, bgcolor: "rgba(255,255,255,0.14)", color: "white" }}
          />
          <IconButton
            color="inherit"
            onClick={onLogout}
            aria-label={`Sign out ${operatorName}`}
            title={`Sign out ${operatorName}`}
          >
            <LogoutIcon />
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
