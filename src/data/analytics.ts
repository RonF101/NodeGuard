import { AnalyticsIncident, EmergencyCategory, NodeAnalyticsRow, ValidationStatus } from "@/types";

export const analyticsIncidents: AnalyticsIncident[] = [
  {
    incidentId: "NG-A-001",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    nodeLocation: "Public Market",
    timestamp: "2026-07-06 08:17",
    status: "Dispatched",
    validationStatus: "Confirmed",
    assignedResponder: "LT PNP Patrol 2",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 14
  },
  {
    incidentId: "NG-A-002",
    category: "Medical Emergency",
    deviceId: "LT-NODE-005",
    nodeLocation: "Km. 5 Pico",
    timestamp: "2026-07-06 08:42",
    status: "Pending Verification",
    validationStatus: "Pending Review",
    assignedResponder: "Unassigned",
    priority: "Critical",
    isFalseAlarm: false,
    responseTimeMinutes: 0
  },
  {
    incidentId: "NG-A-003",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-07-06 07:54",
    status: "Dispatched",
    validationStatus: "Confirmed",
    assignedResponder: "BFP La Trinidad Unit 1",
    priority: "Critical",
    isFalseAlarm: false,
    responseTimeMinutes: 18
  },
  {
    incidentId: "NG-A-004",
    category: "Medical Emergency",
    deviceId: "LT-NODE-004",
    nodeLocation: "School Area",
    timestamp: "2026-07-06 07:28",
    status: "Responding",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 11
  },
  {
    incidentId: "NG-A-005",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-001",
    nodeLocation: "Pico",
    timestamp: "2026-07-06 06:41",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "Barangay Pico Response Desk",
    priority: "Moderate",
    isFalseAlarm: false,
    responseTimeMinutes: 18
  },
  {
    incidentId: "NG-A-006",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-003",
    nodeLocation: "Km. 4",
    timestamp: "2026-07-05 22:18",
    status: "Closed",
    validationStatus: "Confirmed",
    assignedResponder: "MDRRMO Field Team Bravo",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 32
  },
  {
    incidentId: "NG-A-007",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    nodeLocation: "Public Market",
    timestamp: "2026-07-05 18:05",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "LT PNP Patrol 2",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 8
  },
  {
    incidentId: "NG-A-008",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    nodeLocation: "Public Market",
    timestamp: "2026-07-05 15:36",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "LT PNP Patrol 1",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 16
  },
  {
    incidentId: "NG-A-009",
    category: "Medical Emergency",
    deviceId: "LT-NODE-004",
    nodeLocation: "School Area",
    timestamp: "2026-07-05 10:22",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 9
  },
  {
    incidentId: "NG-A-010",
    category: "Medical Emergency",
    deviceId: "LT-NODE-004",
    nodeLocation: "School Area",
    timestamp: "2026-07-04 14:11",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "EMS Team Alpha",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 7
  },
  {
    incidentId: "NG-A-011",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-003",
    nodeLocation: "Km. 4",
    timestamp: "2026-07-04 20:45",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "MDRRMO Field Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 24
  },
  {
    incidentId: "NG-A-012",
    category: "Medical Emergency",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-07-04 17:23",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Bravo",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 13
  },
  {
    incidentId: "NG-A-013",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-07-04 09:18",
    status: "Closed",
    validationStatus: "Confirmed",
    assignedResponder: "LT PNP Patrol 3",
    priority: "Moderate",
    isFalseAlarm: false,
    responseTimeMinutes: 21
  },
  {
    incidentId: "NG-A-014",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-001",
    nodeLocation: "Pico",
    timestamp: "2026-07-03 19:02",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "Barangay Pico Response Desk",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 6
  },
  {
    incidentId: "NG-A-015",
    category: "Medical Emergency",
    deviceId: "LT-NODE-005",
    nodeLocation: "Km. 5 Pico",
    timestamp: "2026-07-03 12:38",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 12
  },
  {
    incidentId: "NG-A-016",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-005",
    nodeLocation: "Km. 5 Pico",
    timestamp: "2026-07-03 05:55",
    status: "Closed",
    validationStatus: "Confirmed",
    assignedResponder: "MDRRMO Field Team Alpha",
    priority: "Critical",
    isFalseAlarm: false,
    responseTimeMinutes: 27
  },
  {
    incidentId: "NG-A-017",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    nodeLocation: "Public Market",
    timestamp: "2026-07-02 16:30",
    status: "Closed",
    validationStatus: "Confirmed",
    assignedResponder: "LT PNP Patrol 2",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 15
  },
  {
    incidentId: "NG-A-018",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    nodeLocation: "Public Market",
    timestamp: "2026-07-02 11:44",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "LT PNP Patrol 2",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 5
  },
  {
    incidentId: "NG-A-019",
    category: "Medical Emergency",
    deviceId: "LT-NODE-004",
    nodeLocation: "School Area",
    timestamp: "2026-07-02 08:15",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 10
  },
  {
    incidentId: "NG-A-020",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-003",
    nodeLocation: "Km. 4",
    timestamp: "2026-07-01 21:20",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "MDRRMO Field Team Bravo",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 29
  },
  {
    incidentId: "NG-A-021",
    category: "Medical Emergency",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-07-01 18:16",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Bravo",
    priority: "Moderate",
    isFalseAlarm: false,
    responseTimeMinutes: 15
  },
  {
    incidentId: "NG-A-022",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-07-01 13:41",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "LT PNP Patrol 3",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 7
  },
  {
    incidentId: "NG-A-023",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-001",
    nodeLocation: "Pico",
    timestamp: "2026-06-28 16:25",
    status: "Closed",
    validationStatus: "Confirmed",
    assignedResponder: "Barangay Pico Response Desk",
    priority: "Moderate",
    isFalseAlarm: false,
    responseTimeMinutes: 19
  },
  {
    incidentId: "NG-A-024",
    category: "Medical Emergency",
    deviceId: "LT-NODE-001",
    nodeLocation: "Pico",
    timestamp: "2026-06-27 09:11",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 17
  },
  {
    incidentId: "NG-A-025",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-003",
    nodeLocation: "Km. 4",
    timestamp: "2026-06-26 22:35",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "MDRRMO Field Team Bravo",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 8
  },
  {
    incidentId: "NG-A-026",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-003",
    nodeLocation: "Km. 4",
    timestamp: "2026-06-25 19:17",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "MDRRMO Field Team Alpha",
    priority: "Critical",
    isFalseAlarm: false,
    responseTimeMinutes: 30
  },
  {
    incidentId: "NG-A-027",
    category: "Medical Emergency",
    deviceId: "LT-NODE-005",
    nodeLocation: "Km. 5 Pico",
    timestamp: "2026-06-25 11:09",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "EMS Team Alpha",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 5
  },
  {
    incidentId: "NG-A-028",
    category: "Medical Emergency",
    deviceId: "LT-NODE-004",
    nodeLocation: "School Area",
    timestamp: "2026-06-24 14:55",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Bravo",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 12
  },
  {
    incidentId: "NG-A-029",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    nodeLocation: "Public Market",
    timestamp: "2026-06-23 17:46",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "LT PNP Patrol 2",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 6
  },
  {
    incidentId: "NG-A-030",
    category: "Medical Emergency",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-06-22 12:24",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "EMS Team Bravo",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 14
  },
  {
    incidentId: "NG-A-031",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-006",
    nodeLocation: "Transport Terminal",
    timestamp: "2026-06-20 20:04",
    status: "Closed",
    validationStatus: "False Alarm",
    assignedResponder: "LT PNP Patrol 3",
    priority: "Moderate",
    isFalseAlarm: true,
    responseTimeMinutes: 6
  },
  {
    incidentId: "NG-A-032",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-005",
    nodeLocation: "Km. 5 Pico",
    timestamp: "2026-06-19 23:34",
    status: "Resolved",
    validationStatus: "Confirmed",
    assignedResponder: "MDRRMO Field Team Alpha",
    priority: "High",
    isFalseAlarm: false,
    responseTimeMinutes: 26
  }
];

