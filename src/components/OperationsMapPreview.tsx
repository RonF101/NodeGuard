"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AlertLevelChip } from "@/components/AlertLevelChip";
import { StatusChip } from "@/components/StatusChip";
import type { DeviceNode, Incident } from "@/types";

type OperationsMapPreviewProps = {
  incidents: Incident[];
  nodes: DeviceNode[];
  environment: "barangay" | "mdrrmo";
};

function manualIncidentPosition(incident: Incident) {
  const seed = [...`${incident.id}${incident.location}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  return {
    x: 12 + (seed % 76),
    y: 15 + ((seed * 7) % 68),
  };
}

export function OperationsMapPreview({ incidents, nodes, environment }: OperationsMapPreviewProps) {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const activeIncidents = incidents.filter((incident) => !["Resolved", "Closed", "Cancelled"].includes(incident.status));
  const incidentMarkers = activeIncidents.slice(0, 10).map((incident) => {
    const node = nodes.find((item) => item.id === incident.deviceId);
    return { incident, position: node?.coordinates ?? manualIncidentPosition(incident) };
  });
  const unhealthyNodes = nodes.filter((node) => node.status !== "Online" || node.deviceHealth === "Offline");
  const selectedIncident = incidentMarkers.find(({ incident }) => incident.id === selectedIncidentId)?.incident ?? incidentMarkers[0]?.incident;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1, mb: 1.5 }}>
          <Box>
            <Typography variant="h6" color="secondary">Operational Map Snapshot</Typography>
            <Typography variant="body2" color="text.secondary">Active incident locations and supplementary IoT nodes</Typography>
          </Box>
          <Button component={Link} href={`/${environment}/map`} variant="outlined">Open Full Map</Button>
        </Stack>
        <Box
          aria-label="Schematic map of active incidents and IoT nodes"
          sx={{
            position: "relative",
            minHeight: 300,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "#EEF4F1",
            backgroundImage: "linear-gradient(rgba(47,125,97,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(47,125,97,0.09) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        >
          <Box sx={{ position: "absolute", inset: "18% 12%", border: "2px solid rgba(47,125,97,0.25)", borderRadius: "45% 55% 52% 48%", transform: "rotate(-7deg)" }} />
          {nodes.slice(0, 12).map((node) => (
            <Box
              component="span"
              role="img"
              aria-label={`${node.id}, ${node.status}, ${node.location}`}
              key={node.id}
              title={`${node.id} - ${node.location} - ${node.status}`}
              sx={{
                position: "absolute",
                left: `${node.coordinates.x}%`,
                top: `${node.coordinates.y}%`,
                width: 13,
                height: 13,
                borderRadius: "50%",
                bgcolor: node.status === "Online" ? "#2F7D61" : "#C62828",
                border: "2px solid white",
                boxShadow: "0 0 0 2px rgba(11,31,51,0.18)",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
          {incidentMarkers.map(({ incident, position }) => (
            <ButtonBase
              aria-label={`${incident.id}, ${incident.category}, ${incident.location}`}
              aria-pressed={selectedIncident?.id === incident.id}
              key={incident.id}
              title={`${incident.id} - ${incident.category} - ${incident.location}`}
              onClick={() => setSelectedIncidentId(incident.id)}
              sx={{
                position: "absolute",
                left: `${position.x}%`,
                top: `${position.y}%`,
                width: 17,
                height: 17,
                bgcolor: incident.alertLevel === "Critical" ? "#C62828" : incident.alertLevel === "High" ? "#E26A2C" : "#1967D2",
                border: "3px solid white",
                boxShadow: selectedIncident?.id === incident.id ? "0 0 0 4px rgba(255,255,255,0.95), 0 0 0 7px rgba(11,31,51,0.55)" : "0 0 0 2px rgba(11,31,51,0.28)",
                transform: "translate(-50%, -50%) rotate(45deg)",
                "&:focus-visible": { outline: "3px solid #172B3A", outlineOffset: 5 },
              }}
            />
          ))}
        </Box>
        {selectedIncident && (
          <Box sx={{ mt: 1.5, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, bgcolor: "background.default" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>{selectedIncident.id} · {selectedIncident.category}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedIncident.incidentSubtype ?? "Detailed type not yet classified"}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedIncident.location}</Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}><AlertLevelChip alertLevel={selectedIncident.alertLevel} /><StatusChip status={selectedIncident.status} /></Stack>
              </Box>
              <Button component={Link} href={`/${environment}/all-incidents?incident=${encodeURIComponent(selectedIncident.id)}`} variant="contained">Open incident details</Button>
            </Stack>
          </Box>
        )}
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", mt: 1.25 }}>
          {[
            ["Active incident", "#1967D2", `${activeIncidents.length}`],
            ["Critical incident", "#C62828", `${activeIncidents.filter((item) => item.alertLevel === "Critical").length}`],
            ["Online IoT node", "#2F7D61", `${nodes.length - unhealthyNodes.length}`],
            ["Unhealthy / offline node", "#C62828", `${unhealthyNodes.length}`],
          ].map(([label, color, count]) => (
            <Stack key={label} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
              <Typography variant="caption" sx={{ fontWeight: 800 }}>{label}: {count}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
