"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { reports } from "@/data/incidents";
import { Incident, Report } from "@/types";
import { fetchIncidents } from "@/lib/nodeguardRepository";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import { formatPhilippineDateTime } from "@/config/incidentOperations";

function toReport(incident: Incident, index: number): Report {
  return {
    id: `RPT-${incident.id.replace(/^NG-/, "") || String(index + 1).padStart(3, "0")}`,
    incidentId: incident.id,
    category: incident.category,
    location: incident.location,
    status: incident.status === "False Alert" ? "Closed" : incident.status,
    closedAt: incident.resolvedAt ?? incident.latestFieldNoteAt ?? incident.timestamp,
    responseTime: incident.responseTimeMinutes === undefined ? "Not recorded" : `${incident.responseTimeMinutes} min`,
    leadAgency: incident.assignedResponder || "Unassigned",
  };
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<Report[]>(isSupabaseConfigured() ? [] : reports);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");

  const filteredReports = useMemo(
    () =>
      reportData.filter((report) => {
        const closedDate = report.closedAt.slice(0, 10);
        return (
          (!dateFrom || closedDate >= dateFrom) &&
          (!dateTo || closedDate <= dateTo) &&
          (category === "All" || report.category === category) &&
          (!location ||
            report.location.toLowerCase().includes(location.toLowerCase()))
        );
      }),
    [category, dateFrom, dateTo, location, reportData],
  );

  const loadReports = useCallback(async () => {
    try {
      const incidents = await fetchIncidents();
      setReportData(
        incidents
          .filter((incident) => ["Resolved", "Closed", "False Alert"].includes(incident.status))
          .map(toReport),
      );
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load incident reports.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadReports(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadReports);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadReports);
    };
  }, [loadReports]);

  const downloadCsv = (items: Report[], filename: string) => {
    const safe = (value: string) => {
      const formulaSafe = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${formulaSafe.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["Report ID", "Incident ID", "Category", "Location", "Status", "Closed At", "Response Time", "Lead Agency"],
      ...items.map((report) => [
        report.id,
        report.incidentId,
        report.category,
        report.location,
        report.status,
        `${formatPhilippineDateTime(report.closedAt)} PHT`,
        report.responseTime,
        report.leadAgency,
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map((value) => safe(String(value))).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCategory("All");
    setLocation("");
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Incident Records" title="Reports" />
      {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Date From" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Date To" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField select fullWidth label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
                {["All", "Medical Emergency", "Security/Public Safety", "Fire/Disaster Emergency"].map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Location" placeholder="Pico, Km. 4, Market" value={location} onChange={(event) => setLocation(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={resetFilters}>Clear Filters</Button>
                <Button startIcon={<FileDownloadIcon />} onClick={() => downloadCsv(filteredReports, "nodeguard-incident-reports.csv")} disabled={!filteredReports.length}>
                  Export Filtered CSV
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Grid container spacing={3}>
        {filteredReports.map((report) => (
          <Grid key={report.id} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}>
                  <Typography variant="h6" color="secondary">
                    {report.id}
                  </Typography>
                  <StatusChip status={report.status} />
                </Stack>
                <Typography color="primary" sx={{ mt: 1, fontWeight: 800 }}>
                  {report.incidentId} - {report.category}
                </Typography>
                <Typography sx={{ mt: 1 }}>{report.location}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Closed: {formatPhilippineDateTime(report.closedAt)} PHT
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lead Agency: {report.leadAgency} - Response Time: {report.responseTime}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  sx={{ mt: 2, width: { xs: "100%", sm: "auto" } }}
                  onClick={() => setSelectedReport(report)}
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {!filteredReports.length && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography color="text.secondary">No incident reports match the selected filters.</Typography>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selectedReport)} onClose={() => setSelectedReport(null)} fullWidth maxWidth="md">
        <DialogTitle>{selectedReport?.id}</DialogTitle>
        <DialogContent dividers>
          {selectedReport && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                {[
                  ["Incident ID", selectedReport.incidentId],
                  ["Category", selectedReport.category],
                  ["Location", selectedReport.location],
                  ["Status", selectedReport.status],
                  ["Closed At", `${formatPhilippineDateTime(selectedReport.closedAt)} PHT`],
                  ["Lead Agency", selectedReport.leadAgency],
                  ["Response Time", selectedReport.responseTime]
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                Export and print actions are available only after opening an incident report.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>Print / Save PDF</Button>
            <Button startIcon={<FileDownloadIcon />} color="secondary" onClick={() => selectedReport && downloadCsv([selectedReport], `${selectedReport.id}.csv`)}>
              Export CSV
            </Button>
            <Button startIcon={<PrintIcon />} variant="outlined" onClick={() => window.print()}>
              Print Report
            </Button>
          </Stack>
          <Button variant="outlined" onClick={() => setSelectedReport(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
