export type EmergencyCategory =
  "Medical Emergency" | "Security/Public Safety" | "Fire/Disaster Emergency";

export type IncidentStatus =
  | "New Alert"
  | "Assigned"
  | "En Route"
  | "On Scene"
  | "Responding"
  | "Resolved"
  | "Closed"
  | "Need Backup"
  | "False Alert";

export type ResponderStatus =
  | "Available"
  | "Dispatched"
  | "En Route"
  | "On Scene"
  | "Responding"
  | "Busy"
  | "Offline";

export type ResourceType =
  | "Ambulance"
  | "Fire Truck"
  | "Rescue Vehicle"
  | "Patrol Vehicle"
  | "Communication Radio"
  | "First Aid Kit"
  | "Rescue Equipment"
  | "Water Rescue Equipment";

export type ResourceStatus =
  "Available" | "Dispatched" | "Under Maintenance" | "Unavailable" | "Reserved";

export type UserRole = "Personnel" | "Admin" | "Super Admin";

export type ValidationStatus = "Confirmed" | "False Alarm" | "Pending Review";

export interface Incident {
  id: string;
  category: EmergencyCategory;
  deviceId: string;
  location: string;
  timestamp: string;
  status: IncidentStatus;
  triggerMethod: "Button" | "Voice";
  voiceContext: string;
  callerContext: string;
  assignedResponder: string;
  priority: "Critical" | "High" | "Moderate";
  buzzerActive?: boolean;
  buzzerUpdatedAt?: string;
  fieldNoteCount?: number;
  latestFieldNote?: string;
  latestFieldNoteAt?: string;
  fieldNotes?: FieldNote[];
}

export interface FieldNote {
  status: IncidentStatus;
  remarks: string;
  createdAt: string;
}

export interface Responder {
  id: string;
  name: string;
  agency:
    | "MDRRMO Rescue Unit"
    | "MDRRMO"
    | "PNP"
    | "BFP"
    | "EMS"
    | "Barangay Responders";
  role: string;
  contactNumber: string;
  availability: ResponderStatus;
  currentAssignment: string;
  lastStatusUpdate: string;
}

export interface ResponseResource {
  id: string;
  type: ResourceType;
  unitName: string;
  agency: "MDRRMO" | "PNP" | "BFP" | "EMS" | "Barangay Responders";
  status: ResourceStatus;
  baseLocation: string;
  assignedIncident: string;
  notes: string;
  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Disabled";
  lastActive: string;
}

export interface DeviceNode {
  id: string;
  name: string;
  location: string;
  coordinates: {
    x: number;
    y: number;
  };
  status: "Online" | "Maintenance";
  assignedIncidentId?: string;
}

export interface Report {
  id: string;
  incidentId: string;
  category: EmergencyCategory;
  location: string;
  status: IncidentStatus;
  closedAt: string;
  responseTime: string;
  leadAgency: string;
}

export interface AnalyticsIncident {
  incidentId: string;
  category: EmergencyCategory;
  deviceId: string;
  nodeLocation: string;
  timestamp: string;
  status: IncidentStatus;
  validationStatus: ValidationStatus;
  assignedResponder: string;
  priority: "Critical" | "High" | "Moderate";
  isFalseAlarm: boolean;
  responseTimeMinutes: number;
}

export interface NodeAnalyticsRow {
  deviceId: string;
  location: string;
  totalIncidents: number;
  medical: number;
  security: number;
  fireDisaster: number;
  mostCommonCategory: EmergencyCategory;
  verified: number;
  falseAlarms: number;
  pending: number;
  riskLevel: "High Risk" | "Moderate Risk" | "Low Risk" | "Review Needed";
  recommendation: string;
}
