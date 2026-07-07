import { Incident, Report } from "@/types";

const demoCaseIds = [101, 111, 121, 131, 141, 151, 161, 171, 181];
const demoStatuses: Incident["status"][] = [
  "New Alert",
  "Assigned",
  "En Route",
  "On Scene",
  "Responding",
  "Resolved",
  "Closed",
  "Need Backup",
  "False Alert",
];

const locations = [
  {
    category: "Medical Emergency" as const,
    deviceId: "LT-NODE-005",
    location: "Km. 5 Pico",
    context:
      "Resident reports a person needing urgent medical assistance near the roadside.",
  },
  {
    category: "Security/Public Safety" as const,
    deviceId: "LT-NODE-002",
    location: "Public Market",
    context: "Public safety concern reported near the produce loading area.",
  },
  {
    category: "Fire/Disaster Emergency" as const,
    deviceId: "LT-NODE-006",
    location: "Transport Terminal",
    context: "Possible fire or disaster-related report near the terminal bay.",
  },
];

export const incidents: Incident[] = demoCaseIds.flatMap((baseId, groupIndex) =>
  locations.map((location, locationIndex) => {
    const idNumber = baseId + locationIndex;
    const hour = String(8 - Math.floor(groupIndex / 3)).padStart(2, "0");
    const minute = String(42 - locationIndex * 9).padStart(2, "0");
    const status = demoStatuses[groupIndex];
    const isAssigned = !["New Alert", "Closed", "False Alert"].includes(status);

    return {
      id: `NG-2026-${idNumber}`,
      category: location.category,
      deviceId: location.deviceId,
      location: location.location,
      timestamp: `2026-07-06 ${hour}:${minute}`,
      status,
      triggerMethod: locationIndex === 1 ? "Button" : "Voice",
      voiceContext:
        locationIndex === 2 ? "No voice context" : "Voice clip attached",
      callerContext: `${location.context} Demo ${status.toLowerCase()} case ${groupIndex + 1}.`,
      assignedResponder: isAssigned ? "Ronie Delos Santos" : "Unassigned",
      priority:
        groupIndex < 2 ? "Critical" : groupIndex < 6 ? "High" : "Moderate",
      buzzerActive: false,
    };
  }),
);

export const reports: Report[] = incidents
  .filter((incident) =>
    ["Resolved", "Closed", "False Alert"].includes(incident.status),
  )
  .slice(0, 6)
  .map((incident, index) => ({
    id: `RPT-2026-${String(60 + index).padStart(3, "0")}`,
    incidentId: incident.id,
    category: incident.category,
    location: incident.location,
    status: incident.status === "False Alert" ? "Closed" : incident.status,
    closedAt: `2026-07-06 ${String(10 + index).padStart(2, "0")}:12`,
    responseTime: `${12 + index * 4} min`,
    leadAgency: incident.assignedResponder,
  }));
