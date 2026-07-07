import { deviceNodes as mockDeviceNodes } from "@/data/devices";
import { incidents as mockIncidents } from "@/data/incidents";
import { responders as mockResponders } from "@/data/responders";
import { DeviceNode, Incident, IncidentStatus, Responder } from "@/types";
import { getSupabaseClient } from "@/lib/supabaseClient";

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
  assigned_responder_name: string | null;
  priority: "critical" | "high" | "medium" | "low";
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
};

type ResponderRow = {
  id?: string;
  public_code: string;
  name: string;
  agency_unit: Responder["agency"];
  role: string;
  contact_number: string | null;
  availability: "available" | "dispatched" | "busy" | "offline";
  current_assignment: string | null;
  last_status_update: string;
};

type DeviceLocationRow = {
  device_id: string;
  name: string;
  location_name: string;
  map_x: number;
  map_y: number;
  status: "online" | "maintenance" | "offline";
};

const incidentSelectWithBuzzer =
  "id, public_id, category, device_id, location_name, occurred_at, status, trigger_method, voice_context_available, caller_context, assigned_responder_name, priority, incident_status_updates(remarks, created_at, status), device_locations(buzzer_active, buzzer_updated_at)";

const incidentSelectWithoutBuzzer =
  "id, public_id, category, device_id, location_name, occurred_at, status, trigger_method, voice_context_available, caller_context, assigned_responder_name, priority, incident_status_updates(remarks, created_at, status)";

export async function fetchIncidents(): Promise<Incident[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockIncidents;

  const primary = await supabase
    .from("incidents")
    .select(incidentSelectWithBuzzer)
    .order("occurred_at", { ascending: false });
  let data: unknown = primary.data;
  let error = primary.error;

  if (error) {
    const retry = await supabase
      .from("incidents")
      .select(incidentSelectWithoutBuzzer)
      .order("occurred_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    console.warn(
      "Using mock incidents because Supabase fetch failed:",
      error?.message,
    );
    return mockIncidents;
  }

  return (data as IncidentRow[]).map(mapIncidentRow);
}

export async function fetchResponders(): Promise<Responder[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockResponders;

  const { data, error } = await supabase
    .from("responders")
    .select(
      "id, public_code, name, agency_unit, role, contact_number, availability, current_assignment, last_status_update",
    )
    .order("name");

  if (error || !data) {
    console.warn(
      "Using mock responders because Supabase fetch failed:",
      error?.message,
    );
    return mockResponders;
  }

  return (data as ResponderRow[]).map((row) => ({
    id: row.public_code,
    name: row.name,
    agency: row.agency_unit,
    role: row.role,
    contactNumber: row.contact_number ?? "Not provided",
    availability: mapResponderAvailability(row.availability),
    currentAssignment: row.current_assignment ?? "None",
    lastStatusUpdate: formatTimestamp(row.last_status_update),
  }));
}

