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
import { fetchDeviceNodes } from "@/lib/nodeguardRepository";
import { deviceNodes as deviceSeed } from "@/data/devices";
import type { DeviceNode } from "@/types";

type Operator = {
  name: string;
  role: string;
};

function formatRole(role: string) {
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [operator, setOperator] = useState<Operator | null>(
    isSupabaseConfigured()
      ? null
      : { name: "Demo Operator", role: "super_admin" },
  );
  const [nodes, setNodes] = useState<DeviceNode[]>(
    isSupabaseConfigured() ? [] : deviceSeed,
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

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error || !profile || profile.is_active === false) {
        await supabase.auth.signOut();
        router.replace("/?reason=profile");
        return;
      }
      setOperator({ name: profile.full_name, role: profile.role });
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
  }, [router]);

  const loadNodeHealth = useCallback(async () => {
    try {
      const nextNodes = await fetchDeviceNodes();
      setNodes(nextNodes);
      setSystemHealthy(true);
      setLastSynced(new Date());
    } catch {
      setSystemHealthy(false);
    }
  }, []);

  useEffect(() => {
    if (!operator) return;
    const initialLoad = window.setTimeout(() => void loadNodeHealth(), 0);
    window.addEventListener("nodeguard:realtime-change", loadNodeHealth);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("nodeguard:realtime-change", loadNodeHealth);
    };
  }, [loadNodeHealth, operator]);

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/");
  };

  const isForbiddenAdminRoute = Boolean(
    operator &&
      ["/users", "/settings"].includes(pathname) &&
      !["admin", "super_admin"].includes(operator.role),
  );

  useEffect(() => {
    if (isForbiddenAdminRoute) router.replace("/dashboard");
  }, [isForbiddenAdminRoute, router]);

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
  const showConnectivityWarning = mode !== "online" || !systemHealthy || unavailableNodes >= 2;
  const connectivityOffset = showConnectivityWarning ? connectivityBarHeight : 0;
  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      window.localStorage.setItem("nodeguard.sidebar-collapsed", String(!current));
      return !current;
    });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <RealtimeRefresh />
      <Header
        onMenuClick={() => setMobileOpen(true)}
        operatorName={operator.name}
        roleLabel={formatRole(operator.role)}
        onLogout={publicDemo ? undefined : logout}
        publicDemo={publicDemo}
        systemHealthy={systemHealthy}
        lastSynced={lastSynced}
        nodeHealth={{ online: onlineNodes, total: nodes.length }}
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
          <Sidebar role={operator.role} mobile onNavigate={() => setMobileOpen(false)} />
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
          <Sidebar role={operator.role} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${desktopDrawerWidth}px)` }, overflowX: "clip" }}>
        <Toolbar sx={{ minHeight: `${appHeaderHeight}px !important` }} />
        {showConnectivityWarning && <Box sx={{ height: connectivityBarHeight }} />}
        <Box sx={{ width: "100%", p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
