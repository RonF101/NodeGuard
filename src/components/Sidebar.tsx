"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import EmergencyShareOutlinedIcon from "@mui/icons-material/EmergencyShareOutlined";
import GroupIcon from "@mui/icons-material/Group";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import MapIcon from "@mui/icons-material/Map";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SensorsOutlinedIcon from "@mui/icons-material/SensorsOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { OperationalRole } from "@/types";
import { mdrrmoPalette } from "@/theme/theme";

export const drawerWidth = 264;
export const collapsedDrawerWidth = 76;

type NavItem = { label: string; href: string; icon: ReactNode; adminOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const barangayNav: NavGroup[] = [
  {
    label: "Barangay Operations",
    items: [
      { label: "Overview", href: "/barangay/overview", icon: <DashboardIcon /> },
      { label: "New Incident Report", href: "/barangay/new-incident", icon: <AssignmentOutlinedIcon /> },
      { label: "Incoming IoT Alerts", href: "/barangay/incoming-alerts", icon: <NotificationsActiveIcon /> },
      { label: "All Incidents", href: "/barangay/all-incidents", icon: <DescriptionIcon /> },
      { label: "Active Incidents", href: "/barangay/active-incidents", icon: <EmergencyShareOutlinedIcon /> },
      { label: "Assignments and Dispatch", href: "/barangay/dispatch", icon: <PeopleAltIcon /> },
    ],
  },
  {
    label: "Local Capacity",
    items: [
      { label: "Responders", href: "/barangay/responders", icon: <PeopleAltIcon /> },
      { label: "Resources", href: "/barangay/resources", icon: <Inventory2OutlinedIcon /> },
      { label: "Map", href: "/barangay/map", icon: <MapIcon /> },
      { label: "IoT Nodes", href: "/barangay/nodes", icon: <SensorsOutlinedIcon /> },
    ],
  },
  {
    label: "Records and Access",
    items: [
      { label: "Reports", href: "/barangay/reports", icon: <AssignmentOutlinedIcon /> },
      { label: "Notifications", href: "/barangay/notifications", icon: <NotificationsActiveIcon /> },
      { label: "Settings", href: "/barangay/settings", icon: <SettingsIcon />, adminOnly: true },
    ],
  },
];

const mdrrmoNav: NavGroup[] = [
  {
    label: "Municipal Operations",
    items: [
      { label: "Municipal Overview", href: "/mdrrmo/overview", icon: <DashboardIcon /> },
      { label: "New Incident Report", href: "/mdrrmo/new-incident", icon: <AssignmentOutlinedIcon /> },
      { label: "All Incidents", href: "/mdrrmo/all-incidents", icon: <DescriptionIcon /> },
      { label: "Active Incidents", href: "/mdrrmo/active-incidents", icon: <NotificationsActiveIcon /> },
      { label: "Assignments and Dispatch", href: "/mdrrmo/dispatch", icon: <PeopleAltIcon /> },
      { label: "Map", href: "/mdrrmo/map", icon: <MapIcon /> },
    ],
  },
  {
    label: "Barangay Coordination",
    items: [
      { label: "Barangay Monitoring", href: "/mdrrmo/barangay-monitoring", icon: <GroupIcon /> },
      { label: "Escalation Queue", href: "/mdrrmo/escalated-incidents", icon: <EmergencyShareOutlinedIcon /> },
    ],
  },
  {
    label: "Capacity and Assets",
    items: [
      { label: "Responders & Resources", href: "/mdrrmo/responders-resources", icon: <PeopleAltIcon /> },
      { label: "IoT Nodes", href: "/mdrrmo/iot-nodes", icon: <SensorsOutlinedIcon /> },
    ],
  },
  {
    label: "Records and Decision Support",
    items: [
      { label: "Reports", href: "/mdrrmo/reports", icon: <AssignmentOutlinedIcon /> },
      { label: "Analytics", href: "/mdrrmo/analytics", icon: <AnalyticsIcon /> },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users & Roles", href: "/mdrrmo/users-roles", icon: <GroupIcon />, adminOnly: true },
      { label: "Audit Logs", href: "/mdrrmo/audit-logs", icon: <HistoryOutlinedIcon />, adminOnly: true },
      { label: "Settings", href: "/mdrrmo/settings", icon: <SettingsIcon />, adminOnly: true },
    ],
  },
];

type SidebarProps = {
  role: OperationalRole;
  environment: "barangay" | "mdrrmo";
  organizationName: string;
  collapsed?: boolean;
  mobile?: boolean;
  badges?: Record<string, number>;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
};

export function Sidebar({
  role,
  environment,
  organizationName,
  collapsed = false,
  mobile = false,
  badges = {},
  onNavigate,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const navGroups = environment === "barangay" ? barangayNav : mdrrmoNav;
  const canAdminister = role === "barangay_admin" || role === "mdrrmo_admin";
  const background = environment === "barangay" ? "#123F32" : mdrrmoPalette.navy;
  const selectedColor = environment === "barangay" ? "#2F7D61" : mdrrmoPalette.setBlue;

  return (
    <Box sx={{ height: "100%", bgcolor: background, color: "white", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ minHeight: 72, p: collapsed ? 1.5 : 2, alignItems: "center", justifyContent: "space-between" }}>
        {collapsed ? (
          <Typography aria-label="NodeGuard" sx={{ width: "100%", textAlign: "center", fontWeight: 900 }}>NG</Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "white", overflow: "hidden", position: "relative", flexShrink: 0 }}>
              <Image src="/mdrrmc-logo.png" alt="La Trinidad MDRRMC seal" fill sizes="40px" style={{ objectFit: "contain" }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: "white", fontWeight: 900 }}>NodeGuard</Typography>
              <Typography variant="caption" noWrap sx={{ display: "block", color: "rgba(255,255,255,0.72)" }}>
                {environment === "barangay" ? "Frontline Operations" : "Central Monitoring"}
              </Typography>
            </Box>
          </Stack>
        )}
        {!mobile && !collapsed && <IconButton color="inherit" onClick={onToggleCollapse} aria-label="Collapse navigation"><ChevronLeftIcon /></IconButton>}
      </Stack>
      {collapsed && !mobile && <IconButton color="inherit" onClick={onToggleCollapse} aria-label="Expand navigation" sx={{ alignSelf: "center", mb: 1 }}><ChevronRightIcon /></IconButton>}
      <Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
      <Box sx={{ overflowY: "auto", px: 1.25, py: 1.5 }}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || canAdminister);
          if (!visibleItems.length) return null;
          return (
            <Box key={group.label} sx={{ mb: 2.25 }}>
              {!collapsed && <Typography variant="overline" sx={{ display: "block", px: 1.25, pt: 0.75, pb: 0.5, color: "rgba(255,255,255,0.68)", fontWeight: 800, fontSize: "0.68rem" }}>{group.label}</Typography>}
              <List disablePadding>
                {visibleItems.map((item) => {
                  const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const badgeCount = badges[item.href] ?? 0;
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
                        color: "rgba(255,255,255,0.88)",
                        justifyContent: collapsed ? "center" : "flex-start",
                        "&.Mui-selected, &.Mui-selected:hover": { bgcolor: selectedColor, color: "white" },
                        "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                      }}
                    >
                      <ListItemIcon sx={{ color: "inherit", minWidth: collapsed ? 0 : 42, justifyContent: "center" }}>
                        <Badge badgeContent={badgeCount} color="error" max={99} invisible={!badgeCount}>{item.icon}</Badge>
                      </ListItemIcon>
                      {!collapsed && <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 700 }}>{item.label}</Typography>}
                      {!collapsed && badgeCount > 0 && <Typography component="span" variant="caption" aria-label={`${badgeCount} items requiring attention`} sx={{ minWidth: 24, px: 0.75, py: 0.25, borderRadius: 3, textAlign: "center", bgcolor: "rgba(255,255,255,0.18)", fontWeight: 800 }}>{badgeCount}</Typography>}
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
          <Typography variant="caption" sx={{ fontWeight: 900 }}>{organizationName}</Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }}>Authorized operational workspace</Typography>
        </Stack>
      )}
    </Box>
  );
}
