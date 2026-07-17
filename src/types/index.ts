export type EmergencyCategory =
  "Medical Emergency" | "Security/Public Safety" | "Fire/Disaster Emergency";

export type IncidentStatus =
  | "Pending Verification"
  | "Verified"
  | "Dispatched"
  | "Responding"
  | "On Scene"
  | "Resolved"
  | "Closed"
  | "False Alert";

export type AlertLevel =
  | "Unassessed"
  | "Critical"
  | "High"
  | "Moderate"
  | "Low";

export type IncidentPriority = AlertLevel;

export type AlertLevelUpdateSource = "Dashboard" | "Personnel Application" | "Device";

export type BackupRequestStatus =
  | "Requested"
  | "Assistance Offered"
  | "Partially Filled"
  | "Confirmed"
  | "Fulfilled"
  | "Cancelled"
  | "Closed";

export type BackupOfferStatus = "Offered" | "Approved" | "Declined" | "Withdrawn";

export type BackupAssistanceType =
  | "Medical Responders"
  | "Fire Responders"
  | "Police / Public Safety Personnel"
  | "Rescue Personnel"
  | "Barangay Emergency Responders"
  | "Additional General Responders"
  | "Equipment or Vehicle Support";

export type ResponderStatus =
  | "Available"
  | "Unavailable"
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
  approximateAddress?: string;
  nodeLocation?: string;
  coordinates?: string;
  assignedResponder: string;
  alertLevel: AlertLevel;
  alertLevelUpdatedAt?: string;
  alertLevelUpdatedBy?: string;
  alertLevelUpdateSource?: AlertLevelUpdateSource;
  alertLevelUpdateReason?: string;
  buzzerActive?: boolean;
  buzzerUpdatedAt?: string;
  fieldNoteCount?: number;
  latestFieldNote?: string;
  latestFieldNoteAt?: string;
  fieldNotes?: FieldNote[];
  resolvedAt?: string;
  responseTimeMinutes?: number;
  validationStatus?: ValidationStatus;
  voiceTranscript?: string;
  voiceUrl?: string;
  activityHistory?: IncidentActivity[];
  backupRequest?: BackupRequest;
}

export interface IncidentActivity {
  id: string;
  type: "Alert Level" | "Status" | "Backup" | "Assignment";
  message: string;
  actorName?: string;
  actorRole?: string;
  source?: AlertLevelUpdateSource;
  reason?: string;
  createdAt: string;
}

export interface BackupOffer {
  id: string;
  responderId: string;
  responderName: string;
  responderAvailability: ResponderStatus;
  status: BackupOfferStatus;
  offeredAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface BackupRequest {
  id: string;
  incidentId: string;
  status: BackupRequestStatus;
  requestedAt: string;
  requestedBy: string;
  requestingTeam: string;
  assistanceTypes: BackupAssistanceType[];
  respondersNeeded: number;
  reason: string;
  urgency: Exclude<AlertLevel, "Unassessed">;
  offers: BackupOffer[];
  confirmedResponders: BackupOffer[];
  fulfilledAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
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
  geoCoordinates?: string;
  approximateAddress?: string;
  zone?: string;
  status: "Online" | "Maintenance" | "Offline";
  powerStatus?: string;
  lastCommunication?: string;
  maintenanceStatus?: string;
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
  priority: IncidentPriority;
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
