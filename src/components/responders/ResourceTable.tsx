"use client";

import { useMemo, useState } from "react";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import { ResourceStatusChip } from "@/components/responders/ResourceStatusChip";
import { formatPhilippineDateTime } from "@/config/incidentOperations";
import { ResponseResource } from "@/types";

type ResourceTableProps = {
  resources: ResponseResource[];
  onAssign: (resource: ResponseResource) => void;
  onRelease: (resource: ResponseResource) => void;
  onUpdateStatus: (resource: ResponseResource) => void;
};

type SortKey = keyof Pick<
  ResponseResource,
  "id" | "type" | "unitName" | "agency" | "status" | "baseLocation" | "assignedIncident" | "notes" | "lastUpdated"
>;

const resourceColumns: Array<{ label: string; key: SortKey }> = [
  { label: "Resource ID", key: "id" },
  { label: "Type", key: "type" },
  { label: "Unit Name", key: "unitName" },
  { label: "Agency / Owner", key: "agency" },
  { label: "Status", key: "status" },
  { label: "Base Location", key: "baseLocation" },
  { label: "Assigned Incident", key: "assignedIncident" },
  { label: "Capacity / Notes", key: "notes" },
  { label: "Last Updated", key: "lastUpdated" }
];

export function ResourceTable({
  resources,
  onAssign,
  onRelease,
  onUpdateStatus,
}: ResourceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedResources = useMemo(
    () =>
      resources.toSorted((a, b) => {
        const result = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? result : -result;
      }),
    [resources, sortDirection, sortKey]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid rgba(36,77,58,0.08)" }}>
      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
        {sortedResources.map((resource) => {
          const canAssign = resource.status === "Available";
          return (
            <Box component="article" key={resource.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{resource.id} · {resource.unitName}</Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>{resource.type} · {resource.agency}</Typography>
                </Box>
                <ResourceStatusChip status={resource.status} />
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1.5 }}>
                {[
                  ["Base Location", resource.baseLocation],
                  ["Assigned Incident", resource.assignedIncident],
                  ["Last Updated", `${formatPhilippineDateTime(resource.lastUpdated)} PHT`],
                  ["Capacity / Notes", resource.notes],
                  ["Availability Note", resource.availabilityNote ?? "No condition note recorded"],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                {canAssign && (
                  <Button
                    fullWidth
                    startIcon={<AssignmentIndIcon />}
                    onClick={() => onAssign(resource)}
                  >
                    Assign to Incident
                  </Button>
                )}
                {resource.status === "Dispatched" ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    startIcon={<AssignmentReturnOutlinedIcon />}
                    onClick={() => onRelease(resource)}
                  >
                    Release
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<BuildOutlinedIcon />}
                    onClick={() => onUpdateStatus(resource)}
                  >
                    Update Availability
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}
        {!sortedResources.length && <Typography color="text.secondary" sx={{ p: 2, textAlign: "center" }}>No resources match the selected filters.</Typography>}
      </Stack>
      <Table sx={{ display: { xs: "none", md: "table" } }}>
        <TableHead>
          <TableRow>
            {resourceColumns.map((column) => (
              <TableCell key={column.key}>
                <TableSortLabel
                  active={sortKey === column.key}
                  direction={sortKey === column.key ? sortDirection : "asc"}
                  onClick={() => handleSort(column.key)}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedResources.map((resource) => {
            const canAssign = resource.status === "Available";
            return (
              <TableRow key={resource.id} hover>
                <TableCell sx={{ fontWeight: 800 }}>{resource.id}</TableCell>
                <TableCell>{resource.type}</TableCell>
                <TableCell>{resource.unitName}</TableCell>
                <TableCell>{resource.agency}</TableCell>
                <TableCell>
                  <ResourceStatusChip status={resource.status} />
                </TableCell>
                <TableCell>{resource.baseLocation}</TableCell>
                <TableCell>{resource.assignedIncident}</TableCell>
                <TableCell sx={{ minWidth: 240 }}>
                  <Typography variant="body2">{resource.notes}</Typography>
                  {resource.availabilityNote && (
                    <Typography variant="caption" color="text.secondary">
                      {resource.availabilityNote}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{formatPhilippineDateTime(resource.lastUpdated)} PHT</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                    {canAssign && (
                      <Button
                        size="small"
                        startIcon={<AssignmentIndIcon />}
                        onClick={() => onAssign(resource)}
                      >
                        Assign
                      </Button>
                    )}
                    {resource.status === "Dispatched" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<AssignmentReturnOutlinedIcon />}
                        onClick={() => onRelease(resource)}
                      >
                        Release
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<BuildOutlinedIcon />}
                        onClick={() => onUpdateStatus(resource)}
                      >
                        Availability
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
