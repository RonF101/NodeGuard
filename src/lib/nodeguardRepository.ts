import { deviceNodes as mockDeviceNodes } from "@/data/devices";
import { incidents as mockIncidents } from "@/data/incidents";
import { responders as mockResponders } from "@/data/responders";
import { resources as mockResources } from "@/data/resources";
import {
  AlertLevel,
  AlertLevelUpdateSource,
  BackupAssistanceType,
  BackupOffer,
  BackupOfferStatus,
  BackupRequest,
  BackupRequestStatus,
  DeviceNode,
  EmergencyCategory,
  Incident,
  IncidentAttachment,
  IncidentStatus,
  EscalationStatus,
  IncidentSourceType,
  IncidentManagementMode,
  ReportingChannel,
  BarangayOperatingHours,
  Responder,
  ResponseResource,
  ValidationResult,
  ValidationStatus,
} from "@/types";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { authorizedFetch } from "@/lib/auth";
import { mapAlertLevelToDatabase, mapDatabaseAlertLevel } from "@/config/alertLevels";
import {
  demoAcknowledgeAfterHours,
  demoAcknowledgeEscalation,
  demoAddFieldUpdate,
  demoAssignResource,
  demoAssignResponder,
  demoClassifyIncident,
  demoCloseIncident,
  demoCreateIncident,
  demoEscalateIncident,
  demoReleaseResource,
  demoRemoveResponder,
  demoSetDeviceBuzzer,
  demoSetValidationStatus,
  demoSimulateNodeActivation,
  demoUpdateAlertLevel,
  demoUpdateDeviceStatus,
  demoUpdateIncidentStatus,
  demoUpdateOperatingHours,
  demoUpdateResource,
  getDemoState,
} from "@/lib/nodeguardDemoStore";

export class NodeGuardRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeGuardRepositoryError";
  }
}

type DemoStateResponse = {
  ok: boolean;
  reason?: string;
  incidents: Incident[];
  responders: Responder[];
  resources: ResponseResource[];
  nodes: DeviceNode[];
  operatingHours: BarangayOperatingHours[];
};

async function fetchDemoState() {
  const response = await authorizedFetch("/api/demo-state", { cache: "no-store" });
  const result = (await response.json()) as DemoStateResponse;
  if (!response.ok || !result.ok) {
    throw new NodeGuardRepositoryError(result.reason ?? "Unable to load prototype data.");
  }
  return result;
}

type IncidentRow = {
  id?: string;
  public_id: string;
  category: "medical" | "security_public_safety" | "fire_disaster";
  device_id: string | null;
  source_type?: "node_alert" | "barangay_report" | "manual_entry" | "iot_node";
  reporting_channel?: string | null;
  intake_organization?: string | null;
  management_mode?: string | null;
  managing_organization?: string | null;
  reporting_office?: string | null;
  incident_subtype?: string | null;
  nearby_landmark?: string | null;
  reported_at?: string | null;
  affected_persons_condition?: string | null;
  initial_notes?: string | null;
  after_hours_alert?: boolean | null;
  barangay_acknowledgement_due_at?: string | null;
  barangay_acknowledged_at?: string | null;
  mdrrmo_fallback_claimed_at?: string | null;
  barangay_id?: string | null;
  barangays?: { name: string } | Array<{ name: string }> | null;
  incident_description?: string | null;
  persons_affected?: number | null;
  reporting_person_source?: string | null;
  camera_capture_path?: string | null;
  validation_result?: string | null;
  validation_notes?: string | null;
  validated_at?: string | null;
  escalation_status?: string | null;
  escalation_reason?: string | null;
  escalated_at?: string | null;
  mdrrmo_acknowledged_at?: string | null;
  mdrrmo_acknowledgement_notes?: string | null;
  actions_taken?: string | null;
  resolution_details?: string | null;
  closure_details?: string | null;
  assignment_source?: string | null;
  assignment_instructions?: string | null;
  incident_attachments?: Array<{
    id: string;
    storage_path: string;
    media_type: "camera_capture" | "voice_recording" | "field_attachment" | "report_attachment";
    created_at: string;
  }>;
  location_name: string;
  occurred_at: string;
  status:
    | "reported"
    | "pending_validation"
    | "new_alert"
    | "assigned"
    | "en_route"
    | "on_scene"
    | "responding"
    | "resolved"
    | "closed"
    | "need_backup"
    | "false_alert"
    | "validated"
    | "dispatched"
    | "escalated"
    | "coordinated_by_mdrrmo"
    | "unable_to_respond"
    | "cancelled";
  trigger_method: "button" | "voice" | null;
  voice_context_available: boolean;
  caller_context: string;
  approximate_address?: string;
  node_location?: string;
  coordinates?: string;
  assigned_responder_name: string | null;
  priority: "unassessed" | "critical" | "high" | "medium" | "low";
  priority_updated_at?: string | null;
  priority_updated_by?: string | null;
  priority_update_source?: "dashboard" | "personnel_app" | "device" | null;
  priority_update_reason?: string | null;
  incident_priority_updates?: Array<{
    id: string;
    previous_priority: IncidentRow["priority"];
    new_priority: IncidentRow["priority"];
    actor_name: string;
    actor_role: string;
    source: "dashboard" | "personnel_app" | "device";
    reason: string | null;
    created_at: string;
  }>;
  incident_activity_events?: Array<{
    id: string;
    event_type: string;
    message: string;
    actor_name: string | null;
    actor_role: string | null;
    source: "dashboard" | "personnel_app" | "system";
    reason: string | null;
    created_at: string;
  }>;
  backup_requests?: BackupRequestRow[];
  resource_assignments?: ResourceAssignmentRow[];
  incident_status_updates?: Array<{
    remarks: string | null;
    created_at: string;
    status: IncidentRow["status"];
  }>;
  device_locations?:
    | {
        buzzer_active: boolean | null;
        buzzer_updated_at: string | null;
      }
    | Array<{
        buzzer_active: boolean | null;
        buzzer_updated_at: string | null;
      }>
    | null;
  validation_status?: "pending_review" | "confirmed" | "false_alarm" | null;
  voice_contexts?:
    | {
        storage_path: string | null;
        transcript: string | null;
        duration_seconds: number | null;
      }
    | Array<{
        storage_path: string | null;
        transcript: string | null;
        duration_seconds: number | null;
      }>
    | null;
};

type BackupOfferRow = {
  id: string;
  responder_id: string;
  status: "offered" | "approved" | "declined" | "withdrawn";
  offered_at: string;
  decided_at: string | null;
  decision_note: string | null;
  responders?:
    | { name: string; availability: ResponderRow["availability"] }
    | Array<{ name: string; availability: ResponderRow["availability"] }>
    | null;
};

type BackupRequestRow = {
  id: string;
  public_id: string;
  status:
    | "requested"
    | "assistance_offered"
    | "partially_filled"
    | "confirmed"
    | "fulfilled"
    | "cancelled"
    | "closed";
  requested_at: string;
  requested_by: string;
  requesting_team: string;
  assistance_types: string[];
  responders_needed: number;
  reason: string;
  urgency: "critical" | "high" | "moderate" | "low";
  fulfilled_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  backup_offers?: BackupOfferRow[];
};

