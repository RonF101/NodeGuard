import { barangays } from "@/data/barangays";
import { deviceNodes as deviceSeed } from "@/data/devices";
import { incidents as incidentSeed } from "@/data/incidents";
import { responders as responderSeed } from "@/data/responders";
import { resources as resourceSeed } from "@/data/resources";
import type {
  AlertLevel,
  BarangayOperatingHours,
  DeviceNode,
  EmergencyCategory,
  Incident,
  IncidentActivity,
  IncidentManagementMode,
  IncidentStatus,
  NodeActivation,
  OperationalRole,
  ReportingChannel,
  Responder,
  ResponseResource,
  SmsNotification,
  ValidationResult,
} from "@/types";

export type DemoAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  barangayName?: string;
  createdAt: string;
  details: Record<string, unknown>;
};

type DemoState = {
  incidents: Incident[];
  responders: Responder[];
  resources: ResponseResource[];
  nodes: DeviceNode[];
  operatingHours: BarangayOperatingHours[];
  activations: NodeActivation[];
  auditLogs: DemoAuditLog[];
  sequence: number;
};

export type DemoActorScope = {
  id: string;
  name: string;
  effectiveRole: OperationalRole;
  barangayId: string | null;
};

export type DemoIncidentInput = {
  reportingChannel: ReportingChannel;
  reportingSource: string;
  reporterContact?: string;
  reportingOffice?: string;
  category: EmergencyCategory;
  incidentSubtype?: string;
  description: string;
  location: string;
  landmark?: string;
  barangayId?: string;
  reportedAt: string;
  occurredAt?: string;
  personsAffected: number;
  affectedPersonsCondition?: string;
  alertLevel: AlertLevel;
  actionsTaken?: string;
  initialNotes?: string;
  managementMode?: IncidentManagementMode;
};

export type DemoValidationInput = {
  result: ValidationResult;
  notes: string;
  method: string;
  contacted: string;
  evidence: string;
};

