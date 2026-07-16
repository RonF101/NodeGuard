"use client";

import { useMemo, useState } from "react";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
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
      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
        {sortedResponders.map((responder) => {
          const canAssign = responder.availability === "Available";
          return (
            <Box component="article" key={responder.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{responder.name}</Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>{responder.agency} · {responder.role}</Typography>
                </Box>
                <StatusChip status={responder.availability} />
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1.5 }}>
                {[
                  ["Contact", responder.contactNumber],
                  ["Current Assignment", responder.currentAssignment],
                  ["Last Update", responder.lastStatusUpdate],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Button
                fullWidth
                sx={{ mt: 1.5 }}
                startIcon={<AssignmentIndIcon />}
                disabled={!canAssign}
                onClick={() => onAssign(responder)}
              >
                Assign to Incident
              </Button>
            </Box>
          );
        })}
        {!sortedResponders.length && <Typography color="text.secondary" sx={{ p: 2, textAlign: "center" }}>No responders match the selected filters.</Typography>}
      </Stack>
      <Table sx={{ display: { xs: "none", md: "table" } }}>
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