type ResponderRow = {
  id?: string;
  profile_id?: string | null;
  public_code: string;
  name: string;
  agency_unit: Responder["agency"];
  role: string;
  contact_number: string | null;
  availability: "available" | "dispatched" | "busy" | "offline";
  current_assignment: string | null;
  last_status_update: string;
  barangay_id?: string | null;
  organization_type?: "barangay" | "mdrrmo";
  barangays?: { name: string } | Array<{ name: string }> | null;
};

type ResponderAssignmentRow = {
  public_id: string;
  status: IncidentRow["status"];
  assigned_responder_name: string | null;
};

type DeviceLocationRow = {
  device_id: string;
  name: string;
  location_name: string;
  map_x: number;
  map_y: number;
  approximate_address?: string;
  coordinates?: string;
  zone?: string;
  status: "online" | "maintenance" | "offline";
  updated_at?: string;
  barangay_id?: string | null;
  camera_available?: boolean;
  device_health?: string;
  category_buttons?: Array<"medical" | "security_public_safety" | "fire_disaster">;
  barangays?: { name: string } | Array<{ name: string }> | null;
};

type ResourceRow = {
  public_code: string;
  resource_type: ResponseResource["type"];
  unit_name: string;
  agency: ResponseResource["agency"];
  status: "available" | "dispatched" | "under_maintenance" | "unavailable" | "reserved";
  base_location: string;
  assigned_incident_public_id: string | null;
  notes: string | null;
  availability_note?: string | null;
  updated_at: string;
  barangay_id?: string | null;
  organization_type?: "barangay" | "mdrrmo";
  barangays?: { name: string } | Array<{ name: string }> | null;
};

type ResourceAssignmentRow = {
  id: string;
  assigned_at: string;
  released_at: string | null;
  response_resources?: ResourceRow | ResourceRow[] | null;
};

const incidentSelectOperational =
  "id, public_id, source_type, reporting_channel, intake_organization, management_mode, managing_organization, reporting_office, incident_subtype, nearby_landmark, reported_at, affected_persons_condition, initial_notes, after_hours_alert, barangay_acknowledgement_due_at, barangay_acknowledged_at, mdrrmo_fallback_claimed_at, barangay_id, barangays(name), category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, validation_status, validation_result, validation_notes, validated_at, incident_description, persons_affected, reporting_person_source, camera_capture_path, escalation_status, escalation_reason, escalated_at, mdrrmo_acknowledged_at, mdrrmo_acknowledgement_notes, actions_taken, resolution_details, closure_details, assignment_source, assignment_instructions, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, priority_updated_at, priority_updated_by, priority_update_source, priority_update_reason, incident_attachments(id, storage_path, media_type, created_at), incident_status_updates(remarks, created_at, status), incident_priority_updates(id, previous_priority, new_priority, actor_name, actor_role, source, reason, created_at), incident_activity_events(id, event_type, message, actor_name, actor_role, source, reason, created_at), backup_requests(id, public_id, status, requested_at, requested_by, requesting_team, assistance_types, responders_needed, reason, urgency, fulfilled_at, cancelled_at, cancellation_reason, backup_offers(id, responder_id, status, offered_at, decided_at, decision_note, responders(name, availability))), resource_assignments(id, assigned_at, released_at, response_resources(public_code, resource_type, unit_name, agency, status, base_location, assigned_incident_public_id, notes, availability_note, updated_at, barangay_id, organization_type, barangays(name))), device_locations(buzzer_active, buzzer_updated_at), voice_contexts(storage_path, transcript, duration_seconds)";

const incidentSelectEnhanced =
  "id, public_id, category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, validation_status, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, priority_updated_at, priority_updated_by, priority_update_source, priority_update_reason, incident_status_updates(remarks, created_at, status), incident_priority_updates(id, previous_priority, new_priority, actor_name, actor_role, source, reason, created_at), incident_activity_events(id, event_type, message, actor_name, actor_role, source, reason, created_at), backup_requests(id, public_id, status, requested_at, requested_by, requesting_team, assistance_types, responders_needed, reason, urgency, fulfilled_at, cancelled_at, cancellation_reason, backup_offers(id, responder_id, status, offered_at, decided_at, decision_note, responders(name, availability))), resource_assignments(id, assigned_at, released_at, response_resources(public_code, resource_type, unit_name, agency, status, base_location, assigned_incident_public_id, notes, availability_note, updated_at)), device_locations(buzzer_active, buzzer_updated_at), voice_contexts(storage_path, transcript, duration_seconds)";

const incidentSelectWithBuzzer =
  "id, public_id, category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, incident_status_updates(remarks, created_at, status), device_locations(buzzer_active, buzzer_updated_at)";

const incidentSelectWithoutBuzzer =
  "id, public_id, category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, incident_status_updates(remarks, created_at, status)";

export async function fetchIncidents(): Promise<Incident[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return typeof window === "undefined" ? mockIncidents : (await fetchDemoState()).incidents;
  }

  const operational = await supabase
    .from("incidents")
    .select(incidentSelectOperational)
    .order("reported_at", { ascending: false });
  let data: unknown = operational.data;
  let error = operational.error;

  if (error) {
    const enhanced = await supabase
      .from("incidents")
      .select(incidentSelectEnhanced)
      .order("occurred_at", { ascending: false });
    data = enhanced.data;
    error = enhanced.error;
  }

  if (error) {
    const buzzerRetry = await supabase
      .from("incidents")
      .select(incidentSelectWithBuzzer)
      .order("occurred_at", { ascending: false });
    data = buzzerRetry.data;
    error = buzzerRetry.error;
  }

  if (error) {
    const legacyRetry = await supabase
      .from("incidents")
      .select(incidentSelectWithoutBuzzer)
      .order("occurred_at", { ascending: false });
    data = legacyRetry.data;
    error = legacyRetry.error;
  }

  if (error || !data) {
    throw new NodeGuardRepositoryError(
      `Unable to load live incidents: ${error?.message ?? "No data returned."}`,
    );
  }

  return Promise.all(
    (data as IncidentRow[]).map((row) => mapIncidentRow(row, supabase)),
  );
}

export async function fetchResponders(): Promise<Responder[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return typeof window === "undefined" ? mockResponders : (await fetchDemoState()).responders;
  }

  const enhancedResponders = await supabase
      .from("responders")
      .select(
        "id, profile_id, public_code, name, agency_unit, role, contact_number, availability, current_assignment, last_status_update, barangay_id, organization_type, barangays(name)",
      )
      .order("name");
  let responderData: unknown = enhancedResponders.data;
  let responderError = enhancedResponders.error;
  if (responderError) {
    const legacyResponders = await supabase
      .from("responders")
      .select("id, profile_id, public_code, name, agency_unit, role, contact_number, availability, current_assignment, last_status_update")
      .order("name");
    responderData = legacyResponders.data;
    responderError = legacyResponders.error;
  }
  const assignmentResult = await supabase
      .from("incidents")
      .select("public_id, status, assigned_responder_name");
  const data = responderData;
  const error = responderError;

  if (error || !data) {
    throw new NodeGuardRepositoryError(
      `Unable to load live responders: ${error?.message ?? "No data returned."}`,
    );
  }

  const assignments = (assignmentResult.data ?? []) as ResponderAssignmentRow[];
  const activeDbStatuses: IncidentRow["status"][] = [
    "assigned",
    "en_route",
    "responding",
    "on_scene",
    "need_backup",
  ];
  const finalDbStatuses: IncidentRow["status"][] = [
    "resolved",
    "closed",
    "false_alert",
  ];

  return (data as ResponderRow[]).map((row) => {
    const activeAssignment = assignments.find(
      (incident) =>
        incident.assigned_responder_name === row.name &&
        activeDbStatuses.includes(incident.status),
    );
    const recordedAssignment = assignments.find(
      (incident) => incident.public_id === row.current_assignment,
    );
    const recordedAssignmentIsFinal =
      recordedAssignment && finalDbStatuses.includes(recordedAssignment.status);

    const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
    return {
      id: row.public_code,
      barangayId: row.barangay_id ?? undefined,
      barangayName: barangay?.name,
      organizationType: row.organization_type === "barangay" ? "Barangay" as const : "LT-MDRRMO" as const,
      name: row.name,
      agency: row.agency_unit,
      role: row.role,
      contactNumber: row.contact_number ?? "Not provided",
      availability: activeAssignment
        ? "Unavailable"
        : recordedAssignmentIsFinal
          ? "Available"
          : mapResponderAvailability(row.availability),
      currentAssignment: activeAssignment
        ? activeAssignment.public_id
        : recordedAssignmentIsFinal
          ? "None"
          : row.current_assignment ?? "None",
      lastStatusUpdate: formatTimestamp(row.last_status_update),
    };
  });
}

