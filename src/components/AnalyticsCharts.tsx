"use client";

import { useMemo, useState } from "react";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PlaceIcon from "@mui/icons-material/Place";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import ReviewsIcon from "@mui/icons-material/Reviews";
import Box from "@mui/material/Box";
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
  matchesValidationStatus,
  nodeOptions
} from "@/data/analytics";
import { mdrrmoPalette } from "@/theme/theme";
import { EmergencyCategory, NodeAnalyticsRow, ValidationStatus } from "@/types";

type DateRange = "Today" | "This Week" | "This Month";
type NodeFilter = "All Nodes" | string;
type StatusFilter = "All" | ValidationStatus | "Resolved";

const categoryColors: Record<EmergencyCategory, string> = {
  "Medical Emergency": mdrrmoPalette.alertRed,
  "Security/Public Safety": "#1976D2",
  "Fire/Disaster Emergency": "#C65A12"
};

const riskColors: Record<NodeAnalyticsRow["riskLevel"], { bg: string; color: string }> = {
  "High Risk": { bg: "#FFEBEE", color: mdrrmoPalette.alertRed },
  "Moderate Risk": { bg: "#FFF4D6", color: "#7A5200" },
  "Low Risk": { bg: "#E7F4E8", color: mdrrmoPalette.successGreen },
  "Review Needed": { bg: "#FFE7D6", color: "#9A4A12" }
};

