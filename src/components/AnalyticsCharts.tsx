"use client";

import { useMemo, useState } from "react";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PlaceIcon from "@mui/icons-material/Place";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import ReviewsIcon from "@mui/icons-material/Reviews";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  analyticsIncidents,
  buildNodeAnalytics,
  countCategories,
  matchesValidationStatus
} from "@/data/analytics";
import { mdrrmoPalette } from "@/theme/theme";
import { getValidationResultLabel } from "@/config/incidentOperations";
import type {
  AlertLevel,
  AnalyticsIncident,
  EmergencyCategory,
  IncidentSourceType,
  IncidentStatus,
  NodeAnalyticsRow,
  ReportingChannel,
  ValidationResult,
  ValidationStatus,
} from "@/types";

type DateRange = "Today" | "This Week" | "This Month";
type NodeFilter = "All Nodes" | string;
type StatusFilter = "All" | ValidationStatus | "Resolved";

const categoryColors: Record<EmergencyCategory, string> = {
  "Medical Emergency": mdrrmoPalette.setBlue,
  "Security/Public Safety": "#1976D2",
  "Fire/Disaster Emergency": "#C65A12"
};

const riskColors: Record<NodeAnalyticsRow["riskLevel"], { bg: string; color: string }> = {
  "High Risk": { bg: mdrrmoPalette.setBlueSoft, color: mdrrmoPalette.setBlueDark },
  "Moderate Risk": { bg: "#FFF4D6", color: "#7A5200" },
  "Low Risk": { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  "Review Needed": { bg: "#FFE7D6", color: "#9A4A12" }
};

function isWithinRange(timestamp: string, range: DateRange, referenceDate: Date) {
  const incidentDate = new Date(timestamp.replace(" ", "T"));
  if (Number.isNaN(incidentDate.getTime())) return false;
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  if (range === "This Week") {
    const dayFromMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayFromMonday);
  } else if (range === "This Month") {
    start.setDate(1);
  }
  return incidentDate >= start && incidentDate <= referenceDate;
}

