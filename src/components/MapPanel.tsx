"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { incidents as incidentSeed } from "@/data/incidents";
import { mdrrmoPalette } from "@/theme/theme";
import { StatusChip } from "@/components/StatusChip";
import { EmergencyCategory, Incident } from "@/types";
import { DeviceNode } from "@/types";
import { fetchDeviceNodes, fetchIncidents } from "@/lib/nodeguardRepository";
import { NODEGUARD_REALTIME_EVENT } from "@/components/RealtimeRefresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MapIcon from "@mui/icons-material/Map";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useConnectivity } from "@/components/connectivity/ConnectivityProvider";

const categoryColors: Record<EmergencyCategory, string> = {
  "Medical Emergency": mdrrmoPalette.setBlue,
  "Security/Public Safety": mdrrmoPalette.setBlueDark,
  "Fire/Disaster Emergency": mdrrmoPalette.setBlue
};

function getNodeColor(incident?: Incident) {
  if (!incident || ["Resolved", "Closed", "False Alert"].includes(incident.status)) {
    return mdrrmoPalette.successGreen;
  }
  if (["On Scene", "Responding", "Need Backup"].includes(incident.status) || incident.priority === "Critical") {
    return mdrrmoPalette.goRed;
  }
  return categoryColors[incident.category];
}

export function MapPanel() {
  const { online, lowBandwidth } = useConnectivity();
  const [deviceNodes, setDeviceNodes] = useState<DeviceNode[]>(isSupabaseConfigured() ? [] : deviceSeed);
  const [incidents, setIncidents] = useState<Incident[]>(isSupabaseConfigured() ? [] : incidentSeed);
  const [selectedId, setSelectedId] = useState(isSupabaseConfigured() ? "" : deviceSeed[0].id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const selectedNode = deviceNodes.find((node) => node.id === selectedId) ?? deviceNodes[0];

  const loadMapData = useCallback(async () => {
    try {
      const [nextNodes, nextIncidents] = await Promise.all([
        fetchDeviceNodes(),
        fetchIncidents(),
      ]);
      setDeviceNodes(nextNodes);
      setIncidents(nextIncidents);
      setLoadError(null);
      if (nextNodes.length && !nextNodes.some((node) => node.id === selectedId)) {
        setSelectedId(nextNodes[0].id);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load the device map.");
    }
  }, [selectedId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadMapData(), 0);
    window.addEventListener(NODEGUARD_REALTIME_EVENT, loadMapData);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(NODEGUARD_REALTIME_EVENT, loadMapData);
    };
  }, [loadMapData]);

  const incident = useMemo(
    () => selectedNode ? (
      incidents.find((item) => item.id === selectedNode.assignedIncidentId) ??
      incidents.find(
        (item) =>
          item.deviceId === selectedNode.id &&
          !["Resolved", "Closed", "False Alert"].includes(item.status),
      )
    ) : undefined,
    [incidents, selectedNode]
  );

  if (!selectedNode) {
    return (
      <Alert severity={loadError ? "error" : "info"}>
        {loadError ?? "Loading registered NodeGuard devices…"}
      </Alert>
    );
  }
  const [latitude, longitude] = (selectedNode.geoCoordinates ?? "16.4550, 120.5888")
    .split(",")
    .map((value) => Number(value.trim()));
  const lat = Number.isFinite(latitude) ? latitude : 16.455;
  const lon = Number.isFinite(longitude) ? longitude : 120.5888;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.012}%2C${lat - 0.009}%2C${lon + 0.012}%2C${lat + 0.009}&layer=mapnik&marker=${lat}%2C${lon}`;
  const externalMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  return (
    <Stack spacing={2}>
      {loadError && <Alert severity="error">{loadError}</Alert>}
      <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="secondary" sx={{ mb: 2 }}>
              La Trinidad NodeGuard Device Map
            </Typography>
            {(!online || lowBandwidth) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {online ? "Low-Bandwidth Mode" : "Offline · Local Sync"}: remote map tiles are deferred. Device coordinates remain available below.
              </Alert>
            )}
            <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: "wrap" }}>
              {deviceNodes.map((node) => {
                const nodeIncident = incidents.find((item) => item.id === node.assignedIncidentId) ??
                  incidents.find((item) => item.deviceId === node.id && !["Resolved", "Closed", "False Alert"].includes(item.status));
                const nodeColor = getNodeColor(nodeIncident);
                const selected = selectedId === node.id;
                return (
                  <Button
                    key={node.id}
                    size="small"
                    variant={selected ? "contained" : "outlined"}
                    onClick={() => setSelectedId(node.id)}
                    aria-label={`Center map on ${node.name}`}
                    sx={selected ? { bgcolor: nodeColor, "&:hover": { bgcolor: nodeColor } } : { borderColor: nodeColor, color: nodeColor }}
                  >
                    {node.id}
                  </Button>
                );
              })}
            </Stack>
            <Box
              sx={{
                position: "relative",
                height: { xs: "clamp(300px, 64vh, 420px)", md: 560 },
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${mdrrmoPalette.cream}`,
                background: "#e8f2ed"
              }}
            >
              {online && !lowBandwidth ? (
                <Box
                  component="iframe"
                  title={`OpenStreetMap centered on ${selectedNode.location}`}
                  src={mapUrl}
                  loading="lazy"
                  sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                />
              ) : (
                <Stack sx={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", p: 3, textAlign: "center", background: "linear-gradient(135deg, #eef4f9 25%, #e3edf5 25%, #e3edf5 50%, #eef4f9 50%, #eef4f9 75%, #e3edf5 75%)", backgroundSize: "32px 32px" }}>
                  <MapIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6">{selectedNode.location}</Typography>
                  <Typography sx={{ fontWeight: 900 }}>{lat.toFixed(5)}, {lon.toFixed(5)}</Typography>
                  <Typography variant="body2" color="text.secondary">Lightweight coordinate view · no external tiles loaded</Typography>
                </Stack>
              )}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  position: "absolute",
                  left: { xs: 8, sm: 16 },
                  right: { xs: 8, sm: "auto" },
                  bottom: { xs: 8, sm: 16 },
                  flexWrap: "wrap",
                  bgcolor: "rgba(255,255,255,0.86)",
                  borderRadius: 1,
                  p: 1
                }}
              >
                {[
                  ["Set / Active", mdrrmoPalette.setBlue],
                  ["Go / Urgent", mdrrmoPalette.goRed],
                  ["Ready / Clear", mdrrmoPalette.successGreen]
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
                {selectedNode.approximateAddress && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedNode.approximateAddress}
                  </Typography>
                )}
                {selectedNode.geoCoordinates && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedNode.geoCoordinates}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Device Status
                </Typography>
                <Stack direction="row" sx={{ mt: 0.5 }}>
                  <StatusChip status={selectedNode.status} />
                </Stack>
              </Box>
              <Button
                variant="outlined"
                component="a"
                href={externalMapUrl}
                target="_blank"
                rel="noreferrer"
                startIcon={<OpenInNewIcon />}
                disabled={!online || lowBandwidth}
              >
                {online && !lowBandwidth ? "Open Full Map" : "Map Tiles Deferred"}
              </Button>
              <Button
                variant="outlined"
                component="a"
                href="https://ltdrrmo.ph/resources/maps/"
                target="_blank"
                rel="noreferrer"
                startIcon={<LayersOutlinedIcon />}
                disabled={!online || lowBandwidth}
              >
                Official Hazard Maps
              </Button>
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
    </Stack>
  );
}