declare global {
  var __nodeGuardDemoState: DemoState | undefined;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSeedIncident(incident: Incident, index: number): Incident {
  const status: IncidentStatus = incident.status === "Pending Verification"
    ? "Pending Validation"
    : incident.status === "Verified"
      ? "Validated"
      : ["Escalated", "Coordinated by LT-MDRRMO"].includes(incident.status)
        ? incident.assignedResponder === "Unassigned" ? "Validated" : "Responding"
        : incident.status === "Unable to Respond"
          ? "Validated"
        : incident.status === "False Alert"
          ? "Closed"
          : incident.status;
  const isNode = incident.sourceType === "IoT Node";
  const smsStatuses: SmsNotification["status"][] = [
    "Delivered",
    "Sent",
    "Pending",
    "Retrying",
    "Failed",
  ];
  return {
    ...incident,
    status,
    cameraCaptureStatus: isNode
      ? incident.cameraCaptureUrl ? "Captured" : "Placeholder"
      : undefined,
    voiceContextStatus: isNode
      ? incident.voiceUrl ? "Recorded" : "Placeholder"
      : undefined,
    smsNotification: isNode ? {
      id: `SMS-${incident.id}`,
      status: smsStatuses[index % smsStatuses.length],
      providerMode: "Mock",
      destinationSummary: "Authorized barangay and LT-MDRRMO contacts",
      attemptedAt: incident.timestamp,
      failureReason: smsStatuses[index % smsStatuses.length] === "Failed"
        ? "Mock delivery failure for retry demonstration."
        : undefined,
    } : undefined,
  };
}

function createInitialState(): DemoState {
  const incidents = clone(incidentSeed).map(normalizeSeedIncident);
  const activations = incidents
    .filter((incident) => incident.sourceType === "IoT Node" && incident.deviceId && incident.smsNotification)
    .map<NodeActivation>((incident) => ({
      id: `ACT-${incident.id}`,
      nodeId: incident.deviceId!,
      incidentId: incident.id,
      category: incident.category,
      activatedAt: incident.timestamp,
      barangayId: incident.barangayId,
      afterHours: Boolean(incident.afterHoursAlert),
      cameraCaptureStatus: incident.cameraCaptureStatus ?? "Placeholder",
      voiceContextStatus: incident.voiceContextStatus ?? "Placeholder",
      smsNotification: incident.smsNotification!,
    }));
  const nodes = clone(deviceSeed).map((node) => {
    const recentActivations = activations
      .filter((activation) => activation.nodeId === node.id)
      .toSorted((a, b) => b.activatedAt.localeCompare(a.activatedAt));
    return {
      ...node,
      lastActivationTime: recentActivations[0]?.activatedAt,
      recentActivations,
    };
  });
  return {
    incidents,
    responders: clone(responderSeed),
    resources: clone(resourceSeed),
    nodes,
    activations,
    operatingHours: barangays.map((barangay) => ({
      barangayId: barangay.id,
      timezone: "Asia/Manila",
      staffedDays: [1, 2, 3, 4, 5],
      opensAt: "08:00",
      closesAt: "17:00",
      acknowledgementMinutes: 10,
      isEnabled: true,
    })),
    auditLogs: [
      {
        id: "AUD-DEMO-002",
        action: "acknowledge_escalation",
        entityType: "incident",
        entityId: "NG-2026-113",
        actorName: "LT-MDRRMO Operations",
        barangayName: "Balili",
        createdAt: new Date(Date.now() - 240_000).toISOString(),
        details: { notes: "BFP and utility coordination initiated" },
      },
      {
        id: "AUD-DEMO-001",
        action: "escalate_incident",
        entityType: "incident",
        entityId: "NG-2026-115",
        actorName: "Barangay Betag Emergency Desk",
        barangayName: "Betag",
        createdAt: new Date(Date.now() - 480_000).toISOString(),
        details: { reason: "Specialized rescue equipment required" },
      },
    ],
    sequence: 200,
  };
}

export function getDemoState() {
  globalThis.__nodeGuardDemoState ??= createInitialState();
  return globalThis.__nodeGuardDemoState;
}

export function resetDemoState() {
  globalThis.__nodeGuardDemoState = createInitialState();
  return getDemoState();
}

function nextId(state: DemoState, prefix: string) {
  state.sequence += 1;
  return `${prefix}-${new Date().getFullYear()}-${state.sequence}`;
}

function barangayName(barangayId?: string | null) {
  return barangays.find((barangay) => barangay.id === barangayId)?.name;
}

function activity(
  type: IncidentActivity["type"],
  message: string,
  actorName: string,
  reason?: string,
): IncidentActivity {
  return {
    id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    actorName,
    actorRole: "Prototype operator",
    reason,
    createdAt: new Date().toISOString(),
  };
}

function recordAudit(
  state: DemoState,
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  incidentBarangayId: string | undefined,
  details: Record<string, unknown>,
) {
  state.auditLogs.unshift({
    id: `AUD-${Date.now()}-${state.sequence}`,
    action,
    entityType,
    entityId,
    actorName,
    barangayName: barangayName(incidentBarangayId),
    createdAt: new Date().toISOString(),
    details,
  });
}

function findIncident(state: DemoState, incidentId: string) {
  return state.incidents.find((incident) => incident.id === incidentId);
}

export function getDemoIncident(incidentId: string) {
  return findIncident(getDemoState(), incidentId);
}

export function getDemoSnapshot(actor: DemoActorScope) {
  const state = getDemoState();
  const barangayScope = actor.effectiveRole.startsWith("barangay_")
    ? actor.barangayId
    : null;
  return clone({
    incidents: barangayScope
      ? state.incidents.filter((incident) => incident.barangayId === barangayScope)
      : state.incidents,
    responders: barangayScope
      ? state.responders.filter((responder) => responder.barangayId === barangayScope)
      : state.responders,
    resources: barangayScope
      ? state.resources.filter((resource) => resource.barangayId === barangayScope)
      : state.resources,
    nodes: barangayScope
      ? state.nodes.filter((node) => node.barangayId === barangayScope)
      : state.nodes,
    operatingHours: barangayScope
      ? state.operatingHours.filter((setting) => setting.barangayId === barangayScope)
      : state.operatingHours,
    activations: barangayScope
      ? state.activations.filter((activation) => activation.barangayId === barangayScope)
      : state.activations,
  });
}

export function getDemoAuditLogs() {
  return clone(getDemoState().auditLogs);
}

export function demoCreateIncident(input: DemoIncidentInput, actorName: string) {
  const state = getDemoState();
  const incidentId = nextId(state, input.managementMode === "Barangay Managed" ? "NG-BRGY" : "NG-MDR");
  const incident: Incident = {
    id: incidentId,
    sourceType: "Manual Entry",
    reportingChannel: input.reportingChannel,
    intakeOrganization: input.managementMode === "Barangay Managed" ? "Barangay" : "LT-MDRRMO",
    managementMode: input.managementMode ?? "Barangay Managed",
    barangayId: input.barangayId,
    barangayName: barangayName(input.barangayId),
    category: input.category,
    incidentSubtype: input.incidentSubtype,
    description: input.description,
    location: input.location,
    landmark: input.landmark,
    timestamp: input.reportedAt,
    reportedAt: input.reportedAt,
    occurredAt: input.occurredAt,
    status: "Pending Validation",
    callerContext: input.description,
    assignedResponder: "Unassigned",
    alertLevel: input.alertLevel,
    personsAffected: input.personsAffected,
    affectedPersonsCondition: input.affectedPersonsCondition,
    reportingPersonOrSource: input.reportingSource,
    reporterContact: input.reporterContact,
    reportingOffice: input.reportingOffice,
    initialNotes: input.initialNotes,
    actionsTaken: input.actionsTaken,
    validationStatus: "Pending Review",
    validationResult: "Unverified",
    escalationStatus: "Not Escalated",
    activityHistory: [activity("Report", `Manual incident report created through ${input.reportingChannel}.`, actorName)],
    fieldNotes: [],
    fieldNoteCount: 0,
    assignedResources: [],
  };
  state.incidents.unshift(incident);
  recordAudit(state, actorName, "create_incident", "incident", incidentId, input.barangayId, {
    source: "manual_entry",
    reportingChannel: input.reportingChannel,
    status: incident.status,
  });
  return clone(incident);
}

function isAfterHours(setting: BarangayOperatingHours | undefined, now: Date) {
  if (!setting?.isEnabled) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((part) => part.type === "weekday")?.value ?? "Sun");
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const time = `${hour}:${minute}`;
  return !setting.staffedDays.includes(weekday) || time < setting.opensAt || time >= setting.closesAt;
}

