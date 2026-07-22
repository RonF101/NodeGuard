export type EmergencyCategory =
  "Medical Emergency" | "Security/Public Safety" | "Fire/Disaster Emergency";

export type IncidentStatus =
  | "Reported"
  | "Pending Validation"
  | "Validated"
  | "Assigned"
  | "Pending Verification"
  | "Verified"
  | "Dispatched"
  | "Escalated"
  | "Coordinated by LT-MDRRMO"
  | "Unable to Respond"
  | "Responding"
  | "On Scene"
  | "Resolved"
  | "Closed"
  | "Cancelled"
  | "False Alert";

export type IncidentSourceType = "Manual Entry" | "IoT Node";

export type SmsDeliveryStatus =
  | "Pending"
  | "Sent"
  | "Delivered"
  | "Failed"
  | "Retrying";

export type ReportingChannel =
  | "Emergency Hotline"
  | "Mobile Call"
  | "SMS / Text Message"
  | "Social Media Message"
  | "Email"
  | "Walk-in Report"
  | "Radio"
  | "Barangay Personnel"
  | "LT-MDRRMO Personnel"
  | "Field Responder"
  | "Partner Office / Organization"
  | "IoT Alert Node"
  | "Other";

export type IncidentManagementMode =
  | "Barangay Managed"
  | "Referred to Barangay"
  | "Barangay Validation Requested"
  | "LT-MDRRMO Direct"
  | "Municipal Coordination";

export type ValidationResult =
  | "Validated"
  | "Accidental Activation"
  | "Duplicate Report"
  | "Non-Emergency"
  | "Unverified"
  | "False or Misleading Report"
  | "Fraudulent, Hoax, or Prank Report";

export type EscalationStatus =
  | "Not Escalated"
  | "Pending Acknowledgement"
  | "Acknowledged"
  | "Coordinating"
  | "Returned to Barangay"
  | "Completed";

export type OrganizationType = "Barangay" | "LT-MDRRMO";

export type OperationalRole =
  | "barangay_admin"
  | "barangay_personnel"
  | "mdrrmo_admin"
  | "mdrrmo_operations"
  | "field_responder";

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

export type UserRole =
  | "Barangay Administrator"
  | "Barangay Personnel"
  | "LT-MDRRMO Administrator"
  | "LT-MDRRMO Operations"
  | "Field Responder"
  | "Personnel"
  | "Admin"
  | "Super Admin";

export type ValidationStatus = "Confirmed" | "False Alarm" | "Pending Review";

export interface Incident {
  id: string;
  sourceType?: IncidentSourceType;
  reportingChannel?: ReportingChannel;
  intakeOrganization?: OrganizationType | "IoT Node";
  managementMode?: IncidentManagementMode;
  barangayId?: string;
  barangayName?: string;
  category: EmergencyCategory;
  incidentSubtype?: string;
  deviceId?: string;
  location: string;
  timestamp: string;
  reportedAt?: string;
  occurredAt?: string;
  status: IncidentStatus;
  triggerMethod?: "Button" | "Voice";
  voiceContext?: string;
  callerContext: string;
  description?: string;
  approximateAddress?: string;
  landmark?: string;
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
  validationResult?: ValidationResult;
  validationNotes?: string;
  validationMethod?: string;
  validationContact?: string;
  validationEvidence?: string;
  validatedBy?: string;
  validatedAt?: string;
  cameraCaptureUrl?: string;
  personsAffected?: number;
  affectedPersonsCondition?: string;
  reportingPersonOrSource?: string;
  reporterContact?: string;
  reportingOffice?: string;
  initialNotes?: string;
  actionsTaken?: string;
  escalationStatus?: EscalationStatus;
  escalationReason?: string;
  escalatedAt?: string;
  escalatedBy?: string;
  mdrrmoAcknowledgedAt?: string;
  mdrrmoAcknowledgedBy?: string;
  resolutionDetails?: string;
  closureDetails?: string;
  assignmentSource?: OrganizationType;
  assignmentInstructions?: string;
  afterHoursAlert?: boolean;
  barangayAcknowledgementDueAt?: string;
  barangayAcknowledgedAt?: string;
  barangayAcknowledgedBy?: string;
  mdrrmoFallbackActive?: boolean;
  voiceTranscript?: string;
  voiceUrl?: string;
  cameraCaptureStatus?: "Captured" | "Unavailable" | "Placeholder";
  voiceContextStatus?: "Recorded" | "Unavailable" | "Placeholder";
  smsNotification?: SmsNotification;
  attachments?: IncidentAttachment[];
  activityHistory?: IncidentActivity[];
  backupRequest?: BackupRequest;
  assignedResources?: ResponseResource[];
}

