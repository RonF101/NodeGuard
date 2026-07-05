"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupIcon from "@mui/icons-material/Group";
import MapIcon from "@mui/icons-material/Map";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BrandLogo } from "@/components/BrandLogo";
import { mdrrmoPalette } from "@/theme/theme";

export const drawerWidth = 280;

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Live Alerts", href: "/alerts", icon: <NotificationsActiveIcon /> },
  { label: "Incident Map", href: "/map", icon: <MapIcon /> },
  { label: "Responders & Resources", href: "/responders", icon: <PeopleAltIcon /> },
  { label: "Reports", href: "/reports", icon: <DescriptionIcon /> },
  { label: "Analytics", href: "/analytics", icon: <AnalyticsIcon /> },
  { label: "Users", href: "/users", icon: <GroupIcon /> },
  { label: "Settings", href: "/settings", icon: <SettingsIcon /> }
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        height: "100%",
        bgcolor: mdrrmoPalette.darkGreen,
        color: "white",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Box sx={{ p: 2.5, bgcolor: "rgba(0,0,0,0.12)" }}>
        <BrandLogo compact />
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.15)" }} />
      <List sx={{ p: 1.5 }}>
        {navItems.map((item) => {
          const selected = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={onNavigate}
              selected={selected}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: "white",
                "&.Mui-selected": {
                  bgcolor: mdrrmoPalette.orange,
                  color: "white"
                },
                "&.Mui-selected:hover": {
                  bgcolor: mdrrmoPalette.orange
                },
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.12)"
                }
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{item.icon}</ListItemIcon>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {item.label}
              </Typography>
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Stack spacing={1} sx={{ p: 2.5, bgcolor: "rgba(0,0,0,0.15)" }}>
        <Typography variant="caption" sx={{ color: mdrrmoPalette.cream, fontWeight: 800 }}>
          Internal Workspace
        </Typography>
        <Typography variant="body2">MDRRMC Bldg., Km. 5 Pico</Typography>
        <Typography variant="body2">Authorized MDRRMO personnel only</Typography>
      </Stack>
    </Box>
  );
}
