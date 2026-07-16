"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
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
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MarkUnreadChatAltIcon from "@mui/icons-material/MarkUnreadChatAlt";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { EmergencyCategory, Incident, IncidentStatus } from "@/types";
import { StatusChip } from "@/components/StatusChip";

type IncidentTableProps = {
  incidents: Incident[];
  onView?: (incident: Incident) => void;
  showVoice?: boolean;
  showFilters?: boolean;
};

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

export function IncidentTable({
  incidents,
  onView,
  showVoice = false,
  showFilters = true,
}: IncidentTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<
    EmergencyCategory | "All"
  >("All");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "All">(
    "All",
  );
  const seenNoteKeysSnapshot = useSyncExternalStore(
    subscribeToSeenFieldNotes,
    getSeenFieldNotesSnapshot,
    getSeenFieldNotesServerSnapshot,
  );
  const seenNoteKeys = useMemo(() => {
    try {
      return new Set(JSON.parse(seenNoteKeysSnapshot) as string[]);
    } catch {
      return new Set();
    }
  }, [seenNoteKeysSnapshot]);
  const [sortKey, setSortKey] =
    useState<
      keyof Pick<
        Incident,
        "category" | "deviceId" | "location" | "timestamp" | "status"
      >
    >("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const categories = useMemo(
    () =>
      [
        "All",
        ...Array.from(new Set(incidents.map((incident) => incident.category))),
      ] as Array<EmergencyCategory | "All">,
    [incidents],
  );
  const statuses = useMemo(
    () =>
      [
        "All",
        ...Array.from(new Set(incidents.map((incident) => incident.status))),
      ] as Array<IncidentStatus | "All">,
    [incidents],
  );

  const visibleIncidents = useMemo(() => {
    return incidents
      .filter(
        (incident) =>
          categoryFilter === "All" || incident.category === categoryFilter,
      )
      .filter(
        (incident) =>
          statusFilter === "All" || incident.status === statusFilter,
      )
      .toSorted((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        const result = String(aValue).localeCompare(String(bValue));
        return sortDirection === "asc" ? result : -result;
      });
  }, [categoryFilter, incidents, sortDirection, sortKey, statusFilter]);

  const handleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const handleViewNotes = (incident: Incident) => {
    const noteKey = `${incident.id}:${incident.fieldNoteCount ?? 0}:${incident.latestFieldNoteAt ?? ""}`;
    const next = new Set(seenNoteKeys).add(noteKey);
    window.localStorage.setItem(
      seenFieldNotesStorageKey,
      JSON.stringify(Array.from(next)),
    );
    window.dispatchEvent(new CustomEvent(seenFieldNotesChangedEvent));
    onView?.(incident);
  };

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: "1px solid rgba(36,77,58,0.08)" }}
    >
      {showFilters && <Box sx={{ display: { xs: "block", md: "none" }, p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            select
            fullWidth
            label="Category"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value as EmergencyCategory | "All");
              setSortKey("category");
            }}
          >
            {categories.map((category) => (
              <MenuItem key={category} value={category}>{category}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as IncidentStatus | "All");
              setSortKey("status");
            }}
          >
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>}

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
        {visibleIncidents.map((incident) => {
          const noteKey = `${incident.id}:${incident.fieldNoteCount ?? 0}:${incident.latestFieldNoteAt ?? ""}`;
          return (
            <Box
              component="article"
              key={incident.id}
              sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{incident.id}</Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>{incident.category}</Typography>
                </Box>
                <StatusChip status={incident.status} />
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1.5 }}>
                {[
                  ["Device", incident.deviceId],
                  ["Location", incident.location],
                  ["Timestamp", incident.timestamp],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                {showVoice && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<VolumeUpIcon />}
                    onClick={() => onView?.(incident)}
                    disabled={incident.voiceContext === "No voice context"}
                  >
                    Voice Context
                  </Button>
                )}
                {Boolean(incident.fieldNoteCount) && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color={seenNoteKeys.has(noteKey) ? "primary" : "secondary"}
                    startIcon={<MarkUnreadChatAltIcon />}
                    onClick={() => handleViewNotes(incident)}
                  >
                    Field Notes ({incident.fieldNoteCount})
                  </Button>
                )}
                <Button fullWidth onClick={() => onView?.(incident)}>View Incident</Button>
              </Stack>
            </Box>
          );
        })}
        {!visibleIncidents.length && (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: "center" }}>No incidents match the selected filters.</Typography>
        )}
      </Stack>

      <Table sx={{ display: { xs: "none", md: "table" } }}>
        <TableHead>
          <TableRow>
            <TableCell>Incident ID</TableCell>
            <TableCell>
              {showFilters ? <Select
                variant="standard"
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(
                    event.target.value as EmergencyCategory | "All",
                  );
                  setSortKey("category");
                }}
                disableUnderline
                sx={{ fontSize: 14, minWidth: 140 }}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category === "All" ? "Category" : category}
                  </MenuItem>
                ))}
              </Select> : "Category"}
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "deviceId"}
                direction={sortKey === "deviceId" ? sortDirection : "asc"}
                onClick={() => handleSort("deviceId")}
              >
                Device
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "location"}
                direction={sortKey === "location" ? sortDirection : "asc"}
                onClick={() => handleSort("location")}
              >
                Location
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "timestamp"}
                direction={sortKey === "timestamp" ? sortDirection : "asc"}
                onClick={() => handleSort("timestamp")}
              >
                Timestamp
              </TableSortLabel>
            </TableCell>
            <TableCell>
              {showFilters ? <Select
                variant="standard"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as IncidentStatus | "All");
                  setSortKey("status");
                }}
                disableUnderline
                sx={{ fontSize: 14, minWidth: 116 }}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status === "All" ? "Status" : status}
                  </MenuItem>
                ))}
              </Select> : "Status"}
            </TableCell>
            {showVoice && <TableCell>Voice Context</TableCell>}
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleIncidents.map((incident) => (
            <TableRow key={incident.id} hover>
              <TableCell sx={{ fontWeight: 800 }}>{incident.id}</TableCell>
              <TableCell>{incident.category}</TableCell>
              <TableCell>{incident.deviceId}</TableCell>
              <TableCell>{incident.location}</TableCell>
              <TableCell>{incident.timestamp}</TableCell>
              <TableCell>
                <StatusChip status={incident.status} />
              </TableCell>
              {showVoice && (
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VolumeUpIcon />}
                    onClick={() => onView?.(incident)}
                    disabled={incident.voiceContext === "No voice context"}
                  >
                    Context
                  </Button>
                </TableCell>
              )}
              <TableCell align="right">
                {Boolean(incident.fieldNoteCount) && (
                  <Tooltip
                    title={`${incident.fieldNoteCount} field note${incident.fieldNoteCount === 1 ? "" : "s"} received`}
                  >
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewNotes(incident)}
                      aria-label="View field notes"
                    >
                      <Badge
                        badgeContent={incident.fieldNoteCount}
                        color="error"
                        invisible={seenNoteKeys.has(
                          `${incident.id}:${incident.fieldNoteCount ?? 0}:${incident.latestFieldNoteAt ?? ""}`,
                        )}
                      >
                        <MarkUnreadChatAltIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}
                <Button size="small" onClick={() => onView?.(incident)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
