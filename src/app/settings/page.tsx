"use client";

import { useCallback, useEffect, useState } from "react";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import WarningIcon from "@mui/icons-material/Warning";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { authorizedFetch } from "@/lib/auth";
import { fetchDeviceNodes } from "@/lib/nodeguardRepository";
import { DeviceNode } from "@/types";

const settingGroups = [
  { label: "Emergency Categories", icon: <WarningIcon /> },
  { label: "Device Management", icon: <SettingsInputAntennaIcon /> },
  { label: "Integrations", icon: <NotificationsActiveIcon /> },
  { label: "Security", icon: <SecurityIcon /> },
];

type SystemHealth = {
  mode: "demo" | "live";
  database: boolean;
  serviceRole: boolean;
  smsWebhook: boolean;
  voiceStorage: boolean;
};

const categories = [
  { name: "Medical Emergency", detail: "Medical distress, injury, or urgent health assistance." },
  { name: "Security/Public Safety", detail: "Threats, crime, conflict, or immediate public-safety concerns." },
  { name: "Fire/Disaster Emergency", detail: "Fire, flooding, landslide, earthquake, or rescue events." },
];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [devices, setDevices] = useState<DeviceNode[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [message, setMessage] = useState("");

  const loadSettingsData = useCallback(async () => {
    try {
      const [nextDevices, healthResponse] = await Promise.all([
        fetchDeviceNodes(),
        authorizedFetch("/api/system-health"),
      ]);
      setDevices(nextDevices);
      const result = (await healthResponse.json()) as ({ ok: boolean; reason?: string } & Partial<SystemHealth>);
      if (!healthResponse.ok || !result.ok) throw new Error(result.reason ?? "Unable to load deployment health.");
      setHealth(result as SystemHealth);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load system settings.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadSettingsData(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadSettingsData]);

  const updateStatus = async (deviceId: string, status: DeviceNode["status"]) => {
    const response = await authorizedFetch("/api/device-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, status: status.toLowerCase().replace(" ", "_") }),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string };
    if (!result.ok) {
      setMessage(result.reason ?? "Device status update failed.");
      return;
    }
    setDevices((current) => current.map((device) => device.id === deviceId ? { ...device, status } : device));
    setMessage(`${deviceId} marked ${status.toLowerCase()}.`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="System Configuration"
        title="Settings"
        subtitle="Operational categories are fixed by the NodeGuard design; deploy-time integrations and registered nodes are shown here explicitly."
      />
      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
            {settingGroups.map((group) => <Tab key={group.label} icon={group.icon} iconPosition="start" label={group.label} />)}
          </Tabs>

          <Box>
            {tab === 0 && (
              <Stack spacing={2}>
                <Alert severity="info">These three categories match the physical node buttons and shared database enum. Renaming them independently would break hardware, web, and mobile alignment.</Alert>
                <Grid container spacing={2}>
                  {categories.map((category) => (
                    <Grid key={category.name} size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined" sx={{ height: "100%", boxShadow: "none" }}>
                        <CardContent>
                          <Typography variant="h6" color="secondary">{category.name}</Typography>
                          <Typography color="text.secondary" sx={{ mt: 1 }}>{category.detail}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}

            {tab === 1 && (
              <Stack spacing={2}>
                <Alert severity="warning">Only administrators can change a registered node&apos;s operational status. Device identity, coordinates, and installation details remain database-controlled.</Alert>
                <Grid container spacing={2}>
                  {devices.map((device) => (
                    <Grid key={device.id} size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined" sx={{ boxShadow: "none", height: "100%" }}>
                        <CardContent>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                            <Box>
                              <Typography variant="h6" color="secondary">{device.name}</Typography>
                              <Typography sx={{ fontWeight: 800 }}>{device.id}</Typography>
                            </Box>
                            <StatusChip status={device.status} />
                          </Stack>
                          <Typography color="text.secondary" sx={{ mt: 1 }}>{device.approximateAddress || device.location}</Typography>
                          <Typography variant="body2" color="text.secondary">{device.geoCoordinates || "Coordinates not recorded"}</Typography>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Operational Status"
                            value={device.status}
                            onChange={(event) => void updateStatus(device.id, event.target.value as DeviceNode["status"])}
                            sx={{ mt: 2 }}
                          >
                            {(["Online", "Maintenance", "Offline"] as DeviceNode["status"][]).map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                          </TextField>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}

            {tab === 2 && (
              <Stack spacing={2}>
                <Alert severity={health?.mode === "live" ? "success" : "info"}>
                  {health?.mode === "live" ? "Live deployment configuration detected." : "Demo configuration detected; connect Supabase before operational use."}
                </Alert>
                <Grid container spacing={2}>
                  {[
                    ["Shared Supabase database", health?.database],
                    ["Server-side privileged operations", health?.serviceRole],
                    ["Private voice-context storage", health?.voiceStorage],
                    ["SMS webhook delivery", health?.smsWebhook],
                  ].map(([label, ready]) => (
                    <Grid key={String(label)} size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined" sx={{ boxShadow: "none" }}>
                        <CardContent>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}>
                            <Typography sx={{ fontWeight: 800 }}>{String(label)}</Typography>
                            <Chip label={ready ? "Configured" : "Not configured"} color={ready ? "success" : "default"} />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Typography variant="body2" color="text.secondary">In-app assignment notifications always use Supabase. SMS delivery is provider-neutral and activates only when the deployment supplies the documented webhook environment variables.</Typography>
              </Stack>
            )}

            {tab === 3 && (
              <Stack spacing={2}>
                {[
                  "Dashboard mutations require a valid Supabase session and an authorized profile role.",
                  "Responder updates are limited by Row Level Security to assigned incidents.",
                  "Voice recordings are private and opened through short-lived signed URLs.",
                  "Responder, resource, validation, buzzer, device, and user changes are written to audit logs.",
                  "The service-role key is server-only and is never bundled into the web or mobile client.",
                ].map((item) => <Alert key={item} severity="success">{item}</Alert>)}
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>
      <Snackbar open={Boolean(message)} autoHideDuration={4500} onClose={() => setMessage("")} message={message} />
    </AppShell>
  );
}
