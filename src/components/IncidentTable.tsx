"use client";

import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { EmergencyCategory, Incident, IncidentStatus } from "@/types";
import { StatusChip } from "@/components/StatusChip";

type IncidentTableProps = {
  incidents: Incident[];
  onView?: (incident: Incident) => void;
  showVoice?: boolean;
};

export function IncidentTable({ incidents, onView, showVoice = false }: IncidentTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "All">("All");
  const [sortKey, setSortKey] = useState<keyof Pick<Incident, "category" | "deviceId" | "location" | "timestamp" | "status">>(
    "timestamp"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(incidents.map((incident) => incident.category)))] as Array<EmergencyCategory | "All">,
    [incidents]
  );
  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(incidents.map((incident) => incident.status)))] as Array<IncidentStatus | "All">,
    [incidents]
  );

  const visibleIncidents = useMemo(() => {
    return incidents
      .filter((incident) => categoryFilter === "All" || incident.category === categoryFilter)
      .filter((incident) => statusFilter === "All" || incident.status === statusFilter)
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

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(36,77,58,0.08)" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Incident ID</TableCell>
            <TableCell>
              <Select
                variant="standard"
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value as EmergencyCategory | "All");
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
              </Select>
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
              <Select
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
              </Select>
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
                  <Button size="small" variant="outlined" startIcon={<VolumeUpIcon />}>
                    Clip
                  </Button>
                </TableCell>
              )}
              <TableCell align="right">
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
