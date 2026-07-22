import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { OperationalRole, OrganizationType } from "@/types";

export type LegacyDashboardRole = "personnel" | "admin" | "super_admin";
export type DashboardRole = LegacyDashboardRole | OperationalRole;

export type RequestActor = {
  id: string;
  name: string;
  role: DashboardRole;
  effectiveRole: OperationalRole;
  barangayId: string | null;
  organizationType: OrganizationType;
  organizationName: string;
  demo: boolean;
};

export type IncidentPermission =
  | "read"
  | "validate"
  | "dispatch"
  | "coordinate"
  | "status"
  | "escalate"
  | "close";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function normalizeOperationalRole(
  role: DashboardRole,
  barangayId?: string | null,
): OperationalRole {
  if (role === "super_admin") return "mdrrmo_admin";
  if (role === "admin") return "mdrrmo_operations";
  if (role === "personnel") return barangayId ? "barangay_personnel" : "field_responder";
  return role;
}

export function isBarangayRole(role: OperationalRole) {
  return role === "barangay_admin" || role === "barangay_personnel";
}

export function isMdrrmoRole(role: OperationalRole) {
  return role === "mdrrmo_admin" || role === "mdrrmo_operations";
}

export function roleHome(role: OperationalRole) {
  if (isBarangayRole(role)) return "/barangay/overview";
  if (isMdrrmoRole(role)) return "/mdrrmo/overview";
  return "/responder";
}

export function getDemoActor(request?: Request): RequestActor {
  const requestedRole = request?.headers.get("x-nodeguard-demo-role") as OperationalRole | null;
  const effectiveRole: OperationalRole = requestedRole && [
    "barangay_admin",
    "barangay_personnel",
    "mdrrmo_admin",
    "mdrrmo_operations",
    "field_responder",
  ].includes(requestedRole)
    ? requestedRole
    : "mdrrmo_admin";
  const barangay = isBarangayRole(effectiveRole);
  return {
    id: "demo-operator",
    name: barangay ? "Demo Barangay Operator" : "Demo Municipal Operator",
    role: effectiveRole,
    effectiveRole,
    barangayId: barangay ? "brgy-pico" : null,
    organizationType: barangay ? "Barangay" : "LT-MDRRMO",
    organizationName: barangay ? "Barangay Pico" : "LT-MDRRMO",
    demo: true,
  };
}

async function loadProfileActor(userId: string): Promise<RequestActor> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new AuthorizationError("NodeGuard authentication is unavailable.", 401);

  const enhanced = await supabase
    .from("profiles")
    .select("full_name, role, is_active, barangay_id, organization_type, organization_name, agency_unit")
    .eq("id", userId)
    .maybeSingle();

  let profile = enhanced.data as null | {
    full_name: string;
    role: DashboardRole;
    is_active: boolean;
    barangay_id?: string | null;
    organization_type?: string | null;
    organization_name?: string | null;
    agency_unit?: string | null;
  };
  let profileError = enhanced.error;
  if (profileError) {
    const legacy = await supabase
      .from("profiles")
      .select("full_name, role, is_active, agency_unit")
      .eq("id", userId)
      .maybeSingle();
    profile = legacy.data as typeof profile;
    profileError = legacy.error;
  }

  if (profileError || !profile || profile.is_active === false) {
    throw new AuthorizationError(
      "This account is not linked to an active NodeGuard personnel profile.",
      403,
    );
  }

  const role = profile.role;
  const barangayId = profile.barangay_id ?? null;
  const effectiveRole = normalizeOperationalRole(role, barangayId);
  const barangayOperator = isBarangayRole(effectiveRole);
  return {
    id: userId,
    name: profile.full_name,
    role,
    effectiveRole,
    barangayId,
    organizationType: barangayOperator ? "Barangay" : "LT-MDRRMO",
    organizationName:
      profile.organization_name ??
      (barangayOperator ? profile.agency_unit ?? "Assigned Barangay" : "LT-MDRRMO"),
    demo: false,
  };
}

export async function actorFromAccessToken(token: string): Promise<RequestActor> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new AuthorizationError("NodeGuard authentication is unavailable.", 401);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AuthorizationError("The dashboard session is invalid or expired.", 401);
  }
  return loadProfileActor(user.id);
}

export async function requireRequestActor(
  request: Request,
  allowedRoles: DashboardRole[],
): Promise<RequestActor> {
  if (!isSupabaseConfigured()) {
    const actor = getDemoActor(request);
    if (!allowedRoles.includes(actor.role) && !allowedRoles.includes(actor.effectiveRole)) {
      throw new AuthorizationError("Your NodeGuard role cannot perform this operation.", 403);
    }
    return actor;
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) throw new AuthorizationError("A valid dashboard session is required.", 401);

  const actor = await actorFromAccessToken(token);
  if (!allowedRoles.includes(actor.role) && !allowedRoles.includes(actor.effectiveRole)) {
    throw new AuthorizationError("Your NodeGuard role cannot perform this operation.", 403);
  }
  return actor;
}

