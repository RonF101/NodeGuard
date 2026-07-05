import { ResponseResource } from "@/types";

export const resources: ResponseResource[] = [
  {
    id: "AMB-001",
    type: "Ambulance",
    unitName: "Ambulance 01",
    agency: "MDRRMO",
    status: "Available",
    baseLocation: "MDRRMO Office",
    assignedIncident: "None",
    notes: "Basic life support unit",
    lastUpdated: "2026-07-06 08:45"
  },
  {
    id: "AMB-002",
    type: "Ambulance",
    unitName: "Ambulance 02",
    agency: "EMS",
    status: "Dispatched",
    baseLocation: "Km. 5 Pico",
    assignedIncident: "EMS Team Alpha",
    notes: "With medical responder team",
    lastUpdated: "2026-07-06 08:42"
  },
  {
    id: "FIRE-001",
    type: "Fire Truck",
    unitName: "Fire Truck 01",
    agency: "BFP",
    status: "Available",
    baseLocation: "BFP La Trinidad Station",
    assignedIncident: "None",
    notes: "Fire suppression unit",
    lastUpdated: "2026-07-06 08:20"
  },
  {
    id: "FIRE-002",
    type: "Fire Truck",
    unitName: "Fire Truck 02",
    agency: "BFP",
    status: "Under Maintenance",
    baseLocation: "BFP La Trinidad Station",
    assignedIncident: "None",
    notes: "Not available for dispatch",
    lastUpdated: "2026-07-06 07:15"
  },
  {
    id: "RESCUE-001",
    type: "Rescue Vehicle",
    unitName: "Rescue Vehicle 01",
    agency: "MDRRMO",
    status: "Available",
    baseLocation: "MDRRMO Office",
    assignedIncident: "None",
    notes: "Equipped with rescue tools",
    lastUpdated: "2026-07-06 08:31"
  },
  {
    id: "PATROL-001",
    type: "Patrol Vehicle",
    unitName: "PNP Patrol 01",
    agency: "PNP",
    status: "Dispatched",
    baseLocation: "Police Station",
    assignedIncident: "LT PNP Patrol 2",
    notes: "Security/public safety response",
    lastUpdated: "2026-07-06 08:17"
  },
  {
    id: "RADIO-001",
    type: "Communication Radio",
    unitName: "Portable Radio Set A",
    agency: "MDRRMO",
    status: "Available",
    baseLocation: "Operations Desk",
    assignedIncident: "None",
    notes: "Four handheld radios",
    lastUpdated: "2026-07-06 08:35"
  },
  {
    id: "KIT-001",
    type: "First Aid Kit",
    unitName: "First Aid Kit 01",
    agency: "EMS",
    status: "Reserved",
    baseLocation: "School Area",
    assignedIncident: "None",
    notes: "Reserved for school event standby",
    lastUpdated: "2026-07-06 07:50"
  },
  {
    id: "EQUIP-001",
    type: "Rescue Equipment",
    unitName: "Extrication Tool Kit",
    agency: "MDRRMO",
    status: "Available",
    baseLocation: "MDRRMO Office",
    assignedIncident: "None",
    notes: "Cutting and lifting tools",
    lastUpdated: "2026-07-06 08:25"
  },
  {
    id: "WATER-001",
    type: "Water Rescue Equipment",
    unitName: "Water Rescue Kit",
    agency: "MDRRMO",
    status: "Unavailable",
    baseLocation: "MDRRMO Storage",
    assignedIncident: "None",
    notes: "Awaiting inspection",
    lastUpdated: "2026-07-05 16:10"
  }
];