export const nodeOptions = [
  { deviceId: "LT-NODE-001", location: "Pico" },
  { deviceId: "LT-NODE-002", location: "Public Market" },
  { deviceId: "LT-NODE-003", location: "Km. 4" },
  { deviceId: "LT-NODE-004", location: "School Area" },
  { deviceId: "LT-NODE-005", location: "Km. 5 Pico" },
  { deviceId: "LT-NODE-006", location: "Transport Terminal" }
];

export function getMostCommonCategory(incidents: AnalyticsIncident[]): EmergencyCategory {
  const counts = countCategories(incidents);
  return Object.entries(counts).toSorted((a, b) => b[1] - a[1])[0]?.[0] as EmergencyCategory;
}

export function countCategories(incidents: AnalyticsIncident[]) {
  return {
    "Medical Emergency": incidents.filter((incident) => incident.category === "Medical Emergency").length,
    "Security/Public Safety": incidents.filter((incident) => incident.category === "Security/Public Safety").length,
    "Fire/Disaster Emergency": incidents.filter((incident) => incident.category === "Fire/Disaster Emergency").length
  };
}

export function getRiskLevel(totalIncidents: number, verified: number, falseAlarms: number): NodeAnalyticsRow["riskLevel"] {
  if (falseAlarms > verified && falseAlarms >= 3) return "Review Needed";
  if (totalIncidents >= 10 || verified >= 7) return "High Risk";
  if (totalIncidents >= 5) return "Moderate Risk";
  return "Low Risk";
}

