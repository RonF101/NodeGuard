import { Incident, Report } from "@/types";

export const incidents: Incident[] = [
  {
    id: "NG-2026-071",
    category: "Medical Emergency",
    deviceId: "LT-NODE-005",
    location: "Km. 5 Pico",
    timestamp: "2026-07-06 08:42",
    status: "Pending",
    triggerMethod: "Voice",
    voiceContext: "Voice clip attached",
    callerContext: "Resident reports an elderly person with breathing difficulty near the roadside.",
    assignedResponder: "Unassigned",
    priority: "Critical"
  },
  {
    id: "NG-2026-070",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-002",
    location: "Public Market",
    timestamp: "2026-07-06 08:17",
    status: "Verified",
    triggerMethod: "Button",
    voiceContext: "Voice clip attached",
    callerContext: "Crowd disturbance reported at the produce loading area.",
    assignedResponder: "LT PNP Patrol 2",
    priority: "High"
  },
  {
    id: "NG-2026-069",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-006",
    location: "Transport Terminal",
    timestamp: "2026-07-06 07:54",
    status: "Dispatched",
    triggerMethod: "Voice",
    voiceContext: "Voice clip attached",
    callerContext: "Smoke observed from a parked utility vehicle near the terminal exit.",
    assignedResponder: "BFP La Trinidad Unit 1",
    priority: "Critical"
  },
  {
    id: "NG-2026-068",
    category: "Medical Emergency",
    deviceId: "LT-NODE-004",
    location: "School Area",
    timestamp: "2026-07-06 07:28",
    status: "Responding",
    triggerMethod: "Button",
    voiceContext: "Voice clip attached",
    callerContext: "Student fainted during morning assembly.",
    assignedResponder: "EMS Team Alpha",
    priority: "High"
  },
  {
    id: "NG-2026-067",
    category: "Security/Public Safety",
    deviceId: "LT-NODE-001",
    location: "Pico",
    timestamp: "2026-07-06 06:41",
    status: "Resolved",
    triggerMethod: "Button",
    voiceContext: "Voice clip archived",
    callerContext: "Road obstruction cleared by barangay responders.",
    assignedResponder: "Barangay Pico Response Desk",
    priority: "Moderate"
  },
  {
    id: "NG-2026-066",
    category: "Fire/Disaster Emergency",
    deviceId: "LT-NODE-003",
    location: "Km. 4",
    timestamp: "2026-07-05 22:18",
    status: "Closed",
    triggerMethod: "Voice",
    voiceContext: "Voice clip archived",
    callerContext: "Minor landslide debris reported and cleared.",
    assignedResponder: "MDRRMO Field Team Bravo",
    priority: "High"
  }
];

export const reports: Report[] = [
  {
    id: "RPT-2026-044",
    incidentId: "NG-2026-067",
    category: "Security/Public Safety",
    location: "Pico",
    status: "Resolved",
    closedAt: "2026-07-06 07:05",
    responseTime: "18 min",
    leadAgency: "Barangay Responders"
  },
  {
    id: "RPT-2026-043",
    incidentId: "NG-2026-066",
    category: "Fire/Disaster Emergency",
    location: "Km. 4",
    status: "Closed",
    closedAt: "2026-07-05 23:02",
    responseTime: "32 min",
    leadAgency: "MDRRMO"
  },
  {
    id: "RPT-2026-042",
    incidentId: "NG-2026-061",
    category: "Medical Emergency",
    location: "Public Market",
    status: "Closed",
    closedAt: "2026-07-05 16:12",
    responseTime: "11 min",
    leadAgency: "EMS"
  },
  {
    id: "RPT-2026-041",
    incidentId: "NG-2026-058",
    category: "Security/Public Safety",
    location: "Transport Terminal",
    status: "Resolved",
    closedAt: "2026-07-04 18:44",
    responseTime: "24 min",
    leadAgency: "PNP"
  }
];