export function demoSimulateNodeActivation(
  nodeId: string,
  category: EmergencyCategory,
  actorName: string,
  forceAfterHours = false,
) {
  const state = getDemoState();
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) return { ok: false as const, reason: "Registered node not found." };
  if (node.status !== "Online") return { ok: false as const, reason: "Only an online node can simulate an activation." };
  const now = new Date();
  const activatedAt = now.toISOString();
  const setting = state.operatingHours.find((item) => item.barangayId === node.barangayId);
  const afterHours = forceAfterHours || isAfterHours(setting, now);
  const dueAt = new Date(now.getTime() + (setting?.acknowledgementMinutes ?? 10) * 60_000).toISOString();
  const incidentId = nextId(state, "NG-IOT");
  const smsNotification: SmsNotification = {
    id: `SMS-${incidentId}`,
    status: "Pending",
    providerMode: "Mock",
    destinationSummary: afterHours
      ? "Responsible barangay and LT-MDRRMO Operations Center"
      : "Responsible barangay contacts with LT-MDRRMO visibility",
    attemptedAt: activatedAt,
    failureReason: "No live SMS provider is configured; this is a prototype delivery state.",
  };
  const cameraStatus: NodeActivation["cameraCaptureStatus"] = node.cameraAvailable ? "Placeholder" : "Unavailable";
  const activation: NodeActivation = {
    id: nextId(state, "ACT"),
    nodeId,
    incidentId,
    category,
    activatedAt,
    barangayId: node.barangayId,
    afterHours,
    cameraCaptureStatus: cameraStatus,
    voiceContextStatus: "Placeholder",
    smsNotification,
  };
  const incident: Incident = {
    id: incidentId,
    sourceType: "IoT Node",
    reportingChannel: "IoT Alert Node",
    intakeOrganization: "IoT Node",
    managementMode: "Barangay Managed",
    barangayId: node.barangayId,
    barangayName: node.barangayName,
    category,
    deviceId: node.id,
    location: node.location,
    nodeLocation: node.location,
    coordinates: node.geoCoordinates,
    timestamp: activatedAt,
    reportedAt: activatedAt,
    occurredAt: activatedAt,
    status: "Pending Validation",
    triggerMethod: "Button",
    voiceContext: "Voice-context placeholder recorded for prototype activation.",
    callerContext: "Physical emergency-button activation; context awaiting validation.",
    assignedResponder: "Unassigned",
    alertLevel: "Unassessed",
    validationStatus: "Pending Review",
    validationResult: "Unverified",
    escalationStatus: "Not Escalated",
    afterHoursAlert: afterHours,
    barangayAcknowledgementDueAt: afterHours ? dueAt : undefined,
    mdrrmoFallbackActive: afterHours,
    cameraCaptureStatus: cameraStatus,
    voiceContextStatus: "Placeholder",
    smsNotification,
    activityHistory: [
      activity("Report", `${node.name} created an automatic ${category} incident record.`, "NodeGuard device"),
      activity("Report", `Mock SMS notification entered ${smsNotification.status.toLowerCase()} state.`, "NodeGuard notification service"),
    ],
    fieldNotes: [],
    fieldNoteCount: 0,
    assignedResources: [],
  };
  state.activations.unshift(activation);
  state.incidents.unshift(incident);
  node.assignedIncidentId = incidentId;
  node.lastActivationTime = activatedAt;
  node.recentActivations = [activation, ...(node.recentActivations ?? [])].slice(0, 5);
  recordAudit(state, actorName, "simulate_node_activation", "device", node.id, node.barangayId, {
    incidentId,
    category,
    afterHours,
    smsStatus: smsNotification.status,
  });
  return { ok: true as const, incident: clone(incident), activation: clone(activation) };
}

