"use client";

import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import StorageIcon from "@mui/icons-material/Storage";
import WarningIcon from "@mui/icons-material/Warning";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

const settingGroups = [
  { label: "Emergency Categories", icon: <WarningIcon /> },
  { label: "Device Management", icon: <SettingsInputAntennaIcon /> },
  { label: "Notifications", icon: <NotificationsActiveIcon /> },
  { label: "Data Retention", icon: <StorageIcon /> },
  { label: "Security", icon: <SecurityIcon /> }
];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="System Configuration"
        title="Settings"
        actions={<Button startIcon={<SaveIcon />}>Save Settings</Button>}
      />
      <Card>
        <CardContent>
          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3 }}
          >
            {settingGroups.map((group) => (
              <Tab key={group.label} icon={group.icon} iconPosition="start" label={group.label} />
            ))}
          </Tabs>
          <Box>
            {tab === 0 && (
              <Grid container spacing={2}>
                {["Medical Emergency", "Security/Public Safety", "Fire/Disaster Emergency"].map((category) => (
                  <Grid key={category} size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Emergency Category" defaultValue={category} />
                  </Grid>
                ))}
              </Grid>
            )}
            {tab === 1 && (
              <Stack spacing={2}>
                <Typography color="secondary" sx={{ fontWeight: 800 }}>
                  Device registration and maintenance controls
                </Typography>
                <TextField label="New Device ID Prefix" defaultValue="LT-NODE" />
                <FormControlLabel control={<Switch defaultChecked />} label="Allow maintenance status updates" />
                <FormControlLabel control={<Switch defaultChecked />} label="Flag offline devices in dashboard" />
              </Stack>
            )}
            {tab === 2 && (
              <Stack spacing={2}>
                <FormControlLabel control={<Switch defaultChecked />} label="Send SMS notification for critical alerts" />
                <FormControlLabel control={<Switch defaultChecked />} label="Notify duty admin on pending alerts" />
                <FormControlLabel control={<Switch />} label="Email daily incident digest" />
              </Stack>
            )}
            {tab === 3 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Incident Archive Period" defaultValue="5 years" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Voice Context Retention" defaultValue="180 days" />
                </Grid>
              </Grid>
            )}
            {tab === 4 && (
              <Stack spacing={2}>
                <FormControlLabel control={<Switch defaultChecked />} label="Require admin approval for user role changes" />
                <FormControlLabel control={<Switch defaultChecked />} label="Session timeout for inactive users" />
                <TextField label="Session Timeout" defaultValue="30 minutes" />
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>
    </AppShell>
  );
}
