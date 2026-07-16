import { Responder } from "@/types";
import { demoMinutesAgo } from "@/data/demoClock";

export const responders: Responder[] = [
  {
    id: "RESP-001",
    name: "MDRRMO Field Team Alpha",
    agency: "MDRRMO Rescue Unit",
    role: "Rescue Team Lead",
    contactNumber: "Internal Radio CH-01",
    availability: "Unavailable",
    currentAssignment: "NG-2026-115",
    lastStatusUpdate: demoMinutesAgo(31)
  },
  {
    id: "RESP-002",
    name: "EMS Team Alpha",
    agency: "EMS",
    role: "Medical Response Team",
    contactNumber: "0910-320-7446",
    availability: "Unavailable",
    currentAssignment: "NG-2026-114",
    lastStatusUpdate: demoMinutesAgo(6)
  },
  {
    id: "RESP-003",
    name: "BFP La Trinidad Unit 1",
    agency: "BFP",
    role: "Fire Suppression Crew",
    contactNumber: "(074) 422-1131",
    availability: "Unavailable",
    currentAssignment: "NG-2026-113",
    lastStatusUpdate: demoMinutesAgo(9)
  },
  {
    id: "RESP-004",
    name: "LT PNP Patrol 2",
    agency: "PNP",
    role: "Public Safety Patrol",
    contactNumber: "0907-117-9901",
    availability: "Available",
    currentAssignment: "Standby at LT PNP station",
    lastStatusUpdate: demoMinutesAgo(12)
  },
  {
    id: "RESP-005",
    name: "Barangay Pico Response Desk",
    agency: "Barangay Responders",
    role: "Barangay First Response",
    contactNumber: "0939-350-6636",
    availability: "Available",
    currentAssignment: "Area monitoring",
    lastStatusUpdate: demoMinutesAgo(18)
  },
  {
    id: "RESP-006",
    name: "MDRRMO Field Team Bravo",
    agency: "MDRRMO Rescue Unit",
    role: "Rescue Support Team",
    contactNumber: "Internal Radio CH-02",
    availability: "Offline",
    currentAssignment: "None",
    lastStatusUpdate: demoMinutesAgo(120)
  },
  {
    id: "RESP-007",
    name: "EMS Team Bravo",
    agency: "EMS",
    role: "Ambulance Crew",
    contactNumber: "0917-520-1180",
    availability: "Available",
    currentAssignment: "Standby at Km. 5 Pico",
    lastStatusUpdate: demoMinutesAgo(16)
  },
  {
    id: "RESP-008",
    name: "MDRRMO Radio Operator",
    agency: "MDRRMO",
    role: "Communications",
    contactNumber: "Internal Radio Base",
    availability: "Unavailable",
    currentAssignment: "Operations desk coordination",
    lastStatusUpdate: demoMinutesAgo(4)
  }
];
