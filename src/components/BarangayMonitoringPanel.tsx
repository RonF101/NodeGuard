import Link from "next/link";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { DeviceNode, Incident, Responder, ResponseResource } from "@/types";

type BarangayMonitoringPanelProps = {
  incidents: Incident[];
  responders: Responder[];
  resources: ResponseResource[];
  nodes: DeviceNode[];
};

export function BarangayMonitoringPanel({ incidents, responders, resources, nodes }: BarangayMonitoringPanelProps) {
  const names = Array.from(new Set([
    ...incidents.map((item) => item.barangayName).filter(Boolean),
    ...responders.map((item) => item.barangayName).filter(Boolean),
    ...resources.map((item) => item.barangayName).filter(Boolean),
    ...nodes.map((item) => item.barangayName).filter(Boolean),
  ] as string[])).toSorted();
  const rows = names.map((name) => {
    const barangayIncidents = incidents.filter((item) => item.barangayName === name);
    return {
      name,
      active: barangayIncidents.filter((item) => !["Resolved", "Closed", "Cancelled", "False Alert"].includes(item.status)).length,
      critical: barangayIncidents.filter((item) => item.alertLevel === "Critical" && !["Resolved", "Closed", "Cancelled", "False Alert"].includes(item.status)).length,
      pending: barangayIncidents.filter((item) => ["Reported", "Pending Validation", "Pending Verification"].includes(item.status)).length,
      awaiting: barangayIncidents.filter((item) => ["Validated", "Verified"].includes(item.status) && item.assignedResponder === "Unassigned").length,
      escalations: barangayIncidents.filter((item) => item.escalationStatus && !["Not Escalated", "Completed"].includes(item.escalationStatus)).length,
      responders: responders.filter((item) => item.barangayName === name && item.availability === "Available").length,
      resources: resources.filter((item) => item.barangayName === name && item.status === "Available").length,
      unhealthyNodes: nodes.filter((item) => item.barangayName === name && (item.status !== "Online" || item.deviceHealth !== "Healthy")).length,
    };
  }).toSorted((a, b) => Number(Boolean(b.critical || b.escalations || b.unhealthyNodes)) - Number(Boolean(a.critical || a.escalations || a.unhealthyNodes)) || b.active - a.active || a.name.localeCompare(b.name));

  return (
    <TableContainer sx={{ maxHeight: 420 }}>
      <Table stickyHeader size="small" aria-label="Municipality-wide barangay operational comparison" sx={{ minWidth: 920 }}>
        <TableHead><TableRow><TableCell>Barangay</TableCell><TableCell align="center">Active</TableCell><TableCell align="center">Critical</TableCell><TableCell align="center">Pending validation</TableCell><TableCell align="center">Awaiting assignment</TableCell><TableCell align="center">Active escalations</TableCell><TableCell align="center">Available responders</TableCell><TableCell align="center">Available resources</TableCell><TableCell align="center">Unhealthy nodes</TableCell></TableRow></TableHead>
        <TableBody>{rows.map((row) => {
          const needsAttention = Boolean(row.critical || row.escalations || row.unhealthyNodes);
          return <TableRow key={row.name} hover sx={{ bgcolor: needsAttention ? "rgba(148,98,0,0.05)" : undefined }}><TableCell><Button component={Link} href={`/mdrrmo/all-incidents?barangay=${encodeURIComponent(row.name)}`} variant="text" size="small" sx={{ minHeight: 32, justifyContent: "flex-start", fontWeight: 800 }}>Barangay {row.name}</Button>{needsAttention && <Typography variant="caption" color="warning.main" sx={{ display: "block" }}>Municipal attention indicated</Typography>}</TableCell>{([row.active, row.critical, row.pending, row.awaiting, row.escalations, row.responders, row.resources, row.unhealthyNodes] as number[]).map((value, index) => <TableCell key={index} align="center" sx={{ fontWeight: index === 1 && value ? 800 : 600 }}><Tooltip title={`${value} record${value === 1 ? "" : "s"}`}><span>{value}</span></Tooltip></TableCell>)}</TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>
  );
}
