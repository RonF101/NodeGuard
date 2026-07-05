"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { deviceNodes } from "@/data/devices";
import { incidents } from "@/data/incidents";
import { mdrrmoPalette } from "@/theme/theme";
import { StatusChip } from "@/components/StatusChip";
import { EmergencyCategory, Incident } from "@/types";

const categoryColors: Record<EmergencyCategory, string> = {
  "Medical Emergency": mdrrmoPalette.alertRed,
  "Security/Public Safety": "#1976D2",
  "Fire/Disaster Emergency": "#C65A12"
};

function getNodeColor(incident?: Incident) {
  if (!incident || ["Resolved", "Closed"].includes(incident.status)) {
    return mdrrmoPalette.darkGreen;
  }

  return categoryColors[incident.category];
}

export function MapPanel() {
  const [selectedId, setSelectedId] = useState(deviceNodes[0].id);
  const selectedNode = deviceNodes.find((node) => node.id === selectedId) ?? deviceNodes[0];
  const incident = useMemo(
    () => incidents.find((item) => item.id === selectedNode.assignedIncidentId),
    [selectedNode.assignedIncidentId]
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
              La Trinidad NodeGuard Device Map
            </Typography>
            <Box
              sx={{
                position: "relative",
                height: { xs: 420, md: 560 },
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${mdrrmoPalette.cream}`,
                background:
                  "linear-gradient(135deg, #E8F2ED 0%, #F7D6C2 48%, #F5F6F7 49%, #E8F2ED 100%)"
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: "18% 9%",
                  borderTop: "7px solid rgba(62,112,88,0.35)",
                  transform: "rotate(-11deg)"
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: "16% 26%",
                  borderLeft: "7px solid rgba(244,127,53,0.32)",
                  transform: "rotate(18deg)"
                }}
              />
              {deviceNodes.map((node) => {
                const nodeIncident = incidents.find((item) => item.id === node.assignedIncidentId);
                const nodeColor = getNodeColor(nodeIncident);

                return (
                  <ButtonBase
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    sx={{
                      position: "absolute",
                      left: `${node.coordinates.x}%`,
                      top: `${node.coordinates.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: selectedId === node.id ? 54 : 46,
                      height: selectedId === node.id ? 54 : 46,
                      borderRadius: "50%",
                      bgcolor: nodeColor,
                      color: "white",
                      border: selectedId === node.id ? `5px solid ${mdrrmoPalette.orange}` : "3px solid white",
                      boxShadow: "0 10px 20px rgba(36,77,58,0.25)",
                      fontWeight: 900,
                      display: "flex",
                      flexDirection: "column",
                      lineHeight: 1
                    }}
                    aria-label={`Select ${node.name}`}
                  >
                    <Box component="span" sx={{ fontSize: 14 }}>{node.id.replace("LT-NODE-", "")}</Box>
                    {nodeIncident && !["Resolved", "Closed"].includes(nodeIncident.status) && (
                      <Box component="span" sx={{ fontSize: 10, mt: 0.3 }}>
                        {nodeIncident.triggerMethod === "Voice" ? "V" : "B"}
                      </Box>
                    )}
                  </ButtonBase>
                );
              })}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  position: "absolute",
                  left: 16,
                  bottom: 16,
                  flexWrap: "wrap",
                  bgcolor: "rgba(255,255,255,0.86)",
                  borderRadius: 1,
                  p: 1
                }}
              >
                {[
                  ["Medical", mdrrmoPalette.alertRed],
                  ["Public Safety", categoryColors["Security/Public Safety"]],
                  ["Fire/Disaster", categoryColors["Fire/Disaster Emergency"]],
                  ["Idle/Closed", mdrrmoPalette.darkGreen]
                ].map(([label, color]) => (
                  <Stack key={label} direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" color="secondary">
              Selected Node
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Device ID
                </Typography>
                <Typography variant="h6">{selectedNode.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Location
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{selectedNode.location}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Device Status
                </Typography>
                <Stack direction="row" sx={{ mt: 0.5 }}>
                  <StatusChip status={selectedNode.status} />
                </Stack>
              </Box>
              {incident ? (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Active Incident
                    </Typography>
                    <Typography variant="h6" color="error">
                      {incident.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Category
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{incident.category}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Status
                    </Typography>
                    <Stack direction="row" sx={{ mt: 0.5 }}>
                      <StatusChip status={incident.status} />
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Trigger Method
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {incident.triggerMethod === "Voice" ? "Voice activated" : "Physical alert button"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Assigned Responder
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{incident.assignedResponder}</Typography>
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">No active incident assigned to this device.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
