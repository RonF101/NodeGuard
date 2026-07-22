"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { appHeaderHeight, Header } from "@/components/Header";
import { ConnectivityBar, connectivityBarHeight } from "@/components/connectivity/ConnectivityBar";
import { ConnectivityProvider } from "@/components/connectivity/ConnectivityProvider";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { collapsedDrawerWidth, Sidebar, drawerWidth } from "@/components/Sidebar";
import {
  getSupabaseClient,
  isNodeGuardDemoMode,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";
import { fetchDeviceNodes, fetchIncidents } from "@/lib/nodeguardRepository";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { incidents as incidentSeed } from "@/data/incidents";
import { barangayTheme, mdrrmoTheme } from "@/theme/theme";
import {
  isBarangayRole,
  isMdrrmoRole,
  normalizeOperationalRole,
  roleHome,
} from "@/lib/auth";
import type { DashboardRole } from "@/lib/auth";
import type { DeviceNode, Incident, OperationalRole } from "@/types";

type Operator = {
  name: string;
  role: OperationalRole;
  barangayId: string | null;
  organizationName: string;
};

function formatRole(role: string) {
  const labels: Record<string, string> = {
    barangay_admin: "Barangay Administrator",
    barangay_personnel: "Barangay Personnel",
    mdrrmo_admin: "LT-MDRRMO Administrator",
    mdrrmo_operations: "LT-MDRRMO Operations",
    field_responder: "Field Responder",
  };
  if (labels[role]) return labels[role];
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ConnectivityProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </ConnectivityProvider>
  );
}

function AppShellFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useConnectivity();
  const publicDemo = isNodeGuardDemoMode();
  const usesPrototypeSession = !isSupabaseConfigured();
  const environment = pathname.startsWith("/barangay") ? "barangay" : "mdrrmo";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [nodes, setNodes] = useState<DeviceNode[]>(
    isSupabaseConfigured() ? [] : deviceSeed,
  );
  const [incidents, setIncidents] = useState<Incident[]>(
    isSupabaseConfigured() ? [] : incidentSeed,
  );
  const [systemHealthy, setSystemHealthy] = useState(!isSupabaseConfigured());
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const restorePreference = window.setTimeout(
      () => setSidebarCollapsed(window.localStorage.getItem("nodeguard.sidebar-collapsed") === "true"),
      0,
    );
    return () => window.clearTimeout(restorePreference);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;
    const loadOperator = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (active) router.replace("/");
        return;
      }

      const enhanced = await supabase
        .from("profiles")
        .select("full_name, role, is_active, barangay_id, organization_name, agency_unit")
        .eq("id", user.id)
        .maybeSingle();
      let profile = enhanced.data as null | {
        full_name: string;
        role: DashboardRole;
        is_active: boolean;
        barangay_id?: string | null;
        organization_name?: string | null;
        agency_unit?: string | null;
      };
      let error = enhanced.error;
      if (error) {
        const legacy = await supabase
          .from("profiles")
          .select("full_name, role, is_active, agency_unit")
          .eq("id", user.id)
          .maybeSingle();
        profile = legacy.data as typeof profile;
        error = legacy.error;
      }
      if (!active) return;
      if (error || !profile || profile.is_active === false) {
        await supabase.auth.signOut();
        router.replace("/?reason=profile");
        return;
      }
      const effectiveRole = normalizeOperationalRole(profile.role, profile.barangay_id);
      const expectedEnvironment = isBarangayRole(effectiveRole) ? "barangay" : isMdrrmoRole(effectiveRole) ? "mdrrmo" : "responder";
      if (expectedEnvironment !== environment) {
        router.replace(roleHome(effectiveRole));
        return;
      }
      setOperator({
        name: profile.full_name,
        role: effectiveRole,
        barangayId: profile.barangay_id ?? null,
        organizationName: profile.organization_name ?? (expectedEnvironment === "barangay" ? profile.agency_unit ?? "Assigned Barangay" : "LT-MDRRMO"),
      });
    };

    void loadOperator();
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") router.replace("/");
      },
    );
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [environment, router]);

  useEffect(() => {
    if (!usesPrototypeSession) return;
    const restorePrototypeOperator = window.setTimeout(() => {
      const storedRole = window.localStorage.getItem("nodeguard.demo-role") as OperationalRole | null;
      const effectiveRole: OperationalRole = storedRole && [
        "barangay_admin",
        "barangay_personnel",
        "mdrrmo_admin",
        "mdrrmo_operations",
      ].includes(storedRole)
        ? storedRole
        : environment === "barangay" ? "barangay_personnel" : "mdrrmo_operations";
      const expectedEnvironment = isBarangayRole(effectiveRole) ? "barangay" : "mdrrmo";
      if (expectedEnvironment !== environment) {
        router.replace(roleHome(effectiveRole));
        return;
      }
      const barangayOperator = isBarangayRole(effectiveRole);
      setOperator({
        name: barangayOperator ? "Demo Barangay Operator" : "Demo Municipal Operator",
        role: effectiveRole,
        barangayId: barangayOperator ? "brgy-pico" : null,
        organizationName: barangayOperator ? "Barangay Pico" : "LT-MDRRMO",
      });
    }, 0);
    return () => window.clearTimeout(restorePrototypeOperator);
  }, [environment, router, usesPrototypeSession]);

  const loadOperationalState = useCallback(async () => {
    try {
      const [nextNodes, nextIncidents] = await Promise.all([fetchDeviceNodes(), fetchIncidents()]);
      setNodes(
        operator?.barangayId
          ? nextNodes.filter((node) => !node.barangayId || node.barangayId === operator.barangayId)
          : nextNodes,
      );
      setIncidents(
        operator?.barangayId
          ? nextIncidents.filter((incident) => incident.barangayId === operator.barangayId)
          : nextIncidents,
      );
      setSystemHealthy(true);
      setLastSynced(new Date());
    } catch {
      setSystemHealthy(false);
    }
  }, [operator]);

  useEffect(() => {
    if (!operator) return;
    const initialLoad = window.setTimeout(() => void loadOperationalState(), 0);
    window.addEventListener("nodeguard:realtime-change", loadOperationalState);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("nodeguard:realtime-change", loadOperationalState);
    };
  }, [loadOperationalState, operator]);

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    else window.localStorage.removeItem("nodeguard.demo-role");
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/");
  };

  const isForbiddenAdminRoute = Boolean(
    operator &&
      ["/mdrrmo/users-roles", "/mdrrmo/audit-logs", "/mdrrmo/settings", "/barangay/settings"].includes(pathname) &&
      !["barangay_admin", "mdrrmo_admin"].includes(operator.role),
  );

  useEffect(() => {
    if (isForbiddenAdminRoute && operator) router.replace(roleHome(operator.role));
  }, [isForbiddenAdminRoute, operator, router]);

  if (!operator || isForbiddenAdminRoute) {
    return (
      <Stack
        spacing={2}
        sx={{
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress color="secondary" />
        <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
          Verifying your NodeGuard session...
        </Typography>
      </Stack>
    );
  }

  const desktopDrawerWidth = sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;
  const onlineNodes = nodes.filter((node) => node.status === "Online").length;
  const unavailableNodes = nodes.length - onlineNodes;
  const activeIncidents = incidents.filter((incident) => !["Resolved", "Closed", "Cancelled", "False Alert"].includes(incident.status));
  const pendingValidation = incidents.filter((incident) => ["Reported", "Pending Validation", "Pending Verification"].includes(incident.status)).length;
  const activeEscalations = incidents.filter((incident) => incident.escalationStatus && !["Not Escalated", "Completed"].includes(incident.escalationStatus)).length;
  const incomingIotAlerts = incidents.filter((incident) => incident.sourceType === "IoT Node" && ["Reported", "Pending Validation", "Pending Verification"].includes(incident.status)).length;
  const pendingNotifications = incidents.filter((incident) => incident.smsNotification?.status === "Failed" || incident.escalationStatus === "Pending Acknowledgement").length;
  const navigationBadges: Record<string, number> = environment === "barangay"
    ? {
        "/barangay/incoming-alerts": incomingIotAlerts,
        "/barangay/active-incidents": activeIncidents.length,
        "/barangay/notifications": pendingNotifications,
      }
    : {
        "/mdrrmo/all-incidents": pendingValidation,
        "/mdrrmo/escalated-incidents": activeEscalations,
        "/mdrrmo/iot-nodes": unavailableNodes,
      };
  const showConnectivityWarning = mode !== "online" || !systemHealthy || unavailableNodes >= 2;
  const connectivityOffset = showConnectivityWarning ? connectivityBarHeight : 0;
  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      window.localStorage.setItem("nodeguard.sidebar-collapsed", String(!current));
      return !current;
    });
  };

  return (
    <ThemeProvider theme={environment === "barangay" ? barangayTheme : mdrrmoTheme}>
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <RealtimeRefresh />
      <Header
        onMenuClick={() => setMobileOpen(true)}
        operatorName={operator.name}
        roleLabel={formatRole(operator.role)}
        dashboardTitle={environment === "barangay" ? `${operator.organizationName} Emergency Dashboard` : "LT-MDRRMO Incident Management System"}
        organizationName={operator.organizationName}
        onLogout={logout}
        publicDemo={publicDemo}
        systemHealthy={systemHealthy}
        lastSynced={lastSynced}
        nodeHealth={{ online: onlineNodes, total: nodes.length }}
        environment={environment}
        attentionCount={pendingNotifications}
      />
      <ConnectivityBar systemHealthy={systemHealthy} unavailableNodes={unavailableNodes} />
      <Box component="nav" sx={{ width: { md: desktopDrawerWidth }, flexShrink: { md: 0 }, transition: "width 180ms ease" }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: `min(${drawerWidth}px, 92vw)`,
              maxWidth: "100%",
              top: appHeaderHeight + connectivityOffset,
              height: `calc(100% - ${appHeaderHeight + connectivityOffset}px)`,
            }
          }}
        >
          <Sidebar role={operator.role} environment={environment} organizationName={operator.organizationName} badges={navigationBadges} mobile onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: desktopDrawerWidth,
              boxSizing: "border-box",
              top: appHeaderHeight + connectivityOffset,
              height: `calc(100% - ${appHeaderHeight + connectivityOffset}px)`,
              transition: "width 180ms ease"
            }
          }}
          open
        >
          <Sidebar role={operator.role} environment={environment} organizationName={operator.organizationName} badges={navigationBadges} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${desktopDrawerWidth}px)` }, overflowX: "clip" }}>
        <Toolbar sx={{ minHeight: `${appHeaderHeight}px !important` }} />
        {showConnectivityWarning && <Box sx={{ height: connectivityBarHeight }} />}
        <Box sx={{ width: "100%", p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>{children}</Box>
      </Box>
      </Box>
      </ThemeProvider>
  );
}