export function demoClassifyIncident(
  incidentId: string,
  input: DemoValidationInput,
  actorName: string,
) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  const before = incident.status;
  const validated = input.result === "Validated";
  const unverified = input.result === "Unverified";
  incident.validationResult = input.result;
  incident.validationStatus = validated ? "Confirmed" : unverified ? "Pending Review" : "False Alarm";
  incident.validationNotes = input.notes;
  incident.validationMethod = input.method;
  incident.validationContact = input.contacted;
  incident.validationEvidence = input.evidence;
  incident.validatedBy = actorName;
  incident.validatedAt = new Date().toISOString();
  incident.status = validated ? "Validated" : unverified ? "Pending Validation" : "Closed";
  incident.activityHistory = [
    activity("Validation", `Validation classified as ${input.result}.`, actorName, input.notes),
    ...(incident.activityHistory ?? []),
  ];
  recordAudit(state, actorName, "classify_incident", "incident", incidentId, incident.barangayId, {
    before: { status: before },
    after: { status: incident.status, result: input.result },
    method: input.method,
  });
  return { ok: true as const, incident: clone(incident) };
}

export function demoSetValidationStatus(
  incidentId: string,
  validationStatus: Incident["validationStatus"],
  actorName: string,
) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident || !validationStatus) return { ok: false as const, reason: "Incident not found." };
  const before = incident.status;
  incident.validationStatus = validationStatus;
  incident.validationResult = validationStatus === "Confirmed" ? "Validated" : validationStatus === "False Alarm" ? "False or Misleading Report" : "Unverified";
  incident.status = validationStatus === "Confirmed" ? "Validated" : validationStatus === "False Alarm" ? "Closed" : "Pending Validation";
  incident.validatedAt = new Date().toISOString();
  incident.validatedBy = actorName;
  incident.activityHistory = [activity("Validation", `Validation status changed to ${validationStatus}.`, actorName), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "validate_incident", "incident", incidentId, incident.barangayId, { before, after: incident.status, validationStatus });
  return { ok: true as const };
}

