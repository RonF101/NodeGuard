"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import MarkUnreadChatAltOutlinedIcon from "@mui/icons-material/MarkUnreadChatAltOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import {
  formatPhilippineDateTime,
  formatRelativeTime,
  incidentPriorityConfig,
  incidentStatusConfig,
  incidentStatusOrder,
  parseNodeGuardDate,
  priorityOrder,
  sortIncidentQueue,
} from "@/config/incidentOperations";
import { PriorityChip } from "@/components/PriorityChip";
import { StatusChip } from "@/components/StatusChip";
import type {
  EmergencyCategory,
  Incident,
  IncidentPriority,
  IncidentStatus,
} from "@/types";

type IncidentTableProps = {
  incidents: Incident[];
  onView?: (incident: Incident) => void;
  showVoice?: boolean;
  showFilters?: boolean;
  initialStatus?: IncidentStatus | "All";
};

type SortKey =
  | "queue"
  | "incident"
  | "priority"
  | "category"
  | "location"
  | "timestamp"
  | "assignedResponder"
  | "status";
type ColumnSortKey = Exclude<SortKey, "queue">;

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
  if (key === "priority") {
    return incidentPriorityConfig[a.priority].order - incidentPriorityConfig[b.priority].order;
  }
  if (key === "status") {
    return incidentStatusConfig[a.status].order - incidentStatusConfig[b.status].order;
  }
  if (key === "incident") return a.id.localeCompare(b.id);
  return String(a[key]).localeCompare(String(b[key]));
}

