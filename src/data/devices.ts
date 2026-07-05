import { DeviceNode } from "@/types";

export const deviceNodes: DeviceNode[] = [
  {
    id: "LT-NODE-001",
    name: "Pico Alert Node",
    location: "Pico",
    coordinates: { x: 20, y: 52 },
    status: "Online",
    assignedIncidentId: "NG-2026-067"
  },
  {
    id: "LT-NODE-002",
    name: "Public Market Alert Node",
    location: "Public Market",
    coordinates: { x: 56, y: 38 },
    status: "Online",
    assignedIncidentId: "NG-2026-070"
  },
  {
    id: "LT-NODE-003",
    name: "Km. 4 Alert Node",
    location: "Km. 4",
    coordinates: { x: 38, y: 28 },
    status: "Online"
  },
  {
    id: "LT-NODE-004",
    name: "School Area Alert Node",
    location: "School Area",
    coordinates: { x: 72, y: 56 },
    status: "Online",
    assignedIncidentId: "NG-2026-068"
  },
  {
    id: "LT-NODE-005",
    name: "Km. 5 Pico Alert Node",
    location: "Km. 5 Pico",
    coordinates: { x: 46, y: 62 },
    status: "Online",
    assignedIncidentId: "NG-2026-071"
  },
  {
    id: "LT-NODE-006",
    name: "Transport Terminal Alert Node",
    location: "Transport Terminal",
    coordinates: { x: 68, y: 32 },
    status: "Maintenance",
    assignedIncidentId: "NG-2026-069"
  }
];
