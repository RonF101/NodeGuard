"use client";

import { FormEvent, useEffect, useState } from "react";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { authorizedFetch } from "@/lib/auth";
import type {
  AlertLevel,
  Barangay,
  EmergencyCategory,
  IncidentManagementMode,
  ReportingChannel,
} from "@/types";

type Environment = "barangay" | "mdrrmo";

const channels: ReportingChannel[] = [
  "Emergency Hotline",
  "Mobile Call",
  "SMS / Text Message",
  "Social Media Message",
  "Email",
  "Walk-in Report",
  "Radio",
  "Barangay Personnel",
  "LT-MDRRMO Personnel",
  "Field Responder",
  "Partner Office / Organization",
  "Other",
];
const categories: EmergencyCategory[] = [
  "Medical Emergency",
  "Security/Public Safety",
  "Fire/Disaster Emergency",
];
const incidentTypes: Record<EmergencyCategory, string[]> = {
  "Medical Emergency": [
    "Medical assistance",
    "Vehicular collision with injuries",
    "Trauma or fall",
    "Acute illness",
    "Maternal emergency",
    "Other medical incident",
  ],
  "Security/Public Safety": [
    "Vehicular collision without reported injuries",
    "Public disturbance",
    "Crime or public-safety concern",
    "Missing or vulnerable person",
    "Traffic or crowd safety",
    "Other public-safety incident",
  ],
  "Fire/Disaster Emergency": [
    "Structural fire",
    "Electrical fire or hazard",
    "Flooding",
    "Landslide",
    "Earthquake impact",
    "Hazardous-material incident",
    "Severe-weather impact",
    "Other fire or disaster incident",
  ],
};
const alertLevels: AlertLevel[] = ["Unassessed", "Critical", "High", "Moderate", "Low"];
const handlingModes: IncidentManagementMode[] = [
  "Referred to Barangay",
  "Barangay Validation Requested",
  "LT-MDRRMO Direct",
  "Municipal Coordination",
];

function localDateTimeNow() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function createInitialForm(environment: Environment) {
  return {
    reportingChannel: (environment === "barangay" ? "Barangay Personnel" : "Emergency Hotline") as ReportingChannel,
    reportingSource: "",
    reporterContact: "",
    reportingOffice: environment === "barangay" ? "" : "LT-MDRRMO Operations Center",
    category: "Medical Emergency" as EmergencyCategory,
    incidentSubtype: "",
    description: "",
    location: "",
    landmark: "",
    barangayId: "",
    reportedAt: localDateTimeNow(),
    occurredAt: "",
    personsAffected: "0",
    affectedPersonsCondition: "",
    alertLevel: "Unassessed" as AlertLevel,
    actionsTaken: "",
    initialNotes: "",
    managementMode: (environment === "barangay" ? "Barangay Managed" : "LT-MDRRMO Direct") as IncidentManagementMode,
  };
}