export interface IncidentAttachment {
  id: string;
  mediaType: "Camera Capture" | "Voice Recording" | "Field Attachment" | "Report Attachment";
  fileName: string;
  url: string;
  createdAt: string;
}

export interface SmsNotification {
  id: string;
  status: SmsDeliveryStatus;
  providerMode: "Mock" | "Configured Provider";
  destinationSummary: string;
  attemptedAt: string;
  deliveredAt?: string;
  failureReason?: string;
}

export interface NodeActivation {
  id: string;
  nodeId: string;
  incidentId: string;
  category: EmergencyCategory;
  activatedAt: string;
  barangayId?: string;
  afterHours: boolean;
  cameraCaptureStatus: "Captured" | "Unavailable" | "Placeholder";
  voiceContextStatus: "Recorded" | "Unavailable" | "Placeholder";
  smsNotification: SmsNotification;
}

export interface IncidentActivity {
  id: string;
  type: "Alert Level" | "Status" | "Backup" | "Assignment" | "Validation" | "Escalation" | "Coordination" | "Report";
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
  barangayId?: string;
  barangayName?: string;
  organizationType?: OrganizationType;
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
  barangayId?: string;
  barangayName?: string;
  organizationType?: OrganizationType;
  type: ResourceType;
  unitName: string;
  agency: "MDRRMO" | "PNP" | "BFP" | "EMS" | "Barangay Responders";
  status: ResourceStatus;
  baseLocation: string;
  assignedIncident: string;
  notes: string;
  availabilityNote?: string;
  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  barangayId?: string;
  organizationName?: string;
  status: "Active" | "Disabled";
  lastActive: string;
}

export interface DeviceNode {
  id: string;
  barangayId?: string;
  barangayName?: string;
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
  lastActivationTime?: string;
  maintenanceStatus?: string;
  cameraAvailable?: boolean;
  categoryButtons?: EmergencyCategory[];
  deviceHealth?: string;
  assignedIncidentId?: string;
  recentActivations?: NodeActivation[];
}

export interface Barangay {
  id: string;
  name: string;
  code: string;
  isParticipating: boolean;
  emergencyContact?: string;
  operatingHours?: BarangayOperatingHours;
}

export interface BarangayOperatingHours {
  barangayId: string;
  timezone: string;
  staffedDays: number[];
  opensAt: string;
  closesAt: string;
  acknowledgementMinutes: number;
  isEnabled: boolean;
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
  incidentSubtype?: string;
  deviceId?: string;
  nodeLocation?: string;
  location?: string;
  sourceType?: IncidentSourceType;
  reportingChannel?: ReportingChannel;
  managementMode?: IncidentManagementMode;
  afterHoursAlert?: boolean;
  timestamp: string;
  status: IncidentStatus;
  validationStatus: ValidationStatus;
  assignedResponder: string;
  assignedResources?: ResponseResource[];
  priority: IncidentPriority;
  isFalseAlarm: boolean;
  responseTimeMinutes: number;
  barangayName?: string;
  escalationStatus?: EscalationStatus;
  validationResult?: ValidationResult;
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
