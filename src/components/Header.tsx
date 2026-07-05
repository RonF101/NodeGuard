"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import ShieldIcon from "@mui/icons-material/Shield";
import { mdrrmoPalette } from "@/theme/theme";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const now = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date());

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: mdrrmoPalette.orange,
        borderBottom: `4px solid ${mdrrmoPalette.cream}`,
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { md: "none" } }}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </IconButton>
        <ShieldIcon />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            NodeGuard Emergency Operations
          </Typography>
          <Typography variant="caption" sx={{ display: { xs: "none", sm: "block" } }}>
            La Trinidad MDRRMO Emergency Coordination Dashboard
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {now}
          </Typography>
          <Chip label="Admin" size="small" sx={{ bgcolor: mdrrmoPalette.darkGreen, color: "white" }} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