export async function requireIncidentPermission(
  actor: RequestActor,
  publicId: string,
  permission: IncidentPermission,
) {
  if (actor.demo) {
    const { getDemoIncident } = await import("@/lib/nodeguardDemoStore");
    const incident = getDemoIncident(publicId);
    if (!incident) throw new AuthorizationError("Demo incident not found.", 403);
    if (isBarangayRole(actor.effectiveRole) && incident.barangayId === actor.barangayId) {
      if (incident.managementMode !== "LT-MDRRMO Direct") {
        if (permission === "read" || permission === "status" || incident.managementMode !== "Municipal Coordination") return;
      }
    }
    if (isMdrrmoRole(actor.effectiveRole) && permission === "read") return;
    if (
      isMdrrmoRole(actor.effectiveRole) &&
      permission !== "escalate" &&
      (
        ["LT-MDRRMO Direct", "Municipal Coordination"].includes(incident.managementMode ?? "")
        || (incident.escalationStatus && incident.escalationStatus !== "Not Escalated")
        || incident.mdrrmoFallbackActive
      )
    ) return;
    if (
      actor.effectiveRole === "field_responder" &&
      ["read", "status"].includes(permission) &&
      incident.assignedResponder !== "Unassigned"
    ) return;
    throw new AuthorizationError("This action is outside the selected demo role.", 403);
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new AuthorizationError("NodeGuard authorization is unavailable.", 403);
  const enhanced = await supabase
    .from("incidents")
    .select("id, barangay_id, escalation_status, status, intake_organization, managing_organization, after_hours_alert, barangay_acknowledged_at, barangay_acknowledgement_due_at")
    .eq("public_id", publicId)
    .maybeSingle();
  let incidentData = enhanced.data;
  let incidentError = enhanced.error;
  if (incidentError) {
    const legacy = await supabase
      .from("incidents")
      .select("id, barangay_id, escalation_status, status")
      .eq("public_id", publicId)
      .maybeSingle();
    incidentData = legacy.data ? {
      ...legacy.data,
      intake_organization: null,
      managing_organization: "barangay",
      after_hours_alert: false,
      barangay_acknowledged_at: null,
      barangay_acknowledgement_due_at: null,
    } : null;
    incidentError = legacy.error;
  }
  if (incidentError || !incidentData) {
    throw new AuthorizationError("The incident is unavailable or outside your access scope.", 403);
  }
  const incident = incidentData as {
    id: string;
    barangay_id: string | null;
    escalation_status: string | null;
    status: string;
    intake_organization: string | null;
    managing_organization: string | null;
    after_hours_alert: boolean;
    barangay_acknowledged_at: string | null;
    barangay_acknowledgement_due_at: string | null;
  };

  if (isBarangayRole(actor.effectiveRole)) {
    if (!actor.barangayId || incident.barangay_id !== actor.barangayId) {
      throw new AuthorizationError("Barangay users cannot access incidents outside their jurisdiction.", 403);
    }
    if (!["read", "status"].includes(permission) && incident.managing_organization === "mdrrmo") {
      throw new AuthorizationError("LT-MDRRMO currently holds operational coordination for this incident.", 403);
    }
    return incident;
  }

  if (isMdrrmoRole(actor.effectiveRole)) {
    if (permission === "read") return incident;
    if (permission === "escalate") {
      throw new AuthorizationError("Escalation is initiated by the responsible barangay.", 403);
    }
    const fallbackAvailable = incident.after_hours_alert
      && !incident.barangay_acknowledged_at
      && Boolean(incident.barangay_acknowledgement_due_at)
      && new Date(incident.barangay_acknowledgement_due_at!).getTime() <= Date.now();
    const municipalControl = incident.managing_organization === "mdrrmo"
      || (incident.escalation_status && incident.escalation_status !== "not_escalated")
      || fallbackAvailable;
    if (!municipalControl) {
      throw new AuthorizationError(
        "LT-MDRRMO may monitor this barangay-managed incident, but operational control has not transferred.",
        403,
      );
    }
    return incident;
  }

  if (actor.effectiveRole === "field_responder" && ["read", "status"].includes(permission)) {
    const { data: responder } = await supabase
      .from("responders")
      .select("id")
      .eq("profile_id", actor.id)
      .maybeSingle();
    const { data: assignment } = responder
      ? await supabase
          .from("incident_assignments")
          .select("id")
          .eq("incident_id", incident.id)
          .eq("responder_id", responder.id)
          .is("released_at", null)
          .maybeSingle()
      : { data: null };
    if (assignment) return incident;
  }

  throw new AuthorizationError("You are not authorized for this incident.", 403);
}

export async function requireResponderAssignmentPermission(
  actor: RequestActor,
  responderCode: string,
  incidentPublicId: string,
) {
  await requireIncidentPermission(actor, incidentPublicId, "dispatch");
  if (actor.demo) return;
  const supabase = getSupabaseClient();
  const { data: responder, error } = await supabase!
    .from("responders")
    .select("barangay_id, organization_type")
    .eq("public_code", responderCode)
    .maybeSingle();
  if (error || !responder) throw new AuthorizationError("Responder or unit not found.", 403);
  if (isBarangayRole(actor.effectiveRole) && (responder.organization_type !== "barangay" || responder.barangay_id !== actor.barangayId)) {
    throw new AuthorizationError("Barangay personnel may assign only their local responders.", 403);
  }
  if (isMdrrmoRole(actor.effectiveRole) && responder.organization_type === "barangay") {
    throw new AuthorizationError("Barangay-controlled responders remain under barangay jurisdiction.", 403);
  }
}

export async function requireResourcePermission(
  actor: RequestActor,
  resourceCode: string,
  incidentPublicId?: string,
) {
  if (incidentPublicId) await requireIncidentPermission(actor, incidentPublicId, "coordinate");
  if (actor.demo) return;
  const supabase = getSupabaseClient();
  const { data: resource, error } = await supabase!
    .from("response_resources")
    .select("barangay_id, organization_type, assigned_incident_public_id")
    .eq("public_code", resourceCode)
    .maybeSingle();
  if (error || !resource) throw new AuthorizationError("Response resource not found.", 403);
  if (!incidentPublicId && resource.assigned_incident_public_id) {
    await requireIncidentPermission(actor, resource.assigned_incident_public_id, "coordinate");
  }
  if (isBarangayRole(actor.effectiveRole) && (resource.organization_type !== "barangay" || resource.barangay_id !== actor.barangayId)) {
    throw new AuthorizationError("Barangay personnel may manage only locally owned resources.", 403);
  }
  if (isMdrrmoRole(actor.effectiveRole) && resource.organization_type === "barangay") {
    throw new AuthorizationError("Barangay-controlled resources remain under barangay jurisdiction.", 403);
  }
}

export async function requireDevicePermission(actor: RequestActor, deviceId: string) {
  if (actor.demo) return;
  const supabase = getSupabaseClient();
  const { data: device, error } = await supabase!
    .from("device_locations")
    .select("barangay_id")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error || !device) throw new AuthorizationError("Registered node not found.", 403);
  if (isBarangayRole(actor.effectiveRole) && device.barangay_id !== actor.barangayId) {
    throw new AuthorizationError("Barangay users may access only nodes in their jurisdiction.", 403);
  }
  if (actor.effectiveRole === "field_responder") {
    throw new AuthorizationError("Field responders cannot manage registered nodes.", 403);
  }
}

