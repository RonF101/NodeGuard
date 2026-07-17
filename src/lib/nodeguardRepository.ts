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
  Incident,
  IncidentStatus,
  Responder,
  ResponseResource,
  ValidationStatus,
} from "@/types";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { mapAlertLevelToDatabase, mapDatabaseAlertLevel } from "@/config/alertLevels";

export class NodeGuardRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NodeGuardRepositoryError";
  }
}

type IncidentRow = {
  id?: string;
  public_id: string;
  category: "medical" | "security_public_safety" | "fire_disaster";
  device_id: string;
  location_name: string;
  occurred_at: string;
  status:
    | "new_alert"
    | "assigned"
    | "en_route"
    | "on_scene"
    | "responding"
    | "resolved"
    | "closed"
    | "need_backup"
    | "false_alert";
  trigger_method: "button" | "voice";
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
    event_type: "backup" | "assignment" | "status";
    message: string;
    actor_name: string | null;
    actor_role: string | null;
    source: "dashboard" | "personnel_app" | "system";
    reason: string | null;
    created_at: string;
  }>;
  backup_requests?: BackupRequestRow[];
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
  updated_at: string;
};

const incidentSelectEnhanced =
  "id, public_id, category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, validation_status, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, priority_updated_at, priority_updated_by, priority_update_source, priority_update_reason, incident_status_updates(remarks, created_at, status), incident_priority_updates(id, previous_priority, new_priority, actor_name, actor_role, source, reason, created_at), incident_activity_events(id, event_type, message, actor_name, actor_role, source, reason, created_at), backup_requests(id, public_id, status, requested_at, requested_by, requesting_team, assistance_types, responders_needed, reason, urgency, fulfilled_at, cancelled_at, cancellation_reason, backup_offers(id, responder_id, status, offered_at, decided_at, decision_note, responders(name, availability))), device_locations(buzzer_active, buzzer_updated_at), voice_contexts(storage_path, transcript, duration_seconds)";

const incidentSelectWithBuzzer =
  "id, public_id, category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, incident_status_updates(remarks, created_at, status), device_locations(buzzer_active, buzzer_updated_at)";

const incidentSelectWithoutBuzzer =
  "id, public_id, category, device_id, location_name, approximate_address, node_location, coordinates, occurred_at, status, trigger_method, voice_context_available, voice_duration, caller_context, assigned_responder_name, priority, incident_status_updates(remarks, created_at, status)";