export function IncidentTable({
  incidents,
  onView,
  showVoice = false,
  showFilters = true,
  initialStatus = "All",
}: IncidentTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "All">(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState<IncidentPriority | "All">("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("queue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [relativeNow, setRelativeNow] = useState<number | null>(null);

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

  const categories = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.category))).toSorted(),
    [incidents],
  );
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

  const visibleIncidents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = incidents.filter((incident) => {
      const searchable = [
        incident.id,
        incident.deviceId,
        incident.location,
        incident.assignedResponder,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (categoryFilter === "All" || incident.category === categoryFilter) &&
        (statusFilter === "All" || incident.status === statusFilter) &&
        (priorityFilter === "All" || incident.priority === priorityFilter) &&
        (locationFilter === "All" || incident.location === locationFilter) &&
        (teamFilter === "All" || incident.assignedResponder === teamFilter)
      );
    });
    if (sortKey === "queue") return sortIncidentQueue(filtered);
    return filtered.toSorted((a, b) => {
      const comparison = compareIncidents(a, b, sortKey);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    categoryFilter,
    incidents,
    locationFilter,
    priorityFilter,
    search,
    sortDirection,
    sortKey,
    statusFilter,
    teamFilter,
  ]);

  const handleSort = (nextKey: ColumnSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setPriorityFilter("All");
    setLocationFilter("All");
    setTeamFilter("All");
    setSortKey("queue");
    setSortDirection("asc");
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

  const updateButton = (incident: Incident, fullWidth = false) => {
    const count = incident.fieldNoteCount ?? 0;
    if (!count) return null;
    const unread = !seenNoteKeys.has(noteKeyFor(incident));
    const urgent = unread && ["Critical", "High"].includes(incident.priority);
    const tooltip = `${count} field update${count === 1 ? "" : "s"}. ${unread ? "Unread" : "Previously opened"}${urgent ? " and urgent." : "."}`;
    return (
      <Tooltip title={tooltip} arrow>
        <Button
          fullWidth={fullWidth}
          size="small"
          variant="text"
          color={urgent ? "error" : "inherit"}
          startIcon={
            <Badge
              badgeContent={count}
              color={urgent ? "error" : "default"}
              invisible={!unread}
            >
              <MarkUnreadChatAltOutlinedIcon fontSize="small" />
            </Badge>
          }
          onClick={() => handleViewUpdates(incident)}
          aria-label={`Updates for ${incident.id}: ${tooltip}`}
        >
          Updates
        </Button>
      </Tooltip>
    );
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
              placeholder="Incident ID, node, location, or team"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
              sx={{ gridColumn: { md: "span 2" } }}
            />
            <TextField select label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as EmergencyCategory | "All")}>
              <MenuItem value="All">All categories</MenuItem>
              {categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
            </TextField>
            <TextField select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatus | "All")}>
              <MenuItem value="All">All statuses</MenuItem>
              {incidentStatusOrder.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
            <TextField select label="Priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as IncidentPriority | "All")}>
              <MenuItem value="All">All priorities</MenuItem>
              {priorityOrder.map((priority) => <MenuItem key={priority} value={priority}>{priority}</MenuItem>)}
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
            <Tooltip title="Reset filters and restore operational queue order">
              <Button variant="outlined" startIcon={<FilterAltOffOutlinedIcon />} onClick={clearFilters}>
                Clear
              </Button>
            </Tooltip>
          </Box>
        </Box>
      )}

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
        {visibleIncidents.map((incident) => (
          <Box component="article" key={incident.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{incident.id}</Typography>
                  {showVoice && incident.voiceContext !== "No voice context" && (
                    <Tooltip title="Voice recording available"><VolumeUpOutlinedIcon color="primary" fontSize="small" /></Tooltip>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{incident.deviceId}</Typography>
              </Box>
              <PriorityChip priority={incident.priority} />
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
              {updateButton(incident, true)}
              <Button fullWidth variant="contained" startIcon={<OpenInNewOutlinedIcon />} onClick={() => onView?.(incident)}>Open</Button>
            </Stack>
          </Box>
        ))}
        {!visibleIncidents.length && <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>No incidents match the selected filters.</Typography>}
      </Stack>

      <Table sx={{ display: { xs: "none", md: "table" }, minWidth: 1100 }} aria-label="Live incident queue">
        <TableHead>
          <TableRow>
            {([
              ["Incident", "incident"],
              ["Priority", "priority"],
              ["Category", "category"],
              ["Location", "location"],
              ["Reported", "timestamp"],
              ["Assigned Team", "assignedResponder"],
              ["Status", "status"],
            ] as const).map(([label, key]) => (
              <TableCell key={key}>
                <TableSortLabel active={sortKey === key} direction={sortKey === key ? sortDirection : "asc"} onClick={() => handleSort(key)}>
                  {label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell align="right" sx={{ position: "sticky", right: 0, zIndex: 3, bgcolor: "#F8FAFC", boxShadow: "-6px 0 10px rgba(11,31,51,0.05)" }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleIncidents.map((incident) => (
            <TableRow key={incident.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
              <TableCell>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" color="secondary" sx={{ fontWeight: 900 }}>{incident.id}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{incident.deviceId}</Typography>
                  </Box>
                  {showVoice && incident.voiceContext !== "No voice context" && (
                    <Tooltip title="Voice recording available"><VolumeUpOutlinedIcon color="primary" fontSize="small" /></Tooltip>
                  )}
                </Stack>
              </TableCell>
              <TableCell><PriorityChip priority={incident.priority} /></TableCell>
              <TableCell>{incident.category}</TableCell>
              <TableCell sx={{ minWidth: 180 }}>{incident.location}</TableCell>
              <TableCell sx={{ minWidth: 170 }}>{reportedContent(incident)}</TableCell>
              <TableCell sx={{ minWidth: 170, fontWeight: 700 }}>{incident.assignedResponder}</TableCell>
              <TableCell><StatusChip status={incident.status} /></TableCell>
              <TableCell align="right" sx={{ position: "sticky", right: 0, zIndex: 2, bgcolor: "background.paper", boxShadow: "-6px 0 10px rgba(11,31,51,0.05)" }}>
                <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                  {updateButton(incident)}
                  <Button size="small" variant="contained" onClick={() => onView?.(incident)}>Open</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!visibleIncidents.length && (
            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>No incidents match the selected filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