export async function fetchDeviceNodes(): Promise<DeviceNode[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockDeviceNodes;

  const { data, error } = await supabase
    .from("device_locations")
    .select("device_id, name, location_name, map_x, map_y, status")
    .order("device_id");

  if (error || !data) {
    console.warn(
      "Using mock device nodes because Supabase fetch failed:",
      error?.message,
    );
    return mockDeviceNodes;
  }

  return (data as DeviceLocationRow[]).map((row) => ({
    id: row.device_id,
    name: row.name,
    location: row.location_name,
    coordinates: {
      x: Number(row.map_x),
      y: Number(row.map_y),
    },
    status: row.status === "maintenance" ? "Maintenance" : "Online",
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

export async function assignResponderToIncident(
  responderPublicCode: string,
  incidentPublicId: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, reason: "Supabase is not configured." };

  const [
    { data: responder, error: responderError },
    { data: incident, error: incidentError },
  ] = await Promise.all([
    supabase
      .from("responders")
      .select("id, name, agency_unit")
      .eq("public_code", responderPublicCode)
      .single(),
    supabase
      .from("incidents")
      .select("id, public_id, status, assigned_responder_name")
      .eq("public_id", incidentPublicId)
      .single(),
  ]);

  if (responderError || !responder)
    return {
      ok: false,
      reason: responderError?.message ?? "Responder not found.",
    };
  if (incidentError || !incident)
    return {
      ok: false,
      reason: incidentError?.message ?? "Incident not found.",
    };

  if (["resolved", "closed", "false_alert"].includes(incident.status)) {
    return {
      ok: false,
      reason: `${incident.public_id} is already ${mapStatus(incident.status as IncidentRow["status"])} and cannot be reassigned.`,
    };
  }

  if (incident.assigned_responder_name === responder.name) {
    return {
      ok: true,
      reason: `${responder.name} is already assigned to ${incident.public_id}.`,
    };
  }

  const now = new Date().toISOString();
  const { error: incidentUpdateError } = await supabase
    .from("incidents")
    .update({
      assigned_responder_name: responder.name,
      assigned_unit: responder.agency_unit,
      status: "assigned",
    })
    .eq("id", incident.id);

  if (incidentUpdateError)
    return { ok: false, reason: incidentUpdateError.message };

  const { error: responderUpdateError } = await supabase
    .from("responders")
    .update({
      availability: "dispatched",
      current_assignment: incident.public_id,
      last_status_update: now,
    })
    .eq("id", responder.id);

  if (responderUpdateError)
    return { ok: false, reason: responderUpdateError.message };

  const { error: assignmentError } = await supabase
    .from("incident_assignments")
    .insert({
      incident_id: incident.id,
      responder_id: responder.id,
      assigned_unit: responder.agency_unit,
      notes: `Assigned from NodeGuard dashboard to ${responder.name}.`,
    });

  if (assignmentError) return { ok: false, reason: assignmentError.message };

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      responder_id: responder.id,
      incident_id: incident.id,
      type: "assignment",
      title: `New incident assigned: ${incident.public_id}`,
      message: `${incident.public_id} assigned to ${responder.name}.`,
      is_read: false,
    });

  if (notificationError)
    return { ok: false, reason: notificationError.message };

  return { ok: true };
}

export async function setDeviceBuzzer(
  deviceId: string,
  active: boolean,
  source: "dashboard" | "personnel_app" = "dashboard",
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, reason: "Supabase is not configured." };

  const { error } = await supabase.rpc("set_device_buzzer", {
    p_device_id: deviceId,
    p_active: active,
    p_source: source,
  });

  return error ? { ok: false, reason: error.message } : { ok: true };
}

function mapIncidentRow(row: IncidentRow): Incident {
  const fieldNotes = (row.incident_status_updates ?? [])
    .filter((update) => update.remarks && update.remarks.trim().length > 0)
    .toSorted((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );
  const deviceLocation = Array.isArray(row.device_locations)
    ? row.device_locations[0]
    : row.device_locations;

  return {
    id: row.public_id,
    category: mapCategory(row.category),
    deviceId: row.device_id,
    location: row.location_name,
    timestamp: formatTimestamp(row.occurred_at),
    status: mapStatus(row.status),
    triggerMethod: row.trigger_method === "button" ? "Button" : "Voice",
    voiceContext: row.voice_context_available
      ? "Voice clip attached"
      : "No voice context",
    callerContext: row.caller_context,
    assignedResponder: row.assigned_responder_name ?? "Unassigned",
    priority:
      row.priority === "critical"
        ? "Critical"
        : row.priority === "high"
          ? "High"
          : "Moderate",
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
  };
}

function mapCategory(category: IncidentRow["category"]): Incident["category"] {
  if (category === "medical") return "Medical Emergency";
  if (category === "security_public_safety") return "Security/Public Safety";
  return "Fire/Disaster Emergency";
}

function mapStatus(status: IncidentRow["status"]): IncidentStatus {
  switch (status) {
    case "new_alert":
      return "New Alert";
    case "assigned":
      return "Assigned";
    case "en_route":
      return "En Route";
    case "on_scene":
      return "On Scene";
    case "responding":
      return "Responding";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    case "need_backup":
      return "Need Backup";
    case "false_alert":
      return "False Alert";
  }
}

function mapWebStatusToDb(status: IncidentStatus) {
  switch (status) {
    case "New Alert":
      return "new_alert";
    case "Assigned":
      return "assigned";
    case "En Route":
      return "en_route";
    case "On Scene":
      return "on_scene";
    case "Responding":
      return "responding";
    case "Resolved":
      return "resolved";
    case "Closed":
      return "closed";
    case "Need Backup":
      return "need_backup";
    case "False Alert":
      return "false_alert";
  }
}

function mapResponderAvailability(
  availability: ResponderRow["availability"],
): Responder["availability"] {
  if (availability === "available") return "Available";
  if (availability === "dispatched") return "Dispatched";
  if (availability === "offline") return "Offline";
  return "Busy";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}`;
}