export function IncidentIntakeForm({ environment }: { environment: Environment }) {
  const [form, setForm] = useState(() => createInitialForm(environment));
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (environment !== "mdrrmo") return;
    let active = true;
    void authorizedFetch("/api/barangays")
      .then((response) => response.json())
      .then((result: { ok: boolean; barangays?: Barangay[] }) => {
        if (active && result.ok) setBarangays(result.barangays ?? []);
      });
    return () => { active = false; };
  }, [environment]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const barangayRequired = environment === "mdrrmo"
    && ["Referred to Barangay", "Barangay Validation Requested"].includes(form.managementMode);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await authorizedFetch("/api/incidents/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          reportedAt: new Date(form.reportedAt).toISOString(),
          occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
          personsAffected: Number(form.personsAffected),
          barangayId: form.barangayId || undefined,
        }),
      });
      const result = (await response.json()) as { ok: boolean; incidentId?: string; reason?: string };
      if (!result.ok || !result.incidentId) {
        setMessage({ tone: "error", text: result.reason ?? "Incident report could not be saved." });
        return;
      }
      for (const file of files) {
        const payload = new FormData();
        payload.set("incidentId", result.incidentId);
        payload.set("file", file);
        const upload = await authorizedFetch("/api/incident-attachment", { method: "POST", body: payload });
        if (!upload.ok) throw new Error(`${result.incidentId} was saved, but an attachment could not be uploaded.`);
      }
      setForm(createInitialForm(environment));
      setFiles([]);
      setMessage({ tone: "success", text: `${result.incidentId} is now part of the centralized municipal incident repository.` });
      window.dispatchEvent(new CustomEvent("nodeguard:realtime-change"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Incident submission failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={environment === "barangay" ? "Barangay Incident Intake" : "Municipal Direct Incident Intake"}
        title="New Incident Report"
        subtitle={environment === "barangay"
          ? "Record every incident received or handled by your barangay, regardless of reporting channel."
          : "Record reports received directly by LT-MDRRMO and decide whether barangay or municipal operations will manage them."}
      />
      <Alert severity="info" sx={{ mb: 2 }}>
        Calls, messages, radio traffic, walk-ins, and partner reports are entered here as structured records. IoT node activations create their own records automatically and do not use this form.
      </Alert>
      <Card>
        <CardContent component="form" onSubmit={submit}>
          <Typography variant="h6" color="secondary">Report source</Typography>
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 12, md: 4 }}><TextField select required fullWidth label="Reporting channel" value={form.reportingChannel} onChange={(event) => update("reportingChannel", event.target.value as ReportingChannel)}>{channels.map((channel) => <MenuItem key={channel} value={channel}>{channel}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required fullWidth label="Reporting person or source" value={form.reportingSource} onChange={(event) => update("reportingSource", event.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Contact information (when available)" value={form.reporterContact} onChange={(event) => update("reporterContact", event.target.value)} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Reporting office or organization" value={form.reportingOffice} onChange={(event) => update("reportingOffice", event.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField required fullWidth type="datetime-local" label="Date and time reported" value={form.reportedAt} onChange={(event) => update("reportedAt", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="datetime-local" label="Date and time of occurrence (when known)" value={form.occurredAt} onChange={(event) => update("occurredAt", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" color="secondary">Incident details</Typography>
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid size={{ xs: 12, md: 4 }}><TextField select required fullWidth label="Emergency category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as EmergencyCategory, incidentSubtype: "" }))}>{categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField select required fullWidth label="Detailed incident type" value={form.incidentSubtype} onChange={(event) => update("incidentSubtype", event.target.value)}>{incidentTypes[form.category].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField select required fullWidth label="Urgency or severity" value={form.alertLevel} onChange={(event) => update("alertLevel", event.target.value as AlertLevel)}>{alertLevels.map((level) => <MenuItem key={level} value={level}>{level}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 8 }}><TextField required fullWidth label="Exact or approximate location" value={form.location} onChange={(event) => update("location", event.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Nearby landmark" value={form.landmark} onChange={(event) => update("landmark", event.target.value)} /></Grid>
            {environment === "mdrrmo" && <Grid size={{ xs: 12, md: 6 }}><TextField select required={barangayRequired} fullWidth label={barangayRequired ? "Concerned barangay" : "Concerned barangay (when known)"} value={form.barangayId} onChange={(event) => update("barangayId", event.target.value)}><MenuItem value="">Not yet determined</MenuItem>{barangays.map((barangay) => <MenuItem key={barangay.id} value={barangay.id}>Barangay {barangay.name}</MenuItem>)}</TextField></Grid>}
            <Grid size={{ xs: 12, md: environment === "mdrrmo" ? 3 : 4 }}><TextField required fullWidth type="number" label="Persons affected" value={form.personsAffected} onChange={(event) => update("personsAffected", event.target.value)} slotProps={{ htmlInput: { min: 0 } }} /></Grid>
            <Grid size={{ xs: 12, md: environment === "mdrrmo" ? 3 : 8 }}><TextField fullWidth label="Condition of affected persons" value={form.affectedPersonsCondition} onChange={(event) => update("affectedPersonsCondition", event.target.value)} /></Grid>
            <Grid size={{ xs: 12 }}><TextField required fullWidth multiline minRows={4} label="Incident description" value={form.description} onChange={(event) => update("description", event.target.value)} /></Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" color="secondary">Initial handling</Typography>
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            {environment === "mdrrmo" && <Grid size={{ xs: 12 }}><TextField select required fullWidth label="LT-MDRRMO handling decision" value={form.managementMode} onChange={(event) => update("managementMode", event.target.value as IncidentManagementMode)}>{handlingModes.map((mode) => <MenuItem key={mode} value={mode}>{mode}</MenuItem>)}</TextField></Grid>}
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth multiline minRows={3} label="Initial action taken" value={form.actionsTaken} onChange={(event) => update("actionsTaken", event.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth multiline minRows={3} label="Operational notes" value={form.initialNotes} onChange={(event) => update("initialNotes", event.target.value)} /></Grid>
            <Grid size={{ xs: 12 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}><Button component="label" variant="outlined" startIcon={<AttachFileOutlinedIcon />}>Attach supporting files<input hidden multiple type="file" accept="image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/mp4" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></Button><Typography variant="body2" color="text.secondary">{files.length ? `${files.length} file(s) selected · 10 MB each maximum` : "Attachments are optional"}</Typography></Stack></Grid>
            {message && <Grid size={{ xs: 12 }}><Alert severity={message.tone}>{message.text}</Alert></Grid>}
            <Grid size={{ xs: 12 }}><Button type="submit" startIcon={<SendOutlinedIcon />} disabled={busy}>{busy ? "Saving Incident..." : "Save Incident Record"}</Button></Grid>
          </Grid>
        </CardContent>
      </Card>
    </AppShell>
  );
}