export function demoUpdateAlertLevel(incidentId: string, alertLevel: AlertLevel, reason: string | undefined, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  const before = incident.alertLevel;
  incident.alertLevel = alertLevel;
  incident.alertLevelUpdatedAt = new Date().toISOString();
  incident.alertLevelUpdatedBy = actorName;
  incident.alertLevelUpdateReason = reason;
  incident.activityHistory = [activity("Alert Level", `Alert level changed from ${before} to ${alertLevel}.`, actorName, reason), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "update_alert_level", "incident", incidentId, incident.barangayId, { before, after: alertLevel, reason });
  return { ok: true as const };
}

export function demoAssignResponder(incidentId: string, responderId: string, instructions: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  const responder = state.responders.find((item) => item.id === responderId);
  if (!incident || !responder) return { ok: false as const, reason: "Incident or responder/team was not found." };
  if (responder.availability !== "Available") return { ok: false as const, reason: `${responder.name} is not currently available.` };
  const previous = incident.assignedResponder;
  const previousResponder = state.responders.find((item) => item.name === previous && item.currentAssignment === incidentId);
  if (previousResponder) {
    previousResponder.availability = "Available";
    previousResponder.currentAssignment = "None";
  }
  responder.availability = "Unavailable";
  responder.currentAssignment = incidentId;
  responder.lastStatusUpdate = new Date().toISOString();
  incident.assignedResponder = responder.name;
  incident.assignmentInstructions = instructions || undefined;
  incident.status = "Assigned";
  incident.activityHistory = [activity("Assignment", `${responder.name} assigned to the incident.`, actorName, instructions), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, previous === "Unassigned" ? "assign_responder" : "reassign_responder", "incident", incidentId, incident.barangayId, { previous, responder: responder.name, instructions });
  return { ok: true as const };
}

export function demoRemoveResponder(incidentId: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  const previous = incident.assignedResponder;
  const responder = state.responders.find((item) => item.name === previous && item.currentAssignment === incidentId);
  if (responder) {
    responder.availability = "Available";
    responder.currentAssignment = "None";
    responder.lastStatusUpdate = new Date().toISOString();
  }
  incident.assignedResponder = "Unassigned";
  incident.status = "Validated";
  incident.activityHistory = [activity("Assignment", `${previous} removed from the active assignment.`, actorName), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "remove_responder", "incident", incidentId, incident.barangayId, { previous });
  return { ok: true as const };
}

export function demoAssignResource(incidentId: string, resourceId: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  const resource = state.resources.find((item) => item.id === resourceId);
  if (!incident || !resource) return { ok: false as const, reason: "Incident or resource was not found." };
  if (resource.status !== "Available") return { ok: false as const, reason: `${resource.unitName} is not available.` };
  resource.status = "Reserved";
  resource.assignedIncident = incidentId;
  resource.lastUpdated = new Date().toISOString();
  incident.assignedResources = [...(incident.assignedResources ?? []).filter((item) => item.id !== resource.id), clone(resource)];
  incident.activityHistory = [activity("Assignment", `${resource.unitName} assigned to the incident.`, actorName), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "assign_resource", "incident", incidentId, incident.barangayId, { resourceId, resource: resource.unitName });
  return { ok: true as const };
}

export function demoReleaseResource(resourceId: string, nextStatus: ResponseResource["status"], reason: string, actorName: string) {
  const state = getDemoState();
  const resource = state.resources.find((item) => item.id === resourceId);
  if (!resource) return { ok: false as const, reason: "Resource not found." };
  const incidentId = resource.assignedIncident;
  resource.status = nextStatus;
  resource.assignedIncident = "None";
  resource.availabilityNote = reason;
  resource.lastUpdated = new Date().toISOString();
  const incident = findIncident(state, incidentId);
  if (incident) {
    incident.assignedResources = (incident.assignedResources ?? []).filter((item) => item.id !== resourceId);
    incident.activityHistory = [activity("Assignment", `${resource.unitName} released from the incident.`, actorName, reason), ...(incident.activityHistory ?? [])];
  }
  recordAudit(state, actorName, "release_resource", "resource", resourceId, resource.barangayId, { incidentId, nextStatus, reason });
  return { ok: true as const };
}

