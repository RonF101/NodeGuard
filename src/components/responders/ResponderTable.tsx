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
import { StatusChip } from "@/components/StatusChip";
import { Responder } from "@/types";

type ResponderTableProps = {
  responders: Responder[];
  onAssign: (responder: Responder) => void;
};

type SortKey = keyof Pick<
  Responder,
  "name" | "agency" | "role" | "contactNumber" | "availability" | "currentAssignment" | "lastStatusUpdate"
>;

const responderColumns: Array<{ label: string; key: SortKey }> = [
  { label: "Name", key: "name" },
  { label: "Agency / Unit", key: "agency" },
  { label: "Role", key: "role" },
  { label: "Contact", key: "contactNumber" },
  { label: "Status", key: "availability" },
  { label: "Current Assignment", key: "currentAssignment" },
  { label: "Last Update", key: "lastStatusUpdate" }
];

export function ResponderTable({ responders, onAssign }: ResponderTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("availability");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedResponders = useMemo(
    () =>
      responders.toSorted((a, b) => {
        const result = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? result : -result;
      }),
    [responders, sortDirection, sortKey]
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
            {responderColumns.map((column) => (
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
          {sortedResponders.map((responder) => {
            const canAssign = responder.availability === "Available";
            return (
              <TableRow key={responder.id} hover>
                <TableCell sx={{ fontWeight: 800 }}>{responder.name}</TableCell>
                <TableCell>{responder.agency}</TableCell>
                <TableCell>{responder.role}</TableCell>
                <TableCell>{responder.contactNumber}</TableCell>
                <TableCell>
                  <StatusChip status={responder.availability} />
                </TableCell>
                <TableCell>{responder.currentAssignment}</TableCell>
                <TableCell>{responder.lastStatusUpdate}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<AssignmentIndIcon />}
                    disabled={!canAssign}
                    onClick={() => onAssign(responder)}
                  >
                    Assign to Incident
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