function isWithinRange(timestamp: string, range: DateRange) {
  const day = Number(timestamp.slice(8, 10));
  if (range === "Today") return timestamp.startsWith("2026-07-06");
  if (range === "This Week") return timestamp.startsWith("2026-07-") && day >= 1 && day <= 6;
  return timestamp.startsWith("2026-07-") || timestamp.startsWith("2026-06-");
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
    <Card sx={{ height: 380 }}>
      <CardContent sx={{ height: "100%" }}>
        <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {children}
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
  onStatus
}: {
  dateRange: DateRange;
  category: EmergencyCategory | "All";
  node: NodeFilter;
  status: StatusFilter;
  onDateRange: (value: DateRange) => void;
  onCategory: (value: EmergencyCategory | "All") => void;
  onNode: (value: NodeFilter) => void;
  onStatus: (value: StatusFilter) => void;
}) {
  return (
    <Card>
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Date Range
            </Typography>
            <Select fullWidth value={dateRange} onChange={(event) => onDateRange(event.target.value as DateRange)}>
              {["Today", "This Week", "This Month"].map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
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
            <Select fullWidth value={node} onChange={(event) => onNode(event.target.value)}>
              <MenuItem value="All Nodes">All Nodes</MenuItem>
              {nodeOptions.map((option) => (
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
            <Select fullWidth value={status} onChange={(event) => onStatus(event.target.value as StatusFilter)}>
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
          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
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
            {row.recommendation}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function NodeAnalyticsTable({ rows }: { rows: NodeAnalyticsRow[] }) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(36,77,58,0.08)" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Device ID</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Total Incidents</TableCell>
            <TableCell>Medical</TableCell>
            <TableCell>Security/Public Safety</TableCell>
            <TableCell>Fire/Disaster</TableCell>
            <TableCell>Confirmed</TableCell>
            <TableCell>False Alarms</TableCell>
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

export function AnalyticsCharts() {
  const [dateRange, setDateRange] = useState<DateRange>("This Week");
  const [category, setCategory] = useState<EmergencyCategory | "All">("All");
  const [node, setNode] = useState<NodeFilter>("All Nodes");
  const [status, setStatus] = useState<StatusFilter>("All");

  const filteredIncidents = useMemo(
    () =>
      analyticsIncidents
        .filter((incident) => isWithinRange(incident.timestamp, dateRange))
        .filter((incident) => category === "All" || incident.category === category)
        .filter((incident) => node === "All Nodes" || incident.deviceId === node)
        .filter((incident) => matchesValidationStatus(incident, status)),
    [category, dateRange, node, status]
  );

  const weeklyIncidents = analyticsIncidents.filter((incident) => isWithinRange(incident.timestamp, "This Week"));
  const nodeRows = useMemo(() => buildNodeAnalytics(filteredIncidents), [filteredIncidents]);
  const weeklyRows = useMemo(() => buildNodeAnalytics(weeklyIncidents), [weeklyIncidents]);
  const activeRows = nodeRows.filter((row) => row.totalIncidents > 0);

  const categoryCounts = countCategories(filteredIncidents);
  const incidentsByCategory = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  const incidentsByNode = nodeRows.map((row) => ({
    deviceId: row.deviceId.replace("LT-NODE-", "Node "),
    location: row.location,
    incidents: row.totalIncidents
  }));
  const validationByDevice = weeklyRows.map((row) => ({
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

  const totalThisWeek = weeklyIncidents.length;
  const verifiedThisWeek = weeklyIncidents.filter((incident) => incident.validationStatus === "Confirmed").length;
  const falseThisWeek = weeklyIncidents.filter((incident) => incident.validationStatus === "False Alarm").length;
  const pendingThisWeek = weeklyIncidents.filter((incident) => incident.validationStatus === "Pending Review").length;
  const mostActiveNode = weeklyRows.toSorted((a, b) => b.totalIncidents - a.totalIncidents)[0];
  const highestRisk = weeklyRows.toSorted((a, b) => {
    const score = { "High Risk": 4, "Review Needed": 3, "Moderate Risk": 2, "Low Risk": 1 };
    return score[b.riskLevel] - score[a.riskLevel] || b.totalIncidents - a.totalIncidents;
  })[0];

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Total Alerts This Week"
            value={totalThisWeek}
            helper="All NodeGuard activations"
            icon={<AnalyticsIcon />}
            tone={mdrrmoPalette.orange}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Confirmed Alerts"
            value={verifiedThisWeek}
            helper="Confirmed emergency activity"
            icon={<FactCheckIcon />}
            tone={mdrrmoPalette.successGreen}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="False Alarms"
            value={falseThisWeek}
            helper="Non-emergency activations"
            icon={<ReportProblemIcon />}
            tone={mdrrmoPalette.alertRed}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Pending Review"
            value={pendingThisWeek}
            helper="Needs personnel review"
            icon={<ReviewsIcon />}
            tone={mdrrmoPalette.warningAmber}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <AnalyticsSummaryCard
            label="Most Active Node"
            value={mostActiveNode?.deviceId ?? "N/A"}
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
            tone={mdrrmoPalette.alertRed}
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
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incidents by Category">
            <ResponsiveContainer width="100%" height="82%">
              <PieChart>
                <Pie dataKey="value" data={incidentsByCategory} outerRadius={96} label>
                  {incidentsByCategory.map((entry) => (
                    <Cell key={entry.name} fill={categoryColors[entry.name as EmergencyCategory]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incidents by Node">
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={incidentsByNode}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="deviceId" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="incidents" fill={mdrrmoPalette.darkGreen} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="False vs Confirmed Alarms per Device This Week">
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={validationByDevice}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="deviceId" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="verified" name="Confirmed" fill={mdrrmoPalette.successGreen} radius={[5, 5, 0, 0]} />
                <Bar dataKey="falseAlarms" name="False Alarm" fill={mdrrmoPalette.alertRed} radius={[5, 5, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={mdrrmoPalette.warningAmber} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incident Category Distribution per Node">
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={categoryByDevice}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="deviceId" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="medical" name="Medical" stackId="a" fill={categoryColors["Medical Emergency"]} />
                <Bar dataKey="security" name="Security/Public Safety" stackId="a" fill={categoryColors["Security/Public Safety"]} />
                <Bar dataKey="fireDisaster" name="Fire/Disaster" stackId="a" fill={categoryColors["Fire/Disaster Emergency"]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      <Box>
        <Typography variant="h5" color="secondary" sx={{ mb: 2 }}>
          Prone Area Insights
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

