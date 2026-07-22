"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { EmptyState } from "@/components/OperationalFeedback";
import { IncidentModal } from "@/components/IncidentModal";
import { OperationalChip } from "@/components/OperationalChip";
import { StatusChip } from "@/components/StatusChip";
import { formatPhilippineDateTime, getElapsedWaitingTime } from "@/config/incidentOperations";
import type { Incident, Responder, ResponseResource } from "@/types";

type EscalationQueuePanelProps = {
  incidents: Incident[];
  responders: Responder[];
  resources: ResponseResource[];
  onIncidentUpdated: (incident: Incident) => void;
  onRespondersUpdated: (responders: Responder[]) => void;
  onResourcesUpdated: (resources: ResponseResource[]) => void;
};

export function EscalationQueuePanel({ incidents, responders, resources, onIncidentUpdated, onRespondersUpdated, onResourcesUpdated }: EscalationQueuePanelProps) {
  const [selected, setSelected] = useState<Incident | null>(null);
  if (!incidents.length) return <EmptyState title="No active escalations" description="Barangay escalations will appear here without changing their operational status." />;
  return (
    <>
      <TableContainer sx={{ maxHeight: 460 }}>
        <Table stickyHeader size="small" aria-label="Municipal escalation queue" sx={{ minWidth: 1500 }}>
          <TableHead><TableRow><TableCell>Incident</TableCell><TableCell>Origin / location</TableCell><TableCell>Incident</TableCell><TableCell>Severity</TableCell><TableCell>Status</TableCell><TableCell>Escalation request</TableCell><TableCell>Time escalated / waiting</TableCell><TableCell>Barangay action and capacity</TableCell><TableCell>Municipal coordination</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{incidents.map((incident) => <TableRow key={incident.id} hover><TableCell><Button variant="text" size="small" onClick={() => setSelected(incident)} sx={{ minHeight: 32, p: 0, fontWeight: 800 }}>{incident.id}</Button></TableCell><TableCell sx={{ minWidth: 190 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{incident.barangayName ? `Barangay ${incident.barangayName}` : "Direct LT-MDRRMO"}</Typography><Tooltip title={incident.location}><Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 240 }} noWrap>{incident.location}</Typography></Tooltip></TableCell><TableCell sx={{ minWidth: 180 }}><Typography variant="body2">{incident.category}</Typography><Typography variant="caption" color="text.secondary">{incident.incidentSubtype ?? "Detailed type not recorded"}</Typography></TableCell><TableCell><AlertLevelChip alertLevel={incident.alertLevel} /></TableCell><TableCell><StatusChip status={incident.status} /></TableCell><TableCell sx={{ minWidth: 220 }}><OperationalChip kind="escalation" value={incident.escalationStatus ?? "Pending Acknowledgement"} /><Typography variant="body2" sx={{ mt: 0.75 }}>{incident.escalationReason ?? "Support request details not recorded"}</Typography></TableCell><TableCell sx={{ minWidth: 180 }}><Typography variant="body2">{incident.escalatedAt ? `${formatPhilippineDateTime(incident.escalatedAt)} PHT` : "Time not recorded"}</Typography><Typography variant="caption" color="text.secondary">{getElapsedWaitingTime({ ...incident, timestamp: incident.escalatedAt ?? incident.timestamp })}</Typography></TableCell><TableCell sx={{ minWidth: 240 }}><Typography variant="body2"><strong>Actions:</strong> {incident.actionsTaken || "Not recorded"}</Typography><Typography variant="caption" color="text.secondary">Team: {incident.assignedResponder} · Resources: {(incident.assignedResources ?? []).map((item) => item.unitName).join(", ") || "None"}</Typography></TableCell><TableCell sx={{ minWidth: 210 }}><Typography variant="body2">{incident.mdrrmoAcknowledgedAt ? `Acknowledged ${formatPhilippineDateTime(incident.mdrrmoAcknowledgedAt)} PHT` : "Awaiting acknowledgement"}</Typography><Typography variant="caption" color="text.secondary">{incident.assignmentInstructions ?? "No municipal team instructions yet"}</Typography></TableCell><TableCell align="right"><Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}><Button size="small" onClick={() => setSelected(incident)}>{incident.escalationStatus === "Pending Acknowledgement" ? "Acknowledge" : "Coordinate"}</Button></Stack></TableCell></TableRow>)}</TableBody>
        </Table>
      </TableContainer>
      <IncidentModal key={selected?.id ?? "escalation-modal"} incident={selected} open={Boolean(selected)} responders={responders} resources={resources} environment="mdrrmo" onClose={() => setSelected(null)} onIncidentUpdated={(updated) => { setSelected(updated); onIncidentUpdated(updated); }} onRespondersUpdated={onRespondersUpdated} onResourcesUpdated={onResourcesUpdated} />
    </>
  );
}