export async function fetchIncidents(): Promise<Incident[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockIncidents;

  const enhanced = await supabase
    .from("incidents")
    .select(incidentSelectEnhanced)
    .order("occurred_at", { ascending: false });
  let data: unknown = enhanced.data;
  let error = enhanced.error;

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
  if (!supabase) return mockResponders;

  const [responderResult, assignmentResult] = await Promise.all([
    supabase
      .from("responders")
      .select(
        "id, profile_id, public_code, name, agency_unit, role, contact_number, availability, current_assignment, last_status_update",
      )
      .order("name"),
    supabase
      .from("incidents")
      .select("public_id, status, assigned_responder_name"),
  ]);
  const { data, error } = responderResult;

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

    return {
      id: row.public_code,
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
  if (!supabase) return mockDeviceNodes;

  const { data, error } = await supabase
    .from("device_locations")
    .select(
      "device_id, name, location_name, approximate_address, coordinates, map_x, map_y, zone, status, updated_at",
    )
    .order("device_id");

  if (error || !data) {
    throw new NodeGuardRepositoryError(
      `Unable to load registered nodes: ${error?.message ?? "No data returned."}`,
    );
  }

  return (data as DeviceLocationRow[]).map((row) => ({
    id: row.device_id,
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
  }));
}

export async function fetchResources(): Promise<ResponseResource[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockResources;

  const { data, error } = await supabase
    .from("response_resources")
    .select(
      "public_code, resource_type, unit_name, agency, status, base_location, assigned_incident_public_id, notes, updated_at",
    )
    .order("public_code");
  if (error || !data) {
    throw new NodeGuardRepositoryError(
      `Unable to load response resources: ${error?.message ?? "No data returned."}`,
    );
  }

  return (data as ResourceRow[]).map((row) => ({
    id: row.public_code,
    type: row.resource_type,
    unitName: row.unit_name,
    agency: row.agency,
    status: mapResourceStatus(row.status),
    baseLocation: row.base_location,
    assignedIncident: row.assigned_incident_public_id ?? "None",
    notes: row.notes ?? "",
    lastUpdated: formatTimestamp(row.updated_at),
  }));
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
  status: Extract<IncidentStatus, "Responding" | "On Scene" | "Closed">,
  actorId?: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: true, reason: "Demo status update completed locally." };

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
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const incident = mockIncidents.find((item) => item.id === publicId);
    if (!incident) return { ok: false, reason: "Incident not found." };
    return { ok: true, reason: "Demo alert-level update completed locally." };
  }

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
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const incident = mockIncidents.find((item) => item.id === incidentPublicId);
    const responder = mockResponders.find((item) => item.id === responderPublicCode);
    if (!incident || !responder) {
      return { ok: false, reason: "Incident or responder/team was not found." };
    }
    if (responder.availability !== "Available") {
      return {
        ok: false,
        reason: `${responder.name} is unavailable because the team is currently assigned to ${responder.currentAssignment}.`,
      };
    }
    return { ok: true, reason: "Demo assignment completed locally." };
  }

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
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const incident = mockIncidents.find((item) => item.id === incidentPublicId);
    if (!incident) return { ok: false, reason: "Incident not found." };
    return { ok: true, reason: "Demo team removal completed locally." };
  }

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
) {
  const supabase = getSupabaseClient();
  if (!supabase)
    return { ok: true, reason: "Demo resource assignment completed locally." };

  const { error } = await supabase.rpc("assign_nodeguard_resource", {
    p_resource_code: resourcePublicCode,
    p_incident_public_id: incidentPublicId,
    p_actor_id: actorId ?? null,
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

export async function validateIncident(
  incidentPublicId: string,
  validationStatus: ValidationStatus,
  actorId?: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const incident = mockIncidents.find((item) => item.id === incidentPublicId);
    if (!incident) return { ok: false, reason: "Incident not found." };
    if (incident.validationStatus === validationStatus) {
      return {
        ok: false,
        reason:
          validationStatus === "Confirmed"
            ? "This alert is already verified."
            : validationStatus === "False Alarm"
              ? "This incident is already marked as a false alert."
              : "This alert is already pending review.",
      };
    }
    return { ok: true, reason: "Demo alert validation completed locally." };
  }

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

export async function updateDeviceStatus(
  deviceId: string,
  status: "online" | "maintenance" | "offline",
  actorId?: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase)
    return { ok: true, reason: "Demo device status updated locally." };

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
) {
  const supabase = getSupabaseClient();
  if (!supabase)
    return { ok: true, reason: "Demo buzzer command completed locally." };

  const { error } = await supabase.rpc("set_device_buzzer", {
    p_device_id: deviceId,
    p_active: active,
    p_source: source,
    p_requested_by: actorId ?? null,
  });

  return error ? { ok: false, reason: error.message } : { ok: true };
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
  let voiceUrl: string | undefined;
  if (voiceContext?.storage_path) {
    const { data } = await supabase.storage
      .from("voice-contexts")
      .createSignedUrl(voiceContext.storage_path, 900);
    voiceUrl = data?.signedUrl;
  }

  return {
    id: row.public_id,
    category: mapCategory(row.category),
    deviceId: row.device_id,
    location: row.location_name,
    timestamp: formatTimestamp(row.occurred_at),
    status: mapStatus(row.status, row.validation_status),
    triggerMethod: row.trigger_method === "button" ? "Button" : "Voice",
    voiceContext: row.voice_context_available
      ? "Voice clip attached"
      : "No voice context",
    callerContext: row.caller_context,
    approximateAddress: row.approximate_address,
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
    voiceTranscript: voiceContext?.transcript ?? undefined,
    voiceUrl,
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
  if (value === "pending_review" || status === "new_alert") return "Pending Review";
  return "Confirmed";
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
    case "new_alert":
      return validationStatus === "confirmed" ? "Verified" : "Pending Verification";
    case "assigned":
      return "Dispatched";
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
      return "False Alert";
  }
}

function mapWebStatusToDb(status: IncidentStatus) {
  switch (status) {
    case "Pending Verification":
    case "Verified":
      return "new_alert";
    case "Dispatched":
      return "en_route";
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