export function demoUpdateResource(resourceId: string, status: ResponseResource["status"], reason: string, actorName: string) {
  const state = getDemoState();
  const resource = state.resources.find((item) => item.id === resourceId);
  if (!resource) return { ok: false as const, reason: "Resource not found." };
  const before = resource.status;
  resource.status = status;
  resource.availabilityNote = reason;
  resource.lastUpdated = new Date().toISOString();
  recordAudit(state, actorName, "update_resource_status", "resource", resourceId, resource.barangayId, { before, after: status, reason });
  return { ok: true as const };
}

const transitions: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
  Assigned: ["Dispatched"],
  Dispatched: ["Responding", "On Scene"],
  Escalated: ["Responding", "On Scene"],
  "Coordinated by LT-MDRRMO": ["Responding", "On Scene"],
  Responding: ["On Scene", "Resolved"],
  "On Scene": ["Resolved"],
  Resolved: ["Closed"],
};

export function demoUpdateIncidentStatus(incidentId: string, status: IncidentStatus, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  if (!(transitions[incident.status] ?? []).includes(status)) {
    return { ok: false as const, reason: `${incident.status} cannot transition directly to ${status}.` };
  }
  const before = incident.status;
  incident.status = status;
  if (status === "Dispatched") {
    const responder = state.responders.find((item) => item.currentAssignment === incidentId);
    if (responder) responder.availability = "Dispatched";
    state.resources.filter((item) => item.assignedIncident === incidentId).forEach((resource) => { resource.status = "Dispatched"; });
    incident.assignedResources = (incident.assignedResources ?? []).map((resource) => ({ ...resource, status: "Dispatched" }));
  }
  if (status === "Resolved") {
    incident.resolvedAt = new Date().toISOString();
    const responder = state.responders.find((item) => item.currentAssignment === incidentId);
    if (responder) {
      responder.availability = "Available";
      responder.currentAssignment = "None";
    }
    state.resources.filter((item) => item.assignedIncident === incidentId).forEach((resource) => {
      resource.status = "Available";
      resource.assignedIncident = "None";
    });
  }
  incident.activityHistory = [activity("Status", `Incident status changed from ${before} to ${status}.`, actorName), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "update_incident_status", "incident", incidentId, incident.barangayId, { before, after: status });
  return { ok: true as const };
}

export function demoAddFieldUpdate(incidentId: string, remarks: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  const createdAt = new Date().toISOString();
  incident.fieldNotes = [{ status: incident.status, remarks, createdAt }, ...(incident.fieldNotes ?? [])];
  incident.fieldNoteCount = incident.fieldNotes.length;
  incident.latestFieldNote = remarks;
  incident.latestFieldNoteAt = createdAt;
  incident.activityHistory = [activity("Status", "Field update submitted.", actorName, remarks), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "submit_field_update", "incident", incidentId, incident.barangayId, { status: incident.status, remarks });
  return { ok: true as const };
}

export function demoAddAttachment(incidentId: string, fileName: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  const createdAt = new Date().toISOString();
  const attachment = {
    id: `ATT-${Date.now()}-${state.sequence}`,
    mediaType: "Report Attachment" as const,
    fileName,
    url: "",
    createdAt,
  };
  incident.attachments = [...(incident.attachments ?? []), attachment];
  incident.activityHistory = [activity("Report", `Protected attachment metadata recorded: ${fileName}.`, actorName), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "add_incident_attachment", "incident", incidentId, incident.barangayId, { fileName, protectedPrototypeMetadata: true });
  return { ok: true as const, path: `demo/${fileName}` };
}

export function demoEscalateIncident(incidentId: string, reason: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  if (incident.validationResult !== "Validated") return { ok: false as const, reason: "Validate the incident before escalation." };
  if (incident.escalationStatus && incident.escalationStatus !== "Not Escalated") return { ok: false as const, reason: "This incident is already escalated." };
  incident.escalationStatus = "Pending Acknowledgement";
  incident.escalationReason = reason;
  incident.escalatedAt = new Date().toISOString();
  incident.escalatedBy = actorName;
  incident.activityHistory = [activity("Escalation", "Incident escalated to LT-MDRRMO with its complete response record.", actorName, reason), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "escalate_incident", "incident", incidentId, incident.barangayId, { reason, assignedResponder: incident.assignedResponder, resources: (incident.assignedResources ?? []).map((item) => item.id), actionsTaken: incident.actionsTaken });
  return { ok: true as const };
}

