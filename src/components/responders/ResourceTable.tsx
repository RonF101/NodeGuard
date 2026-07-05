"use client";

import { useMemo, useState } from "react";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import { ResourceStatusChip } from "@/components/responders/ResourceStatusChip";
import { ResponseResource } from "@/types";

type ResourceTableProps = {
  resources: ResponseResource[];
  onAssign: (resource: ResponseResource) => void;
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
  { label: "Assigned Team", key: "assignedIncident" },
  { label: "Capacity / Notes", key: "notes" },
  { label: "Last Updated", key: "lastUpdated" }
];

export function ResourceTable({ resources, onAssign }: ResourceTableProps) {
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
      <Table>
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
                <TableCell sx={{ minWidth: 220 }}>{resource.notes}</TableCell>
                <TableCell>{resource.lastUpdated}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<AssignmentIndIcon />}
                    disabled={!canAssign}
                    onClick={() => onAssign(resource)}
                  >
                    Assign to Team
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