export async function requireBackupRequestPermission(
  actor: RequestActor,
  requestId: string,
) {
  if (actor.demo) return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase!
    .from("backup_requests")
    .select("incidents(public_id)")
    .eq("id", requestId)
    .maybeSingle();
  const incidentRelation = data?.incidents;
  const incident = Array.isArray(incidentRelation) ? incidentRelation[0] : incidentRelation;
  if (error || !incident?.public_id) {
    throw new AuthorizationError("Backup request not found.", 403);
  }
  await requireIncidentPermission(actor, incident.public_id, "coordinate");
}

export async function requireBackupOfferPermission(
  actor: RequestActor,
  offerId: string,
) {
  if (actor.demo) return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase!
    .from("backup_offers")
    .select("backup_requests(incidents(public_id))")
    .eq("id", offerId)
    .maybeSingle();
  const requestRelation = data?.backup_requests;
  const backupRequest = Array.isArray(requestRelation) ? requestRelation[0] : requestRelation;
  const incidentRelation = backupRequest?.incidents;
  const incident = Array.isArray(incidentRelation) ? incidentRelation[0] : incidentRelation;
  if (error || !incident?.public_id) {
    throw new AuthorizationError("Backup offer not found.", 403);
  }
  await requireIncidentPermission(actor, incident.public_id, "coordinate");
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const supabase = getSupabaseClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!session && typeof window !== "undefined") {
    const demoRole = window.localStorage.getItem("nodeguard.demo-role");
    if (demoRole) headers.set("x-nodeguard-demo-role", demoRole);
  }
  return fetch(input, { ...init, headers });
}
