"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { authorizedFetch } from "@/lib/auth";
import type { Barangay, BarangayOperatingHours } from "@/types";

const weekdays = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"],
  [5, "Fri"], [6, "Sat"], [7, "Sun"],
] as const;

export function OperatingHoursPanel({ environment }: { environment: "barangay" | "mdrrmo" }) {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [settings, setSettings] = useState<BarangayOperatingHours[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [settingsResponse, barangaysResponse] = await Promise.all([
        authorizedFetch("/api/operating-hours"),
        authorizedFetch("/api/barangays"),
      ]);
      const settingsResult = (await settingsResponse.json()) as { ok: boolean; settings?: BarangayOperatingHours[]; reason?: string };
      const barangaysResult = (await barangaysResponse.json()) as { ok: boolean; barangays?: Barangay[]; reason?: string };
      if (!settingsResult.ok) throw new Error(settingsResult.reason ?? "Operating hours could not be loaded.");
      setSettings(settingsResult.settings ?? []);
      if (barangaysResult.ok) setBarangays(barangaysResult.barangays ?? []);
      const firstId = settingsResult.settings?.[0]?.barangayId ?? barangaysResult.barangays?.[0]?.id ?? "";
      setSelectedId((current) => current || firstId);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Operating hours could not be loaded." });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = useMemo(
    () => settings.find((setting) => setting.barangayId === selectedId) ?? settings[0],
    [selectedId, settings],
  );
  const selectedName = barangays.find((barangay) => barangay.id === selected?.barangayId)?.name;

  const change = (patch: Partial<BarangayOperatingHours>) => {
    if (!selected) return;
    setSettings((current) => current.map((setting) => setting.barangayId === selected.barangayId ? { ...setting, ...patch } : setting));
  };
  const toggleDay = (day: number) => {
    if (!selected) return;
    change({ staffedDays: selected.staffedDays.includes(day) ? selected.staffedDays.filter((item) => item !== day) : [...selected.staffedDays, day].toSorted() });
  };
  const save = async () => {
    if (!selected) return;
    setBusy(true); setMessage(null);
    try {
      const response = await authorizedFetch("/api/operating-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string };
      if (!result.ok) throw new Error(result.reason ?? "Operating hours could not be saved.");
      setMessage({ tone: "success", text: `Operating hours saved${selectedName ? ` for Barangay ${selectedName}` : ""}.` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Operating hours could not be saved." });
    } finally { setBusy(false); }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">IoT alerts received outside staffed hours notify both the barangay and LT-MDRRMO immediately. If the barangay does not acknowledge within the configured period, municipal operations can claim fallback coordination.</Alert>
      {environment === "mdrrmo" && <TextField select fullWidth label="Participating barangay" value={selected?.barangayId ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{barangays.map((barangay) => <MenuItem key={barangay.id} value={barangay.id}>Barangay {barangay.name}</MenuItem>)}</TextField>}
      {selected ? <Card variant="outlined" sx={{ boxShadow: "none" }}><CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1, alignItems: { sm: "center" } }}>
          <div><Typography variant="h6" color="secondary">{selectedName ? `Barangay ${selectedName}` : "Barangay Operating Schedule"}</Typography><Typography variant="body2" color="text.secondary">Timezone: Asia/Manila</Typography></div>
          <FormControlLabel control={<Switch checked={selected.isEnabled} onChange={(event) => change({ isEnabled: event.target.checked })} />} label="Staffed-hours routing enabled" />
        </Stack>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>STAFFED DAYS</Typography><Stack direction="row" useFlexGap sx={{ flexWrap: "wrap" }}>{weekdays.map(([day, label]) => <FormControlLabel key={day} control={<Checkbox checked={selected.staffedDays.includes(day)} onChange={() => toggleDay(day)} />} label={label} />)}</Stack></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="time" label="Opens at" value={selected.opensAt} onChange={(event) => change({ opensAt: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="time" label="Closes at" value={selected.closesAt} onChange={(event) => change({ closesAt: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth type="number" label="Acknowledgement period (minutes)" value={selected.acknowledgementMinutes} onChange={(event) => change({ acknowledgementMinutes: Number(event.target.value) })} slotProps={{ htmlInput: { min: 1, max: 120 } }} /></Grid>
          <Grid size={{ xs: 12 }}><Button onClick={() => void save()} disabled={busy || !selected.staffedDays.length}>{busy ? "Saving..." : "Save Routing Schedule"}</Button></Grid>
        </Grid>
      </CardContent></Card> : <Alert severity="warning">No operating-hours record is available. Apply migration 0013 and reload this page.</Alert>}
      {message && <Alert severity={message.tone}>{message.text}</Alert>}
    </Stack>
  );
}