export function demoAcknowledgeEscalation(incidentId: string, notes: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident || incident.escalationStatus !== "Pending Acknowledgement") return { ok: false as const, reason: "An escalation awaiting acknowledgement was not found." };
  incident.escalationStatus = "Coordinating";
  incident.managementMode = "Municipal Coordination";
  incident.mdrrmoAcknowledgedAt = new Date().toISOString();
  incident.mdrrmoAcknowledgedBy = actorName;
  incident.activityHistory = [activity("Coordination", "LT-MDRRMO acknowledged the escalation and began coordination.", actorName, notes), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "acknowledge_escalation", "incident", incidentId, incident.barangayId, { notes });
  return { ok: true as const };
}

export function demoAcknowledgeAfterHours(incidentId: string, action: "barangay_acknowledge" | "mdrrmo_claim", notes: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident?.afterHoursAlert) return { ok: false as const, reason: "After-hours alert not found." };
  if (action === "barangay_acknowledge") {
    incident.barangayAcknowledgedAt = new Date().toISOString();
    incident.barangayAcknowledgedBy = actorName;
    incident.mdrrmoFallbackActive = false;
  } else {
    incident.managementMode = "Municipal Coordination";
    incident.mdrrmoFallbackActive = true;
  }
  incident.activityHistory = [activity("Coordination", action === "barangay_acknowledge" ? "Responsible barangay acknowledged the after-hours alert." : "LT-MDRRMO claimed after-hours fallback coordination.", actorName, notes), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, action, "incident", incidentId, incident.barangayId, { notes });
  return { ok: true as const };
}

export function demoCloseIncident(incidentId: string, actionsTaken: string, outcome: string, notes: string, actorName: string) {
  const state = getDemoState();
  const incident = findIncident(state, incidentId);
  if (!incident) return { ok: false as const, reason: "Incident not found." };
  if (incident.status !== "Resolved") return { ok: false as const, reason: "Resolve the incident before closure." };
  incident.status = "Closed";
  incident.actionsTaken = actionsTaken;
  incident.resolutionDetails = outcome;
  incident.closureDetails = notes;
  incident.activityHistory = [activity("Status", "Incident closure completed with response history preserved.", actorName, notes), ...(incident.activityHistory ?? [])];
  recordAudit(state, actorName, "close_incident", "incident", incidentId, incident.barangayId, { actionsTaken, outcome, notes });
  return { ok: true as const };
}

export function demoUpdateOperatingHours(setting: BarangayOperatingHours, actorName: string) {
  const state = getDemoState();
  const index = state.operatingHours.findIndex((item) => item.barangayId === setting.barangayId);
  if (index >= 0) state.operatingHours[index] = clone(setting);
  else state.operatingHours.push(clone(setting));
  recordAudit(state, actorName, "update_operating_hours", "barangay", setting.barangayId, setting.barangayId, { setting });
  return { ok: true as const };
}

export function demoUpdateDeviceStatus(deviceId: string, status: DeviceNode["status"], actorName: string) {
  const state = getDemoState();
  const node = state.nodes.find((item) => item.id === deviceId);
  if (!node) return { ok: false as const, reason: "Registered node not found." };
  const before = node.status;
  node.status = status;
  node.deviceHealth = status === "Online" ? "Healthy" : status === "Maintenance" ? "Maintenance required" : "Offline";
  recordAudit(state, actorName, "update_node_status", "device", deviceId, node.barangayId, { before, after: status });
  return { ok: true as const };
}

export function demoSetDeviceBuzzer(deviceId: string, active: boolean, actorName: string) {
  const state = getDemoState();
  const node = state.nodes.find((item) => item.id === deviceId);
  if (!node) return { ok: false as const, reason: "Registered node not found." };
  state.incidents.filter((incident) => incident.deviceId === deviceId).forEach((incident) => {
    incident.buzzerActive = active;
    incident.buzzerUpdatedAt = new Date().toISOString();
  });
  recordAudit(state, actorName, active ? "activate_node_buzzer" : "deactivate_node_buzzer", "device", deviceId, node.barangayId, { active });
  return { ok: true as const };
}