export async function fetchDeviceNodes(): Promise<DeviceNode[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return typeof window === "undefined" ? mockDeviceNodes : (await fetchDemoState()).nodes;
  }

  const enhancedDevices = await supabase
    .from("device_locations")
    .select(
      "device_id, name, location_name, approximate_address, coordinates, map_x, map_y, zone, status, updated_at, barangay_id, camera_available, device_health, category_buttons, barangays(name)",
    )
    .order("device_id");
  let deviceData: unknown = enhancedDevices.data;
  let deviceError = enhancedDevices.error;
  if (deviceError) {
    const legacyDevices = await supabase
      .from("device_locations")
      .select("device_id, name, location_name, approximate_address, coordinates, map_x, map_y, zone, status, updated_at")
      .order("device_id");
    deviceData = legacyDevices.data;
    deviceError = legacyDevices.error;
  }
  const data = deviceData;
  const error = deviceError;

  if (error || !data) {
    throw new NodeGuardRepositoryError(
      `Unable to load registered nodes: ${error?.message ?? "No data returned."}`,
    );
  }

  return (data as DeviceLocationRow[]).map((row) => {
    const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
    return {
    id: row.device_id,
    barangayId: row.barangay_id ?? undefined,
    barangayName: barangay?.name,
    name: row.name,
    location: row.location_name,
    coordinates: {
      x: Number(row.map_x),
      y: Number(row.map_y),
    },
    geoCoordinates: row.coordinates,
    approximateAddress: row.approximate_address,
    zone: row.zone,
    status:
      row.status === "maintenance"
        ? "Maintenance"
        : row.status === "offline"
          ? "Offline"
          : "Online",
    powerStatus: "Not reported by this node",
    lastCommunication: row.updated_at ?? undefined,
    maintenanceStatus:
      row.status === "maintenance"
        ? "Maintenance in progress"
        : row.status === "offline"
          ? "Connectivity inspection required"
          : "No open maintenance",
    cameraAvailable: row.camera_available ?? false,
    deviceHealth: row.device_health ?? (row.status === "online" ? "Healthy" : "Attention required"),
    categoryButtons: row.category_buttons?.map(mapCategory),
  };
  });
}

export async function fetchResources(): Promise<ResponseResource[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return typeof window === "undefined" ? mockResources : (await fetchDemoState()).resources;
  }

  const enhancedResources = await supabase
    .from("response_resources")
    .select(
      "public_code, resource_type, unit_name, agency, status, base_location, assigned_incident_public_id, notes, availability_note, updated_at, barangay_id, organization_type, barangays(name)",
    )
    .order("public_code");
  let resourceData: unknown = enhancedResources.data;
  let resourceError = enhancedResources.error;
  if (resourceError) {
    const legacyResources = await supabase
      .from("response_resources")
      .select("public_code, resource_type, unit_name, agency, status, base_location, assigned_incident_public_id, notes, availability_note, updated_at")
      .order("public_code");
    resourceData = legacyResources.data;
    resourceError = legacyResources.error;
  }
  const data = resourceData;
  const error = resourceError;
  if (error || !data) {
    throw new NodeGuardRepositoryError(
      `Unable to load response resources: ${error?.message ?? "No data returned."}`,
    );
  }

  return (data as ResourceRow[]).map((row) => {
    const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
    return {
    id: row.public_code,
    barangayId: row.barangay_id ?? undefined,
    barangayName: barangay?.name,
    organizationType: row.organization_type === "barangay" ? "Barangay" as const : "LT-MDRRMO" as const,
    type: row.resource_type,
    unitName: row.unit_name,
    agency: row.agency,
    status: mapResourceStatus(row.status),
    baseLocation: row.base_location,
    assignedIncident: row.assigned_incident_public_id ?? "None",
    notes: row.notes ?? "",
    availabilityNote: row.availability_note ?? undefined,
    lastUpdated: formatTimestamp(row.updated_at),
  };
  });
}

export async function submitIncidentStatusUpdate(
  publicId: string,
  status: IncidentStatus,
  remarks: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, reason: "Supabase is not configured." };

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("id")
    .eq("public_id", publicId)
    .single();

  if (incidentError || !incident)
    return {
      ok: false,
      reason: incidentError?.message ?? "Incident not found.",
    };

  const { error } = await supabase.from("incident_status_updates").insert({
    incident_id: incident.id,
    status: mapWebStatusToDb(status),
    remarks,
  });

  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function updateIncidentWorkflowStatus(
  publicId: string,
  status: Extract<IncidentStatus, "Dispatched" | "Responding" | "On Scene" | "Resolved" | "Closed">,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoUpdateIncidentStatus(publicId, status, actorName);

  const { error } = await supabase.rpc("update_nodeguard_incident_status", {
    p_incident_public_id: publicId,
    p_status: mapWebStatusToDb(status),
    p_actor_id: actorId ?? null,
  });
  if (error) {
    return {
      ok: false,
      reason: error.message.includes("update_nodeguard_incident_status")
        ? "The protected workflow update is unavailable. Apply migration 0006 before changing incident status."
        : error.message,
    };
  }
  return { ok: true };
}

export async function updateIncidentAlertLevel(
  publicId: string,
  alertLevel: AlertLevel,
  source: "dashboard" | "personnel_app",
  reason?: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoUpdateAlertLevel(publicId, alertLevel, reason, actorName);

  const { data, error } = await supabase.rpc("update_nodeguard_alert_level", {
    p_incident_public_id: publicId,
    p_alert_level: mapAlertLevelToDatabase(alertLevel),
    p_source: source,
    p_reason: reason?.trim() || null,
    p_actor_id: actorId ?? null,
  });
  if (error) {
    return {
      ok: false,
      reason: error.message.includes("update_nodeguard_alert_level")
        ? "Alert-level updates are unavailable. Apply migrations 0007 and 0008."
        : error.message,
    };
  }
  return { ok: true, data };
}

