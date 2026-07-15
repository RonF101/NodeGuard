"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupIcon from "@mui/icons-material/Group";
import MapIcon from "@mui/icons-material/Map";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BrandLogo } from "@/components/BrandLogo";
import { mdrrmoPalette } from "@/theme/theme";

export const drawerWidth = 272;
export const collapsedDrawerWidth = 84;

type NavItem = { label: string; href: string; icon: ReactNode; adminOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
      { label: "Live Alerts", href: "/alerts", icon: <NotificationsActiveIcon /> },
      { label: "Responders & Resources", href: "/responders", icon: <PeopleAltIcon /> },
    ],
  },
  { label: "GIS & Mapping", items: [{ label: "Incident Map", href: "/map", icon: <MapIcon /> }] },
  {
    label: "Reporting",
    items: [
      { label: "Reports", href: "/reports", icon: <DescriptionIcon /> },
      { label: "Analytics", href: "/analytics", icon: <AnalyticsIcon /> },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/users", icon: <GroupIcon />, adminOnly: true },
      { label: "Settings", href: "/settings", icon: <SettingsIcon />, adminOnly: true },
    ],
  },
];

type SidebarProps = {
  role: string;
  collapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
};

export function Sidebar({ role, collapsed = false, mobile = false, onNavigate, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  return (
    <Box sx={{ height: "100%", bgcolor: mdrrmoPalette.navy, color: "white", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ minHeight: 72, p: collapsed ? 1.5 : 2, alignItems: "center", justifyContent: "space-between" }}>
        {collapsed ? (
          <Typography aria-label="NodeGuard" sx={{ width: "100%", textAlign: "center", fontWeight: 900, color: mdrrmoPalette.readyWhite }}>NG</Typography>
        ) : <BrandLogo compact />}
        {!mobile && !collapsed && (
          <IconButton color="inherit" onClick={onToggleCollapse} aria-label="Collapse navigation"><ChevronLeftIcon /></IconButton>
        )}
      </Stack>
      {collapsed && !mobile && (
        <IconButton color="inherit" onClick={onToggleCollapse} aria-label="Expand navigation" sx={{ alignSelf: "center", mb: 1 }}><ChevronRightIcon /></IconButton>
      )}
      <Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
      <Box sx={{ overflowY: "auto", px: 1.25, py: 1.5 }}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || ["admin", "super_admin"].includes(role));
          if (!visibleItems.length) return null;
          return (
            <Box key={group.label} sx={{ mb: 1.5 }}>
              {!collapsed && (
                <Typography variant="overline" sx={{ px: 1.25, color: "rgba(255,255,255,0.58)", fontWeight: 900, letterSpacing: "0.08em" }}>
                  {group.label}
                </Typography>
              )}
              <List disablePadding>
                {visibleItems.map((item) => {
                  const selected = pathname === item.href;
                  const button = (
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      onClick={onNavigate}
                      selected={selected}
                      aria-current={selected ? "page" : undefined}
                      sx={{
                        minHeight: 48,
                        borderRadius: 1.5,
                        mb: 0.5,
                        px: collapsed ? 1.6 : 1.25,
                        color: "rgba(255,255,255,0.86)",
                        justifyContent: collapsed ? "center" : "flex-start",
                        "&.Mui-selected, &.Mui-selected:hover": { bgcolor: mdrrmoPalette.setBlue, color: "white" },
                        "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                        "&:focus-visible": { outline: `3px solid ${mdrrmoPalette.readyWhite}`, outlineOffset: -3 },
                      }}
                    >
                      <ListItemIcon sx={{ color: "inherit", minWidth: collapsed ? 0 : 42, justifyContent: "center" }}>{item.icon}</ListItemIcon>
                      {!collapsed && <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.label}</Typography>}
                    </ListItemButton>
                  );
                  return collapsed ? <Tooltip title={item.label} placement="right" key={item.href}>{button}</Tooltip> : <Box key={item.href}>{button}</Box>;
                })}
              </List>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      {!collapsed && (
        <Stack spacing={0.5} sx={{ p: 2, bgcolor: "rgba(0,0,0,0.18)" }}>
          <Typography variant="caption" sx={{ color: mdrrmoPalette.setBlueSoft, fontWeight: 900 }}>Internal Workspace</Typography>
          <Typography variant="caption">MDRRMC Bldg., Km. 5 Pico</Typography>
          <Typography variant="caption">Authorized personnel only</Typography>
        </Stack>
      )}
    </Box>
  );
}