function AnalyticsSummaryCard({
  label,
  value,
  helper,
  icon,
  tone
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
              {label}
            </Typography>
            <Typography variant="h5" color="secondary" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${tone}1A`,
              color: tone,
              display: "grid",
              placeItems: "center"
            }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ height: { xs: 360, sm: 400 } }}>
      <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function AnalyticsFilters({
  dateRange,
  category,
  node,
  status,
  onDateRange,
  onCategory,
  onNode,
  onStatus,
  nodeChoices
}: {
  dateRange: DateRange;
  category: EmergencyCategory | "All";
  node: NodeFilter;
  status: StatusFilter;
  onDateRange: (value: DateRange) => void;
  onCategory: (value: EmergencyCategory | "All") => void;
  onNode: (value: NodeFilter) => void;
  onStatus: (value: StatusFilter) => void;
  nodeChoices: Array<{ deviceId: string; location: string }>;
}) {
  return (
    <Card>
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Date Range
            </Typography>
            <Select fullWidth value={dateRange} inputProps={{ "aria-label": "Date range" }} onChange={(event) => onDateRange(event.target.value as DateRange)}>
              {["Today", "This Week", "This Month"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item === "Confirmed" ? "Validated Incident" : item === "False Alarm" ? "False or Misleading Report" : item === "Pending Review" ? "Unverified Report" : item}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Category
            </Typography>
            <Select
              fullWidth
              value={category}
              inputProps={{ "aria-label": "Incident category" }}
              onChange={(event) => onCategory(event.target.value as EmergencyCategory | "All")}
            >
              {["All", "Medical Emergency", "Security/Public Safety", "Fire/Disaster Emergency"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Node
            </Typography>
            <Select fullWidth value={node} inputProps={{ "aria-label": "IoT node" }} onChange={(event) => onNode(event.target.value)}>
              <MenuItem value="All Nodes">All Nodes</MenuItem>
              {nodeChoices.map((option) => (
                <MenuItem key={option.deviceId} value={option.deviceId}>
                  {option.deviceId} - {option.location}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Status
            </Typography>
            <Select fullWidth value={status} inputProps={{ "aria-label": "Validation status" }} onChange={(event) => onStatus(event.target.value as StatusFilter)}>
              {["All", "Confirmed", "False Alarm", "Pending Review", "Resolved"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function ProneAreaCard({ row }: { row: NodeAnalyticsRow }) {
  const risk = riskColors[row.riskLevel];

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
              <Typography variant="h6" color="secondary">
                {row.location}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.deviceId}
              </Typography>
            </Box>
            <Chip label={row.riskLevel} sx={{ bgcolor: risk.bg, color: risk.color }} />
          </Stack>
          <Typography color="primary" sx={{ fontWeight: 800 }}>
            {row.mostCommonCategory}
          </Typography>
          <Typography variant="body2">
            {row.totalIncidents} alerts · {row.verified} verified · {row.falseAlarms} false
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rule-based suggestion: {row.recommendation}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function NodeAnalyticsTable({ rows }: { rows: NodeAnalyticsRow[] }) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(36,77,58,0.08)" }}>
      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
        {rows.map((row) => {
          const risk = riskColors[row.riskLevel];
          return (
            <Box component="article" key={row.deviceId} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{row.deviceId}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>{row.location}</Typography>
                </Box>
                <Chip size="small" label={row.riskLevel} sx={{ bgcolor: risk.bg, color: risk.color }} />
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1, mt: 1.5 }}>
                {[
                  ["Selected-period incidents", row.totalIncidents],
                  ["Confirmed", row.verified],
                  ["False or Misleading Reports", row.falseAlarms],
                  ["Pending", row.pending],
                  ["Medical", row.medical],
                  ["Security", row.security],
                  ["Fire / Disaster", row.fireDisaster],
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, fontWeight: 800 }}>Recommendation</Typography>
              <Typography variant="body2">{row.recommendation}</Typography>
            </Box>
          );
        })}
      </Stack>
      <Table sx={{ display: { xs: "none", md: "table" } }}>
        <TableHead>
          <TableRow>
            <TableCell>Device ID</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Incidents in Selected Period</TableCell>
            <TableCell>Medical</TableCell>
            <TableCell>Security/Public Safety</TableCell>
            <TableCell>Fire/Disaster</TableCell>
            <TableCell>Confirmed</TableCell>
            <TableCell>False or Misleading Reports</TableCell>
            <TableCell>Pending Review</TableCell>
            <TableCell>Risk Level</TableCell>
            <TableCell>Recommendation</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const risk = riskColors[row.riskLevel];
            return (
              <TableRow key={row.deviceId} hover>
                <TableCell sx={{ fontWeight: 800 }}>{row.deviceId}</TableCell>
                <TableCell>{row.location}</TableCell>
                <TableCell>{row.totalIncidents}</TableCell>
                <TableCell>{row.medical}</TableCell>
                <TableCell>{row.security}</TableCell>
                <TableCell>{row.fireDisaster}</TableCell>
                <TableCell>{row.verified}</TableCell>
                <TableCell>{row.falseAlarms}</TableCell>
                <TableCell>{row.pending}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.riskLevel} sx={{ bgcolor: risk.bg, color: risk.color }} />
                </TableCell>
                <TableCell sx={{ minWidth: 280 }}>{row.recommendation}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function AnalyticsCharts({
  incidents = analyticsIncidents,
  useLatestRecordAsReference = true,
}: {
  incidents?: AnalyticsIncident[];
  useLatestRecordAsReference?: boolean;
}) {
  const theme = useTheme();
  const compactCharts = useMediaQuery(theme.breakpoints.down("sm"));
  const [dateRange, setDateRange] = useState<DateRange>("This Week");
  const [category, setCategory] = useState<EmergencyCategory | "All">("All");
  const [node, setNode] = useState<NodeFilter>("All Nodes");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [barangay, setBarangay] = useState("All");
  const [severity, setSeverity] = useState<AlertLevel | "All">("All");
  const [channel, setChannel] = useState<ReportingChannel | "All">("All");
  const [source, setSource] = useState<IncidentSourceType | "All">("All");
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus | "All">("All");
  const [incidentSubtype, setIncidentSubtype] = useState("All");
  const [validationResult, setValidationResult] = useState<ValidationResult | "All">("All");

  const nodeChoices = useMemo(
    () => Array.from(
      new Map<string, { deviceId: string; location: string }>(
        incidents.flatMap((incident) => incident.deviceId
          ? [[incident.deviceId, { deviceId: incident.deviceId, location: incident.nodeLocation ?? incident.deviceId }] as const]
          : []),
      ).values(),
    ).sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
    [incidents],
  );
  const barangayChoices = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.barangayName).filter(Boolean) as string[])).toSorted(), [incidents]);
  const channelChoices = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.reportingChannel).filter(Boolean) as ReportingChannel[])).toSorted(), [incidents]);
  const subtypeChoices = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.incidentSubtype).filter(Boolean) as string[])).toSorted(), [incidents]);
  const validationChoices = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.validationResult).filter(Boolean) as ValidationResult[])).toSorted(), [incidents]);
  const incidentStatusChoices = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.status))).toSorted(), [incidents]);
  const referenceDate = useMemo(() => {
    if (!useLatestRecordAsReference) return new Date();
    const latest = incidents.reduce((maximum, incident) => {
      const value = new Date(incident.timestamp.replace(" ", "T")).getTime();
      return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
    }, 0);
    return latest ? new Date(latest + 86_399_999) : new Date();
  }, [incidents, useLatestRecordAsReference]);

  const filteredIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => isWithinRange(incident.timestamp, dateRange, referenceDate))
        .filter((incident) => category === "All" || incident.category === category)
        .filter((incident) => node === "All Nodes" || incident.deviceId === node)
        .filter((incident) => matchesValidationStatus(incident, status))
        .filter((incident) => barangay === "All" || incident.barangayName === barangay)
        .filter((incident) => severity === "All" || incident.priority === severity)
        .filter((incident) => channel === "All" || incident.reportingChannel === channel)
        .filter((incident) => source === "All" || incident.sourceType === source)
        .filter((incident) => incidentStatus === "All" || incident.status === incidentStatus)
        .filter((incident) => incidentSubtype === "All" || incident.incidentSubtype === incidentSubtype)
        .filter((incident) => validationResult === "All" || incident.validationResult === validationResult),
    [barangay, category, channel, dateRange, incidentStatus, incidentSubtype, incidents, node, referenceDate, severity, source, status, validationResult]
  );

  const nodeRows = useMemo(() => buildNodeAnalytics(filteredIncidents, nodeChoices), [filteredIncidents, nodeChoices]);
  const activeRows = nodeRows.filter((row) => row.totalIncidents > 0);

  const categoryCounts = countCategories(filteredIncidents);
  const incidentsByCategory = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  const incidentsByNode = nodeRows.map((row) => ({
    deviceId: row.deviceId.replace("LT-NODE-", "Node "),
    location: row.location,
    incidents: row.totalIncidents
  }));
  const validationByDevice = nodeRows.map((row) => ({
    deviceId: row.deviceId.replace("LT-NODE-", "Node "),
    verified: row.verified,
    falseAlarms: row.falseAlarms,
    pending: row.pending
  }));
  const categoryByDevice = nodeRows.map((row) => ({
    deviceId: row.deviceId.replace("LT-NODE-", "Node "),
    medical: row.medical,
    security: row.security,
    fireDisaster: row.fireDisaster
  }));
  const countBy = (key: (incident: AnalyticsIncident) => string) => Object.entries(
    filteredIncidents.reduce<Record<string, number>>((totals, incident) => {
      const label = key(incident);
      totals[label] = (totals[label] ?? 0) + 1;
      return totals;
    }, {}),
  ).map(([name, value]) => ({ name, value })).toSorted((a, b) => b.value - a.value);
  const incidentsByStatus = countBy((incident) => incident.status);
  const incidentsByChannel = countBy((incident) => incident.reportingChannel ?? "Not recorded");
  const incidentsByBarangay = countBy((incident) => incident.barangayName ?? "Municipal / unassigned");
  const incidentsBySeverity = countBy((incident) => incident.priority);
  const incidentsByDetailedType = countBy((incident) => incident.incidentSubtype ?? "Not recorded");
  const validationClassifications = countBy((incident) => incident.validationResult
    ? getValidationResultLabel(incident.validationResult)
    : incident.validationStatus === "Confirmed"
      ? "Validated Incident"
      : incident.validationStatus === "False Alarm"
        ? "False or Misleading Report"
        : "Unverified Report");
  const locationConcentration = countBy((incident) => incident.location ?? incident.nodeLocation ?? "Location not recorded");
  const escalationPatterns = countBy((incident) => incident.escalationStatus ?? "Not Escalated");
  const responseActivity = Object.entries(filteredIncidents.reduce<Record<string, number>>((totals, incident) => {
    if (["Assigned", "Dispatched", "Responding", "On Scene", "Resolved", "Closed"].includes(incident.status)) {
      totals[incident.status] = (totals[incident.status] ?? 0) + 1;
    }
    return totals;
  }, {})).map(([name, value]) => ({ name, value }));
  const responderActivity = Object.entries(filteredIncidents.reduce<Record<string, number>>((totals, incident) => {
    if (incident.assignedResponder && incident.assignedResponder !== "Unassigned") {
      totals[incident.assignedResponder] = (totals[incident.assignedResponder] ?? 0) + 1;
    }
    return totals;
  }, {})).map(([name, value]) => ({ name, value })).toSorted((a, b) => b.value - a.value);
  const resourceUtilization = Object.entries(filteredIncidents.flatMap((incident) => incident.assignedResources ?? []).reduce<Record<string, number>>((totals, resource) => {
    totals[resource.unitName] = (totals[resource.unitName] ?? 0) + 1;
    return totals;
  }, {})).map(([name, value]) => ({ name, value })).toSorted((a, b) => b.value - a.value);
  const iotActivations = Object.entries(filteredIncidents.filter((incident) => incident.sourceType === "IoT Node").reduce<Record<string, number>>((totals, incident) => {
    const label = incident.deviceId ?? "Node ID not recorded";
    totals[label] = (totals[label] ?? 0) + 1;
    return totals;
  }, {})).map(([name, value]) => ({ name, value })).toSorted((a, b) => b.value - a.value);
  const incidentTrend = Object.entries(filteredIncidents.reduce<Record<string, number>>((totals, incident) => {
    const day = incident.timestamp.slice(0, 10);
    totals[day] = (totals[day] ?? 0) + 1;
    return totals;
  }, {})).toSorted(([left], [right]) => left.localeCompare(right)).map(([name, value]) => ({ name, value }));
  const incidentTimeOfDay = Object.entries(filteredIncidents.reduce<Record<string, number>>((totals, incident) => {
    const date = new Date(incident.timestamp.replace(" ", "T"));
    const label = Number.isNaN(date.getTime())
      ? "Time not recorded"
      : new Intl.DateTimeFormat("en-PH", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Manila" }).format(date);
    totals[label] = (totals[label] ?? 0) + 1;
    return totals;
  }, {})).toSorted(([left], [right]) => left.localeCompare(right)).map(([name, value]) => ({ name, value }));

  const totalFiltered = filteredIncidents.length;
  const confirmedFiltered = filteredIncidents.filter((incident) => incident.validationStatus === "Confirmed").length;
  const falseFiltered = filteredIncidents.filter((incident) => incident.validationStatus === "False Alarm").length;
  const pendingFiltered = filteredIncidents.filter((incident) => incident.validationStatus === "Pending Review").length;
  const mostActiveNode = nodeRows.toSorted((a, b) => b.totalIncidents - a.totalIncidents)[0];
  const highestRisk = nodeRows.toSorted((a, b) => {
    const score = { "High Risk": 4, "Review Needed": 3, "Moderate Risk": 2, "Low Risk": 1 };
    return score[b.riskLevel] - score[a.riskLevel] || b.totalIncidents - a.totalIncidents;
  })[0];

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Matching Incidents"
            value={totalFiltered}
            helper="Manual reports and node activations"
            icon={<AnalyticsIcon />}
            tone={mdrrmoPalette.orange}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Confirmed Alerts"
            value={confirmedFiltered}
            helper="Confirmed emergency activity"
            icon={<FactCheckIcon />}
            tone={mdrrmoPalette.successGreen}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="False or Misleading Reports"
            value={falseFiltered}
            helper="Non-emergency activations"
            icon={<ReportProblemIcon />}
            tone={mdrrmoPalette.muted}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Pending Review"
            value={pendingFiltered}
            helper="Needs personnel review"
            icon={<ReviewsIcon />}
            tone={mdrrmoPalette.setBlueDark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Most Active Node"
            value={mostActiveNode?.deviceId.replace("LT-NODE-", "Node ") ?? "N/A"}
            helper={mostActiveNode?.location ?? "No active records"}
            icon={<PlaceIcon />}
            tone={mdrrmoPalette.darkGreen}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Highest Risk Location"
            value={highestRisk?.location ?? "N/A"}
            helper={highestRisk?.riskLevel ?? "No risk profile"}
            icon={<CrisisAlertIcon />}
            tone={mdrrmoPalette.setBlueDark}
          />
        </Grid>
      </Grid>

      <AnalyticsFilters
        dateRange={dateRange}
        category={category}
        node={node}
        status={status}
        onDateRange={setDateRange}
        onCategory={setCategory}
        onNode={setNode}
        onStatus={setStatus}
        nodeChoices={nodeChoices}
      />

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="secondary" sx={{ mb: 1.5, fontWeight: 900 }}>Operational record filters</Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={barangay} inputProps={{ "aria-label": "Barangay" }} onChange={(event) => setBarangay(event.target.value)} displayEmpty><MenuItem value="All">All barangays</MenuItem>{barangayChoices.map((item) => <MenuItem key={item} value={item}>Barangay {item}</MenuItem>)}</Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={severity} inputProps={{ "aria-label": "Severity" }} onChange={(event) => setSeverity(event.target.value as AlertLevel | "All")} displayEmpty><MenuItem value="All">All severities</MenuItem>{["Unassessed", "Critical", "High", "Moderate", "Low"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={channel} inputProps={{ "aria-label": "Reporting channel" }} onChange={(event) => setChannel(event.target.value as ReportingChannel | "All")} displayEmpty><MenuItem value="All">All reporting channels</MenuItem>{channelChoices.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={source} inputProps={{ "aria-label": "Incident source" }} onChange={(event) => setSource(event.target.value as IncidentSourceType | "All")} displayEmpty><MenuItem value="All">All incident sources</MenuItem><MenuItem value="Manual Entry">Manual Entry</MenuItem><MenuItem value="IoT Node">IoT Node</MenuItem></Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={incidentStatus} inputProps={{ "aria-label": "Workflow status" }} onChange={(event) => setIncidentStatus(event.target.value as IncidentStatus | "All")} displayEmpty><MenuItem value="All">All workflow statuses</MenuItem>{incidentStatusChoices.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={incidentSubtype} inputProps={{ "aria-label": "Detailed incident type" }} onChange={(event) => setIncidentSubtype(event.target.value)} displayEmpty><MenuItem value="All">All detailed types</MenuItem>{subtypeChoices.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Select fullWidth value={validationResult} inputProps={{ "aria-label": "Validation classification" }} onChange={(event) => setValidationResult(event.target.value as ValidationResult | "All")} displayEmpty><MenuItem value="All">All classifications</MenuItem>{validationChoices.map((item) => <MenuItem key={item} value={item}>{getValidationResultLabel(item)}</MenuItem>)}</Select></Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Button fullWidth variant="outlined" onClick={() => { setBarangay("All"); setSeverity("All"); setChannel("All"); setSource("All"); setIncidentStatus("All"); setIncidentSubtype("All"); setValidationResult("All"); }}>Clear operational filters</Button></Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>{filteredIncidents.length} record{filteredIncidents.length === 1 ? "" : "s"} match all selected filters.</Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incidents by Category">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={incidentsByCategory} outerRadius={compactCharts ? 72 : 96} label={!compactCharts} isAnimationActive={false}>
                  {incidentsByCategory.map((entry) => (
                    <Cell key={entry.name} fill={categoryColors[entry.name as EmergencyCategory]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incidents by Node">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentsByNode}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="deviceId" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="incidents" fill={mdrrmoPalette.darkGreen} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="False vs Confirmed Alarms per Device">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={validationByDevice}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="deviceId" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="verified" name="Validated Incident" fill={mdrrmoPalette.successGreen} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="falseAlarms" name="False or Misleading Report" fill={mdrrmoPalette.muted} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="pending" name="Unverified Report" fill={mdrrmoPalette.setBlueDark} radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incident Category Distribution per Node">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryByDevice}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="deviceId" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="medical" name="Medical" stackId="a" fill={categoryColors["Medical Emergency"]} isAnimationActive={false} />
                <Bar dataKey="security" name="Security/Public Safety" stackId="a" fill={categoryColors["Security/Public Safety"]} isAnimationActive={false} />
                <Bar dataKey="fireDisaster" name="Fire/Disaster" stackId="a" fill={categoryColors["Fire/Disaster Emergency"]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {[
          ["Incidents by Workflow Status", incidentsByStatus, mdrrmoPalette.setBlue],
          ["Incidents by Barangay", incidentsByBarangay, mdrrmoPalette.darkGreen],
          ["Incidents by Reporting Channel", incidentsByChannel, mdrrmoPalette.orange],
          ["Incidents by Severity", incidentsBySeverity, "#C65A12"],
          ["Incidents by Detailed Type", incidentsByDetailedType, "#5B6B7A"],
          ["Validation Classifications", validationClassifications, mdrrmoPalette.successGreen],
          ["Incident Trend by Date", incidentTrend, mdrrmoPalette.setBlue],
          ["Incident Activity by Hour (PHT)", incidentTimeOfDay, mdrrmoPalette.navy],
          ["Hotspot / Location Concentration", locationConcentration, "#C65A12"],
          ["Escalation Patterns", escalationPatterns, "#B26A00"],
          ["Response Activity", responseActivity, mdrrmoPalette.darkGreen],
          ["Responder Activity", responderActivity, mdrrmoPalette.setBlueDark],
          ["Assigned Resource Utilization", resourceUtilization, "#6A4C93"],
          ["IoT-Node Activations", iotActivations, "#187A8C"],
        ].map(([title, data, color]) => (
          <Grid key={title as string} size={{ xs: 12, lg: 6 }}>
            <ChartCard title={title as string}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data as Array<{ name: string; value: number }>} margin={{ left: 8, right: 8, bottom: compactCharts ? 48 : 64 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-24} textAnchor="end" height={compactCharts ? 84 : 96} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Incidents" fill={color as string} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        ))}
      </Grid>

      <Box>
        <Typography variant="h5" color="secondary" sx={{ mb: 2 }}>
          Rule-Based Decision Support Suggestions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These descriptive suggestions are derived from stored incident counts and validation patterns. They do not predict disasters or replace authorized personnel decisions.
        </Typography>
        <Grid container spacing={3}>
          {(activeRows.length ? activeRows : nodeRows).map((row) => (
            <Grid key={row.deviceId} size={{ xs: 12, md: 6, xl: 4 }}>
              <ProneAreaCard row={row} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h5" color="secondary" sx={{ mb: 2 }}>
            Detailed Node Analytics
          </Typography>
          <NodeAnalyticsTable rows={nodeRows} />
        </CardContent>
      </Card>
    </Stack>
  );
}

