"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import {
  formatPhilippineDateTime,
  formatRelativeTime,
  incidentStatusConfig,
  incidentStatusOrder,
  getIncidentStatusLabel,
  getValidationResultLabel,
  parseNodeGuardDate,
} from "@/config/incidentOperations";
import {
  alertLevelConfig,
  alertLevelOrder,
  sortIncidentsByAlertLevel,
} from "@/config/alertLevels";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { StatusChip } from "@/components/StatusChip";
import { IncidentActionsMenu } from "@/components/IncidentActionsMenu";
import type {
  EmergencyCategory,
  Incident,
  AlertLevel,
  IncidentStatus,
  IncidentSourceType,
  ReportingChannel,
} from "@/types";

type IncidentTableProps = {
  incidents: Incident[];
  onView?: (incident: Incident) => void;
  showVoice?: boolean;
  showFilters?: boolean;
  initialStatus?: IncidentStatus | "All";
  initialSearch?: string;
};

type SortKey =
  | "incident"
  | "alertLevel"
  | "timestamp"
  | "status";
type ColumnSortKey = SortKey;

const seenFieldNotesStorageKey = "nodeguard.seenFieldNotes";
const seenFieldNotesChangedEvent = "nodeguard:seen-field-notes-changed";

function getSeenFieldNotesSnapshot() {
  try {
    return window.localStorage.getItem(seenFieldNotesStorageKey) ?? "[]";
  } catch {
    return "[]";
  }
}

function getSeenFieldNotesServerSnapshot() {
  return "[]";
}

function subscribeToSeenFieldNotes(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === seenFieldNotesStorageKey) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(seenFieldNotesChangedEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(seenFieldNotesChangedEvent, onStoreChange);
  };
}

function noteKeyFor(incident: Incident) {
  return `${incident.id}:${incident.fieldNoteCount ?? 0}:${incident.latestFieldNoteAt ?? ""}`;
}

function compareIncidents(a: Incident, b: Incident, key: ColumnSortKey) {
  if (key === "timestamp") {
    return parseNodeGuardDate(a.timestamp).getTime() - parseNodeGuardDate(b.timestamp).getTime();
  }
  if (key === "alertLevel") {
    return alertLevelConfig[a.alertLevel].rank - alertLevelConfig[b.alertLevel].rank;
  }
  if (key === "status") {
    return incidentStatusConfig[a.status].order - incidentStatusConfig[b.status].order;
  }
  if (key === "incident") return a.id.localeCompare(b.id);
  return 0;
}