export async function decideBackupOffer(
  offerId: string,
  decision: "approved" | "declined",
  note?: string,
  actorId?: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: true, reason: "Demo backup decision completed locally." };
  const { data, error } = await supabase.rpc("decide_nodeguard_backup_offer", {
    p_offer_id: offerId,
    p_decision: decision,
    p_note: note?.trim() || null,
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function cancelBackupRequest(
  requestId: string,
  reason: string,
  actorId?: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: true, reason: "Demo backup cancellation completed locally." };
  const { data, error } = await supabase.rpc("cancel_nodeguard_backup_request", {
    p_backup_request_id: requestId,
    p_reason: reason.trim(),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function assignResponderToIncident(
  responderPublicCode: string,
  incidentPublicId: string,
  actorId?: string,
  assignmentSource = "NodeGuard Operations",
  assignmentInstructions = "",
  actorName = assignmentSource,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoAssignResponder(incidentPublicId, responderPublicCode, assignmentInstructions, actorName);

  const { data: responder, error: responderError } = await supabase
    .from("responders")
    .select("name, availability, current_assignment")
    .eq("public_code", responderPublicCode)
    .maybeSingle();
  if (responderError || !responder) {
    return { ok: false, reason: responderError?.message ?? "Responder/team was not found." };
  }
  if (responder.availability !== "available") {
    return {
      ok: false,
      reason: `${responder.name} is unavailable${responder.current_assignment ? ` because the team is assigned to ${responder.current_assignment}` : ""}. Select an available responder or team.`,
    };
  }
  const { data: possibleConflicts, error: conflictError } = await supabase
    .from("incidents")
    .select("public_id, status")
    .eq("assigned_responder_name", responder.name);
  if (conflictError) {
    return { ok: false, reason: conflictError.message };
  }
  const conflict = (possibleConflicts ?? []).find((incident) =>
    ["assigned", "en_route", "responding", "on_scene", "need_backup"].includes(
      incident.status,
    ),
  );
  if (conflict) {
    return {
      ok: false,
      reason:
        conflict.public_id === incidentPublicId
          ? `${responder.name} is already assigned to ${incidentPublicId}.`
          : `${responder.name} is unavailable because the team is already assigned to ${conflict.public_id}. Select an available responder or team.`,
    };
  }

  const rpc = await supabase.rpc("assign_nodeguard_responder", {
    p_responder_code: responderPublicCode,
    p_incident_public_id: incidentPublicId,
    p_assignment_source: assignmentSource,
    p_instructions: assignmentInstructions || null,
    p_actor_id: actorId ?? null,
  });
  if (!rpc.error) return { ok: true };
  const normalizedMessage = rpc.error.message.toLowerCase();
  return {
    ok: false,
    reason: normalizedMessage.includes("unavailable") ||
      normalizedMessage.includes("already assigned")
      ? rpc.error.message
      : rpc.error.message.includes("assign_nodeguard_responder")
        ? "Atomic responder assignment is unavailable. Apply migration 0006 before dispatching."
        : rpc.error.message,
  };
}

export async function removeResponderFromIncident(
  incidentPublicId: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoRemoveResponder(incidentPublicId, actorName);

  const { error } = await supabase.rpc("unassign_nodeguard_responder", {
    p_incident_public_id: incidentPublicId,
    p_actor_id: actorId ?? null,
  });
  if (!error) return { ok: true };
  return {
    ok: false,
    reason: error.message.includes("unassign_nodeguard_responder")
      ? "Protected team removal is unavailable. Apply migration 0006 before removing an assignment."
      : error.message,
  };
}

export async function assignResourceToIncident(
  resourcePublicCode: string,
  incidentPublicId: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoAssignResource(incidentPublicId, resourcePublicCode, actorName);

  const { error } = await supabase.rpc("assign_nodeguard_resource", {
    p_resource_code: resourcePublicCode,
    p_incident_public_id: incidentPublicId,
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function releaseResourceFromIncident(
  resourcePublicCode: string,
  reason: string,
  nextStatus: Exclude<ResponseResource["status"], "Dispatched">,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoReleaseResource(resourcePublicCode, nextStatus, reason, actorName);

  const { error } = await supabase.rpc("release_nodeguard_resource", {
    p_resource_code: resourcePublicCode,
    p_reason: reason,
    p_next_status: mapResourceStatusToDatabase(nextStatus),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function updateResourceAvailability(
  resourcePublicCode: string,
  status: Exclude<ResponseResource["status"], "Dispatched">,
  reason: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoUpdateResource(resourcePublicCode, status, reason, actorName);

  const { error } = await supabase.rpc("set_nodeguard_resource_status", {
    p_resource_code: resourcePublicCode,
    p_status: mapResourceStatusToDatabase(status),
    p_reason: reason,
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function validateIncident(
  incidentPublicId: string,
  validationStatus: ValidationStatus,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoSetValidationStatus(incidentPublicId, validationStatus, actorName);

  const dbStatus =
    validationStatus === "Confirmed"
      ? "confirmed"
      : validationStatus === "False Alarm"
        ? "false_alarm"
        : "pending_review";
  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("status, validation_status")
    .eq("public_id", incidentPublicId)
    .maybeSingle();
  if (incidentError || !incident) {
    return { ok: false, reason: incidentError?.message ?? "Incident not found." };
  }
  if (incident.validation_status === dbStatus) {
    return {
      ok: false,
      reason:
        dbStatus === "confirmed"
          ? "This alert is already verified."
          : dbStatus === "false_alarm"
            ? "This incident is already marked as a false alert."
            : "This alert is already pending review.",
    };
  }
  if (!["new_alert", "false_alert"].includes(incident.status)) {
    return {
      ok: false,
      reason: "Verification can no longer be changed after team dispatch has started.",
    };
  }
  const { error } = await supabase.rpc("validate_nodeguard_incident", {
    p_incident_public_id: incidentPublicId,
    p_validation_status: dbStatus,
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

const validationResultValues: Record<ValidationResult, string> = {
  Validated: "validated",
  "Accidental Activation": "accidental_activation",
  "Duplicate Report": "duplicate_report",
  "Non-Emergency": "non_emergency",
  Unverified: "unverified",
  "False or Misleading Report": "false_or_misleading",
  "Fraudulent, Hoax, or Prank Report": "fraudulent_hoax_prank",
};

export async function classifyIncident(
  incidentPublicId: string,
  result: ValidationResult,
  notes: string,
  actorId?: string,
  details: { method?: string; contacted?: string; evidence?: string } = {},
  actorName = "Demo operator",
) {
  if (!notes.trim()) return { ok: false, reason: "Validation notes are required." };
  const supabase = getSupabaseClient();
  if (!supabase) return demoClassifyIncident(incidentPublicId, {
    result,
    notes: notes.trim(),
    method: details.method?.trim() || "Record and source review",
    contacted: details.contacted?.trim() || "Not recorded",
    evidence: details.evidence?.trim() || "Available incident record",
  }, actorName);
  const { data, error } = await supabase.rpc("classify_nodeguard_incident", {
    p_incident_public_id: incidentPublicId,
    p_validation_result: validationResultValues[result],
    p_notes: notes.trim(),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function escalateIncident(
  incidentPublicId: string,
  reason: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  if (!reason.trim()) return { ok: false, reason: "An escalation reason is required." };
  const supabase = getSupabaseClient();
  if (!supabase) return demoEscalateIncident(incidentPublicId, reason.trim(), actorName);
  const { data, error } = await supabase.rpc("escalate_nodeguard_incident", {
    p_incident_public_id: incidentPublicId,
    p_reason: reason.trim(),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function acknowledgeEscalation(
  incidentPublicId: string,
  notes: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  if (!notes.trim()) return { ok: false, reason: "Acknowledgement notes are required." };
  const supabase = getSupabaseClient();
  if (!supabase) return demoAcknowledgeEscalation(incidentPublicId, notes.trim(), actorName);
  const { data, error } = await supabase.rpc("acknowledge_nodeguard_escalation", {
    p_incident_public_id: incidentPublicId,
    p_notes: notes.trim(),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export type BarangayIncidentReportInput = {
  barangayId: string;
  category: Incident["category"];
  occurredAt: string;
  location: string;
  approximateAddress: string;
  coordinates?: string;
  description: string;
  personsAffected: number;
  reportingSource: string;
  actionsTaken: string;
};

export async function createBarangayIncidentReport(
  input: BarangayIncidentReportInput,
  actorId?: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: true, incidentId: `NG-BRGY-DEMO-${Date.now().toString().slice(-6)}` };
  }
  const category = input.category === "Medical Emergency"
    ? "medical"
    : input.category === "Security/Public Safety"
      ? "security_public_safety"
      : "fire_disaster";
  const { data, error } = await supabase.rpc("create_barangay_incident_report", {
    p_barangay_id: input.barangayId,
    p_category: category,
    p_occurred_at: input.occurredAt,
    p_location_name: input.location.trim(),
    p_approximate_address: input.approximateAddress.trim(),
    p_coordinates: input.coordinates?.trim() || null,
    p_description: input.description.trim(),
    p_persons_affected: Math.max(0, input.personsAffected),
    p_reporting_source: input.reportingSource.trim(),
    p_actions_taken: input.actionsTaken.trim(),
    p_actor_id: actorId ?? null,
  });
  if (error) return { ok: false, reason: error.message };
  const payload = data as { incident_id?: string } | null;
  return { ok: true, incidentId: payload?.incident_id };
}

export type IncidentIntakeInput = {
  reportingChannel: ReportingChannel;
  reportingSource: string;
  reporterContact?: string;
  reportingOffice?: string;
  category: Incident["category"];
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

const reportingChannelToDatabase: Record<ReportingChannel, string> = {
  "Emergency Hotline": "emergency_hotline",
  "Mobile Call": "mobile_call",
  "SMS / Text Message": "sms",
  "Social Media Message": "social_media",
  Email: "email",
  "Walk-in Report": "walk_in",
  Radio: "radio",
  "Barangay Personnel": "barangay_personnel",
  "LT-MDRRMO Personnel": "mdrrmo_personnel",
  "Field Responder": "field_responder",
  "Partner Office / Organization": "partner_office",
  "IoT Alert Node": "iot_node",
  Other: "other",
};

const managementModeToDatabase: Record<IncidentManagementMode, string> = {
  "Barangay Managed": "barangay_managed",
  "Referred to Barangay": "referred_to_barangay",
  "Barangay Validation Requested": "barangay_validation_requested",
  "LT-MDRRMO Direct": "mdrrmo_direct",
  "Municipal Coordination": "municipal_coordination",
};

export async function createIncidentReport(
  input: IncidentIntakeInput,
  actorId?: string,
  actorName = "Demo operator",
) {
  if (input.reportingChannel === "IoT Alert Node") {
    return { ok: false, reason: "IoT alerts are created automatically by registered nodes." };
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    const incident = demoCreateIncident(input, actorName);
    return { ok: true, incidentId: incident.id, incident };
  }
  const category = input.category === "Medical Emergency"
    ? "medical"
    : input.category === "Security/Public Safety"
      ? "security_public_safety"
      : "fire_disaster";
  const priority = input.alertLevel === "Moderate"
    ? "medium"
    : input.alertLevel.toLowerCase();
  const { data, error } = await supabase.rpc("create_nodeguard_incident_report", {
    p_reporting_channel: reportingChannelToDatabase[input.reportingChannel],
    p_reporting_source: input.reportingSource.trim(),
    p_reporting_office: input.reportingOffice?.trim() || null,
    p_category: category,
    p_incident_subtype: input.incidentSubtype?.trim() || null,
    p_description: input.description.trim(),
    p_location_name: input.location.trim(),
    p_landmark: input.landmark?.trim() || null,
    p_barangay_id: input.barangayId || null,
    p_reported_at: input.reportedAt,
    p_occurred_at: input.occurredAt || null,
    p_persons_affected: Math.max(0, input.personsAffected),
    p_affected_persons_condition: input.affectedPersonsCondition?.trim() || null,
    p_priority: priority,
    p_actions_taken: input.actionsTaken?.trim() || "",
    p_initial_notes: input.initialNotes?.trim() || "",
    p_management_mode: input.managementMode
      ? managementModeToDatabase[input.managementMode]
      : null,
    p_actor_id: actorId ?? null,
  });
  if (error) return { ok: false, reason: error.message };
  const payload = data as { incident_id?: string; management_mode?: string } | null;
  return { ok: true, incidentId: payload?.incident_id, managementMode: payload?.management_mode };
}

export async function acknowledgeAfterHoursAlert(
  incidentPublicId: string,
  action: "barangay_acknowledge" | "mdrrmo_claim",
  notes: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoAcknowledgeAfterHours(incidentPublicId, action, notes, actorName);
  const { data, error } = await supabase.rpc("acknowledge_nodeguard_after_hours_alert", {
    p_incident_public_id: incidentPublicId,
    p_action: action,
    p_notes: notes.trim(),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function fetchBarangayOperatingHours(
  barangayId?: string,
): Promise<BarangayOperatingHours[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    if (typeof window !== "undefined") {
      const settings = (await fetchDemoState()).operatingHours;
      return barangayId ? settings.filter((setting) => setting.barangayId === barangayId) : settings;
    }
    const settings = getDemoState().operatingHours;
    return barangayId ? settings.filter((setting) => setting.barangayId === barangayId) : settings;
  }
  let query = supabase
    .from("barangay_operating_hours")
    .select("barangay_id, timezone, staffed_days, opens_at, closes_at, acknowledgement_minutes, is_enabled")
    .order("barangay_id");
  if (barangayId) query = query.eq("barangay_id", barangayId);
  const { data, error } = await query;
  if (error) throw new NodeGuardRepositoryError(error.message);
  return (data ?? []).map((row) => ({
    barangayId: row.barangay_id,
    timezone: row.timezone,
    staffedDays: row.staffed_days,
    opensAt: String(row.opens_at).slice(0, 5),
    closesAt: String(row.closes_at).slice(0, 5),
    acknowledgementMinutes: row.acknowledgement_minutes,
    isEnabled: row.is_enabled,
  }));
}

export async function updateBarangayOperatingHours(
  setting: BarangayOperatingHours,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoUpdateOperatingHours(setting, actorName);
  const { data, error } = await supabase.rpc("set_barangay_operating_hours", {
    p_barangay_id: setting.barangayId,
    p_staffed_days: setting.staffedDays,
    p_opens_at: setting.opensAt,
    p_closes_at: setting.closesAt,
    p_acknowledgement_minutes: setting.acknowledgementMinutes,
    p_is_enabled: setting.isEnabled,
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function closeIncidentRecord(
  incidentPublicId: string,
  actionsTaken: string,
  resultOutcome: string,
  closureNotes: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoCloseIncident(incidentPublicId, actionsTaken, resultOutcome, closureNotes, actorName);
  const { data, error } = await supabase.rpc("close_nodeguard_incident", {
    p_incident_public_id: incidentPublicId,
    p_actions_taken: actionsTaken.trim(),
    p_result_outcome: resultOutcome.trim(),
    p_closure_notes: closureNotes.trim(),
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true, data };
}

export async function updateDeviceStatus(
  deviceId: string,
  status: "online" | "maintenance" | "offline",
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoUpdateDeviceStatus(
    deviceId,
    status === "online" ? "Online" : status === "maintenance" ? "Maintenance" : "Offline",
    actorName,
  );

  const { data, error } = await supabase
    .from("device_locations")
    .update({ status })
    .eq("device_id", deviceId)
    .select("device_id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, reason: error?.message ?? "Device not found." };
  }
  if (actorId) {
    await supabase.from("audit_logs").insert({
      actor_profile_id: actorId,
      action: "update_device_status",
      entity_type: "device",
      entity_id: deviceId,
      details: { status },
    });
  }
  return { ok: true };
}

export async function setDeviceBuzzer(
  deviceId: string,
  active: boolean,
  source: "dashboard" | "personnel_app" = "dashboard",
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoSetDeviceBuzzer(deviceId, active, actorName);

  const { error } = await supabase.rpc("set_device_buzzer", {
    p_device_id: deviceId,
    p_active: active,
    p_source: source,
    p_requested_by: actorId ?? null,
  });

  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function addIncidentFieldUpdate(
  incidentPublicId: string,
  remarks: string,
  actorId?: string,
  actorName = "Demo operator",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return demoAddFieldUpdate(incidentPublicId, remarks, actorName);
  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("id, status")
    .eq("public_id", incidentPublicId)
    .maybeSingle();
  if (incidentError || !incident) {
    return { ok: false, reason: incidentError?.message ?? "Incident not found." };
  }
  const { error } = await supabase.from("incident_status_updates").insert({
    incident_id: incident.id,
    status: incident.status,
    remarks: remarks.trim(),
    created_by: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function simulateNodeActivation(
  deviceId: string,
  category: EmergencyCategory,
  actorName: string,
  forceAfterHours = false,
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return demoSimulateNodeActivation(deviceId, category, actorName, forceAfterHours);
  }
  return {
    ok: false as const,
    reason: "Dashboard simulation is available only in prototype mode. Production node activations must be authenticated by the device-ingestion service.",
  };
}

async function mapIncidentRow(
  row: IncidentRow,
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
): Promise<Incident> {
  const statusUpdates = (row.incident_status_updates ?? [])
    .toSorted((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const fieldNotes = statusUpdates
    .filter((update) => update.remarks && update.remarks.trim().length > 0)
    .toSorted((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );
  const responseUpdate = statusUpdates.find((update) =>
    ["on_scene", "responding"].includes(update.status),
  );
  const finalUpdate = statusUpdates.findLast((update) =>
    ["resolved", "closed", "false_alert"].includes(update.status),
  );
  const responseMinutes = responseUpdate
    ? Math.max(
        0,
        Math.round(
          (new Date(responseUpdate.created_at).getTime() - new Date(row.occurred_at).getTime()) /
            60_000,
        ),
      )
    : undefined;
  const deviceLocation = Array.isArray(row.device_locations)
    ? row.device_locations[0]
    : row.device_locations;
  const voiceContext = Array.isArray(row.voice_contexts)
    ? row.voice_contexts[0]
    : row.voice_contexts;
  const priorityUpdates = (row.incident_priority_updates ?? []).toSorted((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  );
  const activityEvents = (row.incident_activity_events ?? []).map((event) => ({
    id: event.id,
    type:
      event.event_type === "assignment"
        ? "Assignment" as const
        : event.event_type === "status"
          ? "Status" as const
          : event.event_type === "validation"
            ? "Validation" as const
            : event.event_type === "report" || event.event_type === "closure"
              ? "Report" as const
              : event.event_type.startsWith("after_hours")
                ? "Coordination" as const
            : event.event_type.includes("escalat")
              ? "Escalation" as const
              : "Backup" as const,
    message: event.message,
    actorName: event.actor_name ?? undefined,
    actorRole: event.actor_role ?? undefined,
    source: mapAlertLevelSource(event.source),
    reason: event.reason ?? undefined,
    createdAt: formatTimestamp(event.created_at),
  }));
  const backupRows = (row.backup_requests ?? []).toSorted((a, b) =>
    String(b.requested_at).localeCompare(String(a.requested_at)),
  );
  const currentBackup = backupRows.find((request) =>
    ["requested", "assistance_offered", "partially_filled", "confirmed"].includes(
      request.status,
    ),
  ) ?? backupRows[0];
  const assignedResources: ResponseResource[] = (row.resource_assignments ?? [])
    .filter((assignment) => !assignment.released_at)
    .flatMap((assignment): ResponseResource[] => {
      const resource = Array.isArray(assignment.response_resources)
        ? assignment.response_resources[0]
        : assignment.response_resources;
      return resource
        ? [{
            id: resource.public_code,
            barangayId: resource.barangay_id ?? undefined,
            barangayName: (Array.isArray(resource.barangays) ? resource.barangays[0] : resource.barangays)?.name,
            organizationType: resource.organization_type === "barangay" ? "Barangay" as const : "LT-MDRRMO" as const,
            type: resource.resource_type,
            unitName: resource.unit_name,
            agency: resource.agency,
            status: mapResourceStatus(resource.status),
            baseLocation: resource.base_location,
            assignedIncident: resource.assigned_incident_public_id ?? row.public_id,
            notes: resource.notes ?? "",
            availabilityNote: resource.availability_note ?? undefined,
            lastUpdated: formatTimestamp(resource.updated_at),
          }]
        : [];
    });
  let voiceUrl: string | undefined;
  if (voiceContext?.storage_path) {
    const { data } = await supabase.storage
      .from("voice-contexts")
      .createSignedUrl(voiceContext.storage_path, 900);
    voiceUrl = data?.signedUrl;
  }
  let cameraCaptureUrl: string | undefined;
  if (row.camera_capture_path) {
    const { data } = await supabase.storage
      .from("incident-media")
      .createSignedUrl(row.camera_capture_path, 900);
    cameraCaptureUrl = data?.signedUrl;
  }
  const attachments: IncidentAttachment[] = (await Promise.all(
    (row.incident_attachments ?? []).map(async (attachment) => {
      const { data } = await supabase.storage
        .from("incident-media")
        .createSignedUrl(attachment.storage_path, 900);
      if (!data?.signedUrl) return null;
      const mediaType: IncidentAttachment["mediaType"] =
        attachment.media_type === "camera_capture"
          ? "Camera Capture"
          : attachment.media_type === "voice_recording"
            ? "Voice Recording"
            : attachment.media_type === "field_attachment"
              ? "Field Attachment"
              : "Report Attachment";
      return {
        id: attachment.id,
        mediaType,
        fileName: attachment.storage_path.split("/").at(-1) ?? "Incident attachment",
        url: data.signedUrl,
        createdAt: formatTimestamp(attachment.created_at),
      } satisfies IncidentAttachment;
    }),
  )).filter((attachment): attachment is IncidentAttachment => Boolean(attachment));
  const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;

  return {
    id: row.public_id,
    sourceType: mapSourceType(row.source_type),
    reportingChannel: mapReportingChannel(row.reporting_channel, row.source_type),
    intakeOrganization: row.intake_organization === "mdrrmo"
      ? "LT-MDRRMO"
      : row.intake_organization === "iot_node"
        ? "IoT Node"
        : "Barangay",
    managementMode: mapManagementMode(row.management_mode),
    barangayId: row.barangay_id ?? undefined,
    barangayName: barangay?.name,
    category: mapCategory(row.category),
    incidentSubtype: row.incident_subtype ?? undefined,
    deviceId: row.device_id ?? undefined,
    location: row.location_name,
    timestamp: formatTimestamp(row.reported_at ?? row.occurred_at),
    reportedAt: formatTimestamp(row.reported_at ?? row.occurred_at),
    occurredAt: formatTimestamp(row.occurred_at),
    status: mapStatus(row.status, row.validation_status),
    triggerMethod: row.trigger_method
      ? row.trigger_method === "button" ? "Button" : "Voice"
      : undefined,
    voiceContext: row.source_type === "iot_node" || row.source_type === "node_alert"
      ? row.voice_context_available ? "Voice clip attached" : "No voice context"
      : undefined,
    callerContext: row.incident_description ?? row.caller_context,
    description: row.incident_description ?? row.caller_context,
    approximateAddress: row.approximate_address,
    landmark: row.nearby_landmark ?? undefined,
    nodeLocation: row.node_location,
    coordinates: row.coordinates,
    assignedResponder: row.assigned_responder_name ?? "Unassigned",
    alertLevel: mapDatabaseAlertLevel(row.priority),
    alertLevelUpdatedAt: row.priority_updated_at
      ? formatTimestamp(row.priority_updated_at)
      : undefined,
    alertLevelUpdatedBy: priorityUpdates[0]?.actor_name,
    alertLevelUpdateSource: mapAlertLevelSource(row.priority_update_source),
    alertLevelUpdateReason: row.priority_update_reason ?? undefined,
    buzzerActive: deviceLocation?.buzzer_active ?? false,
    buzzerUpdatedAt: deviceLocation?.buzzer_updated_at
      ? formatTimestamp(deviceLocation.buzzer_updated_at)
      : undefined,
    fieldNoteCount: fieldNotes.length,
    latestFieldNote: fieldNotes[0]?.remarks ?? undefined,
    latestFieldNoteAt: fieldNotes[0]?.created_at
      ? formatTimestamp(fieldNotes[0].created_at)
      : undefined,
    fieldNotes: fieldNotes.map((note) => ({
      status: mapStatus(note.status),
      remarks: note.remarks ?? "",
      createdAt: formatTimestamp(note.created_at),
    })),
    resolvedAt: finalUpdate ? formatTimestamp(finalUpdate.created_at) : undefined,
    responseTimeMinutes: Number.isFinite(responseMinutes) ? responseMinutes : undefined,
    validationStatus: mapValidationStatus(row.validation_status, row.status),
    validationResult: mapValidationResult(row.validation_result, row.validation_status),
    validationNotes: row.validation_notes ?? undefined,
    validatedAt: row.validated_at ? formatTimestamp(row.validated_at) : undefined,
    cameraCaptureUrl,
    personsAffected: row.persons_affected ?? undefined,
    affectedPersonsCondition: row.affected_persons_condition ?? undefined,
    reportingPersonOrSource: row.reporting_person_source ?? undefined,
    reportingOffice: row.reporting_office ?? undefined,
    initialNotes: row.initial_notes ?? undefined,
    actionsTaken: row.actions_taken ?? undefined,
    escalationStatus: mapEscalationStatus(row.escalation_status),
    escalationReason: row.escalation_reason ?? undefined,
    escalatedAt: row.escalated_at ? formatTimestamp(row.escalated_at) : undefined,
    mdrrmoAcknowledgedAt: row.mdrrmo_acknowledged_at ? formatTimestamp(row.mdrrmo_acknowledged_at) : undefined,
    resolutionDetails: row.resolution_details ?? undefined,
    closureDetails: row.closure_details ?? undefined,
    assignmentSource: row.assignment_source
      ? row.assignment_source.toLowerCase().includes("mdrrmo")
        ? "LT-MDRRMO"
        : "Barangay"
      : undefined,
    assignmentInstructions: row.assignment_instructions ?? row.mdrrmo_acknowledgement_notes ?? undefined,
    afterHoursAlert: row.after_hours_alert ?? false,
    barangayAcknowledgementDueAt: row.barangay_acknowledgement_due_at
      ? formatTimestamp(row.barangay_acknowledgement_due_at)
      : undefined,
    barangayAcknowledgedAt: row.barangay_acknowledged_at
      ? formatTimestamp(row.barangay_acknowledged_at)
      : undefined,
    mdrrmoFallbackActive: Boolean(
      row.mdrrmo_fallback_claimed_at
      || (row.after_hours_alert
        && !row.barangay_acknowledged_at
        && row.barangay_acknowledgement_due_at
        && new Date(row.barangay_acknowledgement_due_at).getTime() <= Date.now()),
    ),
    voiceTranscript: voiceContext?.transcript ?? undefined,
    voiceUrl,
    attachments,
    activityHistory: [
      ...priorityUpdates.map((update) => ({
        id: update.id,
        type: "Alert Level" as const,
        message: `Alert level changed from ${mapDatabaseAlertLevel(update.previous_priority)} to ${mapDatabaseAlertLevel(update.new_priority)} by ${update.actor_name}, ${update.actor_role}.`,
        actorName: update.actor_name,
        actorRole: update.actor_role,
        source: mapAlertLevelSource(update.source),
        reason: update.reason ?? undefined,
        createdAt: formatTimestamp(update.created_at),
      })),
      ...activityEvents,
    ].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
    backupRequest: currentBackup ? mapBackupRequest(currentBackup, row.public_id) : undefined,
    assignedResources,
  };
}

function mapAlertLevelSource(
  source: IncidentRow["priority_update_source"] | "dashboard" | "personnel_app" | "device" | "system" | null,
): AlertLevelUpdateSource | undefined {
  if (source === "dashboard") return "Dashboard";
  if (source === "personnel_app") return "Personnel Application";
  if (source === "device") return "Device";
  return undefined;
}

function mapBackupRequest(row: BackupRequestRow, incidentId: string): BackupRequest {
  const offers = (row.backup_offers ?? []).map(mapBackupOffer);
  return {
    id: row.id,
    incidentId,
    status: mapBackupRequestStatus(row.status),
    requestedAt: formatTimestamp(row.requested_at),
    requestedBy: row.requested_by,
    requestingTeam: row.requesting_team,
    assistanceTypes: row.assistance_types.map(mapBackupAssistanceType),
    respondersNeeded: row.responders_needed,
    reason: row.reason,
    urgency: row.urgency === "moderate"
      ? "Moderate"
      : mapDatabaseAlertLevel(row.urgency) as Exclude<AlertLevel, "Unassessed">,
    offers,
    confirmedResponders: offers.filter((offer) => offer.status === "Approved"),
    fulfilledAt: row.fulfilled_at ? formatTimestamp(row.fulfilled_at) : undefined,
    cancelledAt: row.cancelled_at ? formatTimestamp(row.cancelled_at) : undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
  };
}

function mapBackupOffer(row: BackupOfferRow): BackupOffer {
  const responder = Array.isArray(row.responders) ? row.responders[0] : row.responders;
  return {
    id: row.id,
    responderId: row.responder_id,
    responderName: responder?.name ?? "Unknown responder",
    responderAvailability: responder
      ? mapResponderAvailability(responder.availability)
      : "Offline",
    status: mapBackupOfferStatus(row.status),
    offeredAt: formatTimestamp(row.offered_at),
    decidedAt: row.decided_at ? formatTimestamp(row.decided_at) : undefined,
    decisionNote: row.decision_note ?? undefined,
  };
}

function mapBackupRequestStatus(value: BackupRequestRow["status"]): BackupRequestStatus {
  const values: Record<BackupRequestRow["status"], BackupRequestStatus> = {
    requested: "Requested",
    assistance_offered: "Assistance Offered",
    partially_filled: "Partially Filled",
    confirmed: "Confirmed",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
    closed: "Closed",
  };
  return values[value];
}

function mapBackupOfferStatus(value: BackupOfferRow["status"]): BackupOfferStatus {
  const values: Record<BackupOfferRow["status"], BackupOfferStatus> = {
    offered: "Offered",
    approved: "Approved",
    declined: "Declined",
    withdrawn: "Withdrawn",
  };
  return values[value];
}

function mapBackupAssistanceType(value: string): BackupAssistanceType {
  const values: Record<string, BackupAssistanceType> = {
    medical: "Medical Responders",
    fire: "Fire Responders",
    police_public_safety: "Police / Public Safety Personnel",
    rescue: "Rescue Personnel",
    barangay: "Barangay Emergency Responders",
    general: "Additional General Responders",
    equipment_vehicle: "Equipment or Vehicle Support",
  };
  return values[value] ?? "Additional General Responders";
}

function mapValidationStatus(
  value: IncidentRow["validation_status"],
  status: IncidentRow["status"],
): ValidationStatus {
  if (value === "confirmed") return "Confirmed";
  if (value === "false_alarm" || status === "false_alert") return "False Alarm";
  if (value === "pending_review" || status === "new_alert" || status === "pending_validation" || status === "reported") return "Pending Review";
  return "Confirmed";
}

function mapSourceType(value: IncidentRow["source_type"]): IncidentSourceType {
  return value === "node_alert" || value === "iot_node" ? "IoT Node" : "Manual Entry";
}

function mapReportingChannel(
  value: string | null | undefined,
  sourceType: IncidentRow["source_type"],
): ReportingChannel {
  const values: Record<string, ReportingChannel> = {
    emergency_hotline: "Emergency Hotline",
    mobile_call: "Mobile Call",
    sms: "SMS / Text Message",
    social_media: "Social Media Message",
    email: "Email",
    walk_in: "Walk-in Report",
    radio: "Radio",
    barangay_personnel: "Barangay Personnel",
    mdrrmo_personnel: "LT-MDRRMO Personnel",
    field_responder: "Field Responder",
    partner_office: "Partner Office / Organization",
    iot_node: "IoT Alert Node",
    other: "Other",
  };
  if (value && values[value]) return values[value];
  return sourceType === "node_alert" || sourceType === "iot_node"
    ? "IoT Alert Node"
    : "Barangay Personnel";
}

function mapManagementMode(value: string | null | undefined): IncidentManagementMode {
  const values: Record<string, IncidentManagementMode> = {
    barangay_managed: "Barangay Managed",
    referred_to_barangay: "Referred to Barangay",
    barangay_validation_requested: "Barangay Validation Requested",
    mdrrmo_direct: "LT-MDRRMO Direct",
    municipal_coordination: "Municipal Coordination",
  };
  return value && values[value] ? values[value] : "Barangay Managed";
}

function mapValidationResult(
  value: IncidentRow["validation_result"],
  legacy: IncidentRow["validation_status"],
): ValidationResult {
  const values: Record<string, ValidationResult> = {
    validated: "Validated",
    accidental_activation: "Accidental Activation",
    duplicate_report: "Duplicate Report",
    non_emergency: "Non-Emergency",
    unverified: "Unverified",
    false_or_misleading: "False or Misleading Report",
    fraudulent_hoax_prank: "Fraudulent, Hoax, or Prank Report",
  };
  if (value && values[value]) return values[value];
  if (legacy === "confirmed") return "Validated";
  if (legacy === "false_alarm") return "Accidental Activation";
  return "Unverified";
}

function mapEscalationStatus(value: string | null | undefined): EscalationStatus {
  const values: Record<string, EscalationStatus> = {
    pending_acknowledgement: "Pending Acknowledgement",
    acknowledged: "Acknowledged",
    coordinating: "Coordinating",
    returned_to_barangay: "Returned to Barangay",
    completed: "Completed",
  };
  return value && values[value] ? values[value] : "Not Escalated";
}

function mapResourceStatus(
  status: ResourceRow["status"],
): ResponseResource["status"] {
  switch (status) {
    case "available":
      return "Available";
    case "dispatched":
      return "Dispatched";
    case "under_maintenance":
      return "Under Maintenance";
    case "unavailable":
      return "Unavailable";
    case "reserved":
      return "Reserved";
  }
}

function mapResourceStatusToDatabase(
  status: Exclude<ResponseResource["status"], "Dispatched">,
) {
  if (status === "Available") return "available";
  if (status === "Under Maintenance") return "under_maintenance";
  if (status === "Unavailable") return "unavailable";
  return "reserved";
}

function mapCategory(category: IncidentRow["category"]): Incident["category"] {
  if (category === "medical") return "Medical Emergency";
  if (category === "security_public_safety") return "Security/Public Safety";
  return "Fire/Disaster Emergency";
}

function mapStatus(
  status: IncidentRow["status"],
  validationStatus?: IncidentRow["validation_status"],
): IncidentStatus {
  switch (status) {
    case "reported":
      return "Reported";
    case "pending_validation":
      return "Pending Validation";
    case "new_alert":
      return validationStatus === "confirmed" ? "Validated" : "Pending Validation";
    case "assigned":
      return "Assigned";
    case "validated":
      return "Validated";
    case "dispatched":
      return "Dispatched";
    case "escalated":
      return "Responding";
    case "coordinated_by_mdrrmo":
      return "Responding";
    case "unable_to_respond":
      return "Unable to Respond";
    case "en_route":
      return "Dispatched";
    case "on_scene":
      return "On Scene";
    case "responding":
      return "Responding";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    case "need_backup":
      return "Responding";
    case "false_alert":
      return "Closed";
    case "cancelled":
      return "Cancelled";
  }
}

function mapWebStatusToDb(status: IncidentStatus) {
  switch (status) {
    case "Reported":
      return "reported";
    case "Pending Validation":
      return "pending_validation";
    case "Validated":
      return "validated";
    case "Assigned":
      return "assigned";
    case "Pending Verification":
    case "Verified":
      return "new_alert";
    case "Dispatched":
      return "en_route";
    case "Escalated":
      return "escalated";
    case "Coordinated by LT-MDRRMO":
      return "coordinated_by_mdrrmo";
    case "Unable to Respond":
      return "unable_to_respond";
    case "On Scene":
      return "on_scene";
    case "Responding":
      return "responding";
    case "Resolved":
      return "resolved";
    case "Closed":
      return "closed";
    case "False Alert":
      return "false_alert";
    case "Cancelled":
      return "cancelled";
  }
}

function mapResponderAvailability(
  availability: ResponderRow["availability"],
): Responder["availability"] {
  if (availability === "available") return "Available";
  if (availability === "offline") return "Offline";
  return "Unavailable";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}