export function getRecommendation(row: Pick<NodeAnalyticsRow, "riskLevel" | "mostCommonCategory" | "falseAlarms" | "verified">) {
  if (row.riskLevel === "Review Needed") {
    return "Review device placement and public instructions due to repeated false activations.";
  }

  if (row.mostCommonCategory === "Medical Emergency") {
    return "Monitor area for recurring medical emergencies and coordinate EMS staging.";
  }

  if (row.mostCommonCategory === "Security/Public Safety") {
    return "Increase responder visibility during peak hours.";
  }

  if (row.riskLevel === "High Risk") {
    return "Coordinate with nearby barangay responders for faster dispatch.";
  }

  return "Continue routine monitoring and keep response contacts updated.";
}

export function buildNodeAnalytics(
  incidents: AnalyticsIncident[],
  nodes: Array<{ deviceId: string; location: string }> = nodeOptions,
): NodeAnalyticsRow[] {
  return nodes.map((node) => {
    const nodeIncidents = incidents.filter((incident) => incident.deviceId === node.deviceId);
    const categories = countCategories(nodeIncidents);
    const verified = nodeIncidents.filter((incident) => incident.validationStatus === "Confirmed").length;
    const falseAlarms = nodeIncidents.filter((incident) => incident.validationStatus === "False Alarm").length;
    const pending = nodeIncidents.filter((incident) => incident.validationStatus === "Pending Review").length;
    const mostCommonCategory = nodeIncidents.length ? getMostCommonCategory(nodeIncidents) : "Medical Emergency";
    const riskLevel = getRiskLevel(nodeIncidents.length, verified, falseAlarms);
    const row = {
      deviceId: node.deviceId,
      location: node.location,
      totalIncidents: nodeIncidents.length,
      medical: categories["Medical Emergency"],
      security: categories["Security/Public Safety"],
      fireDisaster: categories["Fire/Disaster Emergency"],
      mostCommonCategory,
      verified,
      falseAlarms,
      pending,
      riskLevel,
      recommendation: ""
    };

    return {
      ...row,
      recommendation: getRecommendation(row)
    };
  });
}

export function matchesValidationStatus(incident: AnalyticsIncident, filter: ValidationStatus | "All" | "Resolved") {
  if (filter === "All") return true;
  if (filter === "Resolved") return incident.status === "Resolved" || incident.status === "Closed";
  return incident.validationStatus === filter;
}