export function IncidentTable({
  incidents,
  onView,
  showVoice = false,
  showFilters = true,
  initialStatus = "All",
  initialSearch = "",
}: IncidentTableProps) {
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "All">(initialStatus);
  const [alertLevelFilter, setAlertLevelFilter] = useState<AlertLevel | "All">("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [barangayFilter, setBarangayFilter] = useState("All");
  const [validationFilter, setValidationFilter] = useState("All");
  const [escalationFilter, setEscalationFilter] = useState("All");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<IncidentSourceType | "All">("All");
  const [reportingChannelFilter, setReportingChannelFilter] = useState<ReportingChannel | "All">("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("alertLevel");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [relativeNow, setRelativeNow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const start = window.setTimeout(() => setRelativeNow(Date.now()), 0);
    const interval = window.setInterval(() => setRelativeNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, []);

  const seenNoteKeysSnapshot = useSyncExternalStore(
    subscribeToSeenFieldNotes,
    getSeenFieldNotesSnapshot,
    getSeenFieldNotesServerSnapshot,
  );
  const seenNoteKeys = useMemo(() => {
    try {
      return new Set(JSON.parse(seenNoteKeysSnapshot) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [seenNoteKeysSnapshot]);

  const locations = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.location))).toSorted(),
    [incidents],
  );
  const teams = useMemo(
    () =>
      Array.from(new Set(incidents.map((incident) => incident.assignedResponder)))
        .filter((team) => team !== "Unassigned")
        .toSorted(),
    [incidents],
  );
  const barangays = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.barangayName).filter(Boolean) as string[])).toSorted(),
    [incidents],
  );
  const validationResults = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.validationResult).filter(Boolean) as string[])).toSorted(),
    [incidents],
  );
  const reportingChannels = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.reportingChannel).filter(Boolean) as ReportingChannel[])).toSorted(),
    [incidents],
  );

  const visibleIncidents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = incidents.filter((incident) => {
      const searchable = [
        incident.id,
        incident.deviceId,
        incident.location,
        incident.assignedResponder,
        incident.barangayName,
        incident.validationResult,
        incident.sourceType,
        incident.reportingChannel,
        incident.reportingPersonOrSource,
        incident.reportingOffice,
        incident.incidentSubtype,
        incident.landmark,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (categoryFilter === "All" || incident.category === categoryFilter) &&
        (statusFilter === "All" || getIncidentStatusLabel(incident.status) === getIncidentStatusLabel(statusFilter)) &&
        (alertLevelFilter === "All" || incident.alertLevel === alertLevelFilter) &&
        (locationFilter === "All" || incident.location === locationFilter) &&
        (teamFilter === "All" || incident.assignedResponder === teamFilter) &&
        (barangayFilter === "All" || incident.barangayName === barangayFilter) &&
        (validationFilter === "All" || incident.validationResult === validationFilter) &&
        (sourceTypeFilter === "All" || incident.sourceType === sourceTypeFilter) &&
        (reportingChannelFilter === "All" || incident.reportingChannel === reportingChannelFilter) &&
        (escalationFilter === "All" || (escalationFilter === "Escalated" ? incident.escalationStatus && incident.escalationStatus !== "Not Escalated" : !incident.escalationStatus || incident.escalationStatus === "Not Escalated")) &&
        (!dateFrom || incident.timestamp.slice(0, 10) >= dateFrom) &&
        (!dateTo || incident.timestamp.slice(0, 10) <= dateTo)
      );
    });
    if (sortKey === "alertLevel") {
      return sortIncidentsByAlertLevel(filtered, sortDirection === "asc");
    }
    return filtered.toSorted((a, b) => {
      const comparison = compareIncidents(a, b, sortKey);
      if (comparison !== 0) return sortDirection === "asc" ? comparison : -comparison;
      return parseNodeGuardDate(b.timestamp).getTime() - parseNodeGuardDate(a.timestamp).getTime()
        || a.id.localeCompare(b.id);
    });
  }, [
    categoryFilter,
    barangayFilter,
    dateFrom,
    dateTo,
    escalationFilter,
    incidents,
    locationFilter,
    alertLevelFilter,
    search,
    sourceTypeFilter,
    reportingChannelFilter,
    sortDirection,
    sortKey,
    statusFilter,
    teamFilter,
    validationFilter,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(0), 0);
    return () => window.clearTimeout(timer);
  }, [search, categoryFilter, statusFilter, alertLevelFilter, locationFilter, teamFilter, barangayFilter, validationFilter, escalationFilter, sourceTypeFilter, reportingChannelFilter, dateFrom, dateTo, incidents.length]);

  const paginatedIncidents = useMemo(
    () => visibleIncidents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, visibleIncidents],
  );

  const handleSort = (nextKey: ColumnSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "alertLevel" ? "desc" : "asc");
  };

  const clearFilters = () => {
    setSearch(initialSearch);
    setCategoryFilter("All");
    setStatusFilter("All");
    setAlertLevelFilter("All");
    setLocationFilter("All");
    setTeamFilter("All");
    setBarangayFilter("All");
    setValidationFilter("All");
    setEscalationFilter("All");
    setSourceTypeFilter("All");
    setReportingChannelFilter("All");
    setDateFrom("");
    setDateTo("");
    setSortKey("alertLevel");
    setSortDirection("desc");
  };

  const handleViewUpdates = (incident: Incident) => {
    const next = new Set(seenNoteKeys).add(noteKeyFor(incident));
    window.localStorage.setItem(seenFieldNotesStorageKey, JSON.stringify(Array.from(next)));
    window.dispatchEvent(new CustomEvent(seenFieldNotesChangedEvent));
    onView?.(incident);
  };

  const reportedContent = (incident: Incident) => {
    const fullDate = `${formatPhilippineDateTime(incident.timestamp)} PHT`;
    return (
      <Tooltip title={fullDate} arrow>
        <Box component="span" sx={{ display: "inline-block" }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {relativeNow ? formatRelativeTime(incident.timestamp, relativeNow) : fullDate}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fullDate}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  const updateState = (incident: Incident) => {
    const count = incident.fieldNoteCount ?? 0;
    const unread = !seenNoteKeys.has(noteKeyFor(incident));
    const urgent = unread && ["Critical", "High"].includes(incident.alertLevel);
    return { count, unread, urgent };
  };

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
      {showFilters && (
        <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.25,
              alignItems: "center",
            }}
          >
            <TextField
              label="Search incidents"
              placeholder="ID, reporter, channel, location, node, or team"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
              sx={{ gridColumn: { md: "span 2" } }}
            />
            <TextField
              select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as EmergencyCategory | "All")}
              slotProps={{ htmlInput: { "aria-label": "Filter incidents by emergency category" } }}
              sx={{ display: { xs: "flex", md: "none" } }}
            >
              <MenuItem value="All">All Categories</MenuItem>
              <MenuItem value="Medical Emergency">Medical Emergency</MenuItem>
              <MenuItem value="Security/Public Safety">Security / Public Safety</MenuItem>
              <MenuItem value="Fire/Disaster Emergency">Fire / Disaster Emergency</MenuItem>
            </TextField>
            <TextField select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatus | "All")}>
              <MenuItem value="All">All statuses</MenuItem>
              {incidentStatusOrder.map((status) => <MenuItem key={status} value={status}>{getIncidentStatusLabel(status)}</MenuItem>)}
            </TextField>
            <TextField select label="Alert level" value={alertLevelFilter} onChange={(event) => setAlertLevelFilter(event.target.value as AlertLevel | "All")}>
              <MenuItem value="All">All alert levels</MenuItem>
              {alertLevelOrder.map((alertLevel) => <MenuItem key={alertLevel} value={alertLevel}>{alertLevel}</MenuItem>)}
            </TextField>
            <TextField select label="Source type" value={sourceTypeFilter} onChange={(event) => setSourceTypeFilter(event.target.value as IncidentSourceType | "All")}>
              <MenuItem value="All">All source types</MenuItem>
              <MenuItem value="Manual Entry">Manual Entry</MenuItem>
              <MenuItem value="IoT Node">IoT Node</MenuItem>
            </TextField>
            <TextField select label="Reporting channel" value={reportingChannelFilter} onChange={(event) => setReportingChannelFilter(event.target.value as ReportingChannel | "All")}>
              <MenuItem value="All">All reporting channels</MenuItem>
              {reportingChannels.map((channel) => <MenuItem key={channel} value={channel}>{channel}</MenuItem>)}
            </TextField>
            <TextField select label="Location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              <MenuItem value="All">All locations</MenuItem>
              {locations.map((location) => <MenuItem key={location} value={location}>{location}</MenuItem>)}
            </TextField>
            <TextField select label="Assigned team" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
              <MenuItem value="All">All teams</MenuItem>
              <MenuItem value="Unassigned">Unassigned</MenuItem>
              {teams.map((team) => <MenuItem key={team} value={team}>{team}</MenuItem>)}
            </TextField>
            {barangays.length > 0 && <TextField select label="Barangay" value={barangayFilter} onChange={(event) => setBarangayFilter(event.target.value)}>
              <MenuItem value="All">All barangays</MenuItem>
              {barangays.map((barangay) => <MenuItem key={barangay} value={barangay}>Barangay {barangay}</MenuItem>)}
            </TextField>}
            <TextField select label="Validation result" value={validationFilter} onChange={(event) => setValidationFilter(event.target.value)}>
              <MenuItem value="All">All validation results</MenuItem>
              {validationResults.map((result) => <MenuItem key={result} value={result}>{getValidationResultLabel(result as import("@/types").ValidationResult)}</MenuItem>)}
            </TextField>
            <TextField select label="Escalation" value={escalationFilter} onChange={(event) => setEscalationFilter(event.target.value)}>
              <MenuItem value="All">All escalation states</MenuItem>
              <MenuItem value="Escalated">Escalated</MenuItem>
              <MenuItem value="Local">Locally handled</MenuItem>
            </TextField>
            <TextField type="date" label="Date from" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label="Date to" value={dateTo} onChange={(event) => setDateTo(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Tooltip title="Reset filters and restore highest-alert-level-first order">
              <Button variant="outlined" startIcon={<FilterAltOffOutlinedIcon />} onClick={clearFilters}>
                Clear
              </Button>
            </Tooltip>
          </Box>
        </Box>
      )}

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
        {paginatedIncidents.map((incident) => {
          const updates = updateState(incident);
          return (
          <Box component="article" key={incident.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{incident.id}</Typography>
                  {showVoice && Boolean(incident.voiceContext && incident.voiceContext !== "No voice context") && (
                    <Tooltip title="Voice recording available"><VolumeUpOutlinedIcon color="primary" fontSize="small" /></Tooltip>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{incident.sourceType} · {incident.reportingChannel ?? "Channel not recorded"}{incident.deviceId ? ` · ${incident.deviceId}` : ""}</Typography>
              </Box>
              <AlertLevelChip alertLevel={incident.alertLevel} />
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
              <StatusChip status={incident.status} />
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{incident.category}</Typography>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.25, mt: 1.5 }}>
              <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Location</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{incident.location}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Reported</Typography>{reportedContent(incident)}</Box>
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Assigned Team</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{incident.assignedResponder}</Typography></Box>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", justifyContent: "space-between" }}>
              <Button variant="contained" onClick={() => onView?.(incident)}>Open incident</Button>
              <IncidentActionsMenu incidentId={incident.id} fieldNoteCount={updates.count} unreadUpdates={updates.unread} urgentUpdates={updates.urgent} onOpen={() => onView?.(incident)} onViewUpdates={() => handleViewUpdates(incident)} />
            </Stack>
          </Box>
          );
        })}
        {!visibleIncidents.length && <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>No incidents match the selected filters.</Typography>}
      </Stack>

      <Table sx={{ display: { xs: "none", md: "table" }, minWidth: 1100 }} aria-label="Live incident queue">
        <TableHead sx={{ "& .MuiTableCell-head": { position: "sticky", top: 0, zIndex: 2 } }}>
          <TableRow>
            <TableCell>
              <TableSortLabel active={sortKey === "incident"} direction={sortKey === "incident" ? sortDirection : "asc"} onClick={() => handleSort("incident")}>
                Incident
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "alertLevel"}
                direction={sortKey === "alertLevel" ? sortDirection : "desc"}
                onClick={() => handleSort("alertLevel")}
                aria-label="Sort by alert level"
              >
                Alert Level
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ minWidth: 190 }}>
              <FormControl fullWidth size="small" variant="standard">
                <Select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as EmergencyCategory | "All")}
                  aria-label="Filter incidents by emergency category"
                  disableUnderline
                  sx={{ fontWeight: 800, fontSize: "0.875rem" }}
                >
                  <MenuItem value="All">All Categories</MenuItem>
                  <MenuItem value="Medical Emergency">Medical Emergency</MenuItem>
                  <MenuItem value="Security/Public Safety">Security / Public Safety</MenuItem>
                  <MenuItem value="Fire/Disaster Emergency">Fire / Disaster Emergency</MenuItem>
                </Select>
              </FormControl>
            </TableCell>
            <TableCell>Location</TableCell>
            <TableCell>
              <TableSortLabel active={sortKey === "timestamp"} direction={sortKey === "timestamp" ? sortDirection : "asc"} onClick={() => handleSort("timestamp")}>
                Reported
              </TableSortLabel>
            </TableCell>
            <TableCell>Assigned Team</TableCell>
            <TableCell>
              <TableSortLabel active={sortKey === "status"} direction={sortKey === "status" ? sortDirection : "asc"} onClick={() => handleSort("status")}>
                Status
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sx={{ position: "sticky", right: 0, zIndex: 3, bgcolor: "#F8FAFC", boxShadow: "-6px 0 10px rgba(11,31,51,0.05)" }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedIncidents.map((incident) => {
            const updates = updateState(incident);
            return (
            <TableRow key={incident.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
              <TableCell>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <Box>
                    <Button variant="text" size="small" onClick={() => onView?.(incident)} sx={{ minHeight: 32, p: 0, justifyContent: "flex-start", fontWeight: 900 }}>{incident.id}</Button>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{incident.sourceType} · {incident.reportingChannel ?? "Channel not recorded"}{incident.deviceId ? ` · ${incident.deviceId}` : ""}</Typography>
                  </Box>
                  {showVoice && Boolean(incident.voiceContext && incident.voiceContext !== "No voice context") && (
                    <Tooltip title="Voice recording available"><VolumeUpOutlinedIcon color="primary" fontSize="small" /></Tooltip>
                  )}
                </Stack>
              </TableCell>
              <TableCell><AlertLevelChip alertLevel={incident.alertLevel} /></TableCell>
              <TableCell>{incident.category}</TableCell>
              <TableCell sx={{ minWidth: 180, maxWidth: 280 }}>
                <Tooltip title={incident.location}>
                  <Typography variant="body2" noWrap>{incident.location}</Typography>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ minWidth: 170 }}>{reportedContent(incident)}</TableCell>
              <TableCell sx={{ minWidth: 170, fontWeight: 700 }}>{incident.assignedResponder}</TableCell>
              <TableCell><StatusChip status={incident.status} /></TableCell>
              <TableCell align="right" sx={{ position: "sticky", right: 0, zIndex: 2, bgcolor: "background.paper", boxShadow: "-6px 0 10px rgba(11,31,51,0.05)" }}>
                <IncidentActionsMenu incidentId={incident.id} fieldNoteCount={updates.count} unreadUpdates={updates.unread} urgentUpdates={updates.urgent} onOpen={() => onView?.(incident)} onViewUpdates={() => handleViewUpdates(incident)} />
              </TableCell>
            </TableRow>
            );
          })}
          {!visibleIncidents.length && (
            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>No incidents match the selected filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={visibleIncidents.length}
        page={Math.min(page, Math.max(0, Math.ceil(visibleIncidents.length / rowsPerPage) - 1))}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Incidents per page"
      />
    </TableContainer>
  );
}
