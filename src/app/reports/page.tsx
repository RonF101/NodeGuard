"use client";

import { useState } from "react";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Button from "@mui/material/Button";
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
import { Report } from "@/types";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <AppShell>
      <PageHeader eyebrow="Incident Records" title="Reports" />
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Date From" type="date" slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Date To" type="date" slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField select fullWidth label="Category" defaultValue="All">
                {["All", "Medical Emergency", "Security/Public Safety", "Fire/Disaster Emergency"].map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Location" placeholder="Pico, Km. 4, Market" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid key={report.id} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
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
                  Closed: {report.closedAt}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lead Agency: {report.leadAgency} - Response Time: {report.responseTime}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => setSelectedReport(report)}
                >
                  View Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
                  ["Closed At", selectedReport.closedAt],
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
            <Button startIcon={<PictureAsPdfIcon />}>Export PDF</Button>
            <Button startIcon={<FileDownloadIcon />} color="secondary">
              Export CSV
            </Button>
            <Button startIcon={<PrintIcon />} variant="outlined">
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
