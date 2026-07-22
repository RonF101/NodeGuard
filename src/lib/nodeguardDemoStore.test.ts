import { beforeEach, describe, expect, it } from "vitest";
import {
  demoAcknowledgeEscalation,
  demoAddFieldUpdate,
  demoAssignResource,
  demoAssignResponder,
  demoClassifyIncident,
  demoCloseIncident,
  demoCreateIncident,
  demoEscalateIncident,
  demoSimulateNodeActivation,
  demoUpdateIncidentStatus,
  getDemoAuditLogs,
  getDemoIncident,
  getDemoSnapshot,
  getDemoState,
  resetDemoState,
} from "@/lib/nodeguardDemoStore";

const barangayActor = {
  id: "demo-barangay",
  name: "Barangay Pico Emergency Desk",
  effectiveRole: "barangay_admin" as const,
  barangayId: "brgy-pico",
};

const municipalActor = {
  id: "demo-mdrrmo",
  name: "LT-MDRRMO Operations",
  effectiveRole: "mdrrmo_admin" as const,
  barangayId: null,
};

function createPicoIncident() {
  return demoCreateIncident({
    reportingChannel: "Walk-in Report",
    reportingSource: "Prototype caller",
    reporterContact: "0917 000 0000",
    category: "Medical Emergency",
    incidentSubtype: "Injury / trauma",
    description: "Person injured near the covered court.",
    location: "Pico covered court",
    barangayId: "brgy-pico",
    reportedAt: new Date().toISOString(),
    personsAffected: 1,
    alertLevel: "High",
    managementMode: "Barangay Managed",
  }, barangayActor.name);
}

describe("persistent NodeGuard demo workflow", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("runs intake through validation, dispatch, field response, resolution, and closure", () => {
    const incident = createPicoIncident();

    expect(getDemoIncident(incident.id)?.status).toBe("Pending Validation");
    expect(demoClassifyIncident(incident.id, {
      result: "Validated",
      notes: "Caller and barangay tanod confirmed the incident.",
      method: "Phone callback and on-site confirmation",
      contacted: "Reporter and Pico response desk",
      evidence: "Verbal confirmation; prototype attachment metadata",
    }, barangayActor.name).ok).toBe(true);
    expect(demoAssignResponder(incident.id, "RESP-005", "Bring trauma kit.", barangayActor.name).ok).toBe(true);
    expect(demoAssignResource(incident.id, "AMB-001", municipalActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "Dispatched", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "Responding", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "On Scene", barangayActor.name).ok).toBe(true);
    expect(demoAddFieldUpdate(incident.id, "Patient assessed and stabilized for transport.", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "Resolved", barangayActor.name).ok).toBe(true);
    expect(demoCloseIncident(incident.id, "First aid and transport", "Patient transferred safely", "Closed after handoff.", municipalActor.name).ok).toBe(true);

    const completed = getDemoIncident(incident.id);
    expect(completed).toMatchObject({
      status: "Closed",
      validationResult: "Validated",
      fieldNoteCount: 1,
      actionsTaken: "First aid and transport",
    });
    expect(getDemoState().responders.find((item) => item.id === "RESP-005")).toMatchObject({
      availability: "Available",
      currentAssignment: "None",
    });
    expect(getDemoState().resources.find((item) => item.id === "AMB-001")).toMatchObject({
      status: "Available",
      assignedIncident: "None",
    });
    expect(getDemoAuditLogs().some((entry) => entry.entityId === incident.id && entry.action === "close_incident")).toBe(true);
  });

  it("creates an IoT incident, mock SMS state, after-hours fallback, and escalation handoff", () => {
    const activation = demoSimulateNodeActivation("LT-NODE-001", "Fire/Disaster Emergency", barangayActor.name, true);
    expect(activation.ok).toBe(true);
    if (!activation.ok) return;

    expect(activation.incident).toMatchObject({
      sourceType: "IoT Node",
      status: "Pending Validation",
      afterHoursAlert: true,
      mdrrmoFallbackActive: true,
      smsNotification: { providerMode: "Mock", status: "Pending" },
    });
    expect(demoClassifyIncident(activation.incident.id, {
      result: "Validated",
      notes: "Smoke observed by the barangay response desk.",
      method: "On-site confirmation",
      contacted: "Barangay Pico response desk",
      evidence: "Activation-time camera placeholder reviewed",
    }, barangayActor.name).ok).toBe(true);
    expect(demoEscalateIncident(activation.incident.id, "Fire suppression support required.", barangayActor.name).ok).toBe(true);
    expect(demoAcknowledgeEscalation(activation.incident.id, "BFP coordination started.", municipalActor.name).ok).toBe(true);

    expect(getDemoIncident(activation.incident.id)).toMatchObject({
      status: "Validated",
      escalationStatus: "Coordinating",
      managementMode: "Municipal Coordination",
    });
    expect(getDemoState().nodes.find((node) => node.id === "LT-NODE-001")?.lastActivationTime).toBe(activation.activation.activatedAt);
  });

  it("keeps barangay snapshots jurisdiction-scoped while municipal oversight sees all records", () => {
    const picoIncident = createPicoIncident();
    const pico = getDemoSnapshot(barangayActor);
    const municipal = getDemoSnapshot(municipalActor);

    expect(pico.incidents.some((incident) => incident.id === picoIncident.id)).toBe(true);
    expect(pico.incidents.every((incident) => incident.barangayId === "brgy-pico")).toBe(true);
    expect(pico.nodes.every((node) => node.barangayId === "brgy-pico")).toBe(true);
    expect(municipal.incidents.length).toBeGreaterThan(pico.incidents.length);
    expect(municipal.nodes.length).toBeGreaterThan(pico.nodes.length);
  });

  it("preserves operational progress across escalation, municipal support, resolution, and closure", () => {
    const incident = createPicoIncident();
    expect(demoClassifyIncident(incident.id, {
      result: "Validated",
      notes: "Barangay desk confirmed the report.",
      method: "Phone or radio confirmation",
      contacted: "Reporter and response desk",
      evidence: "Corroborated incident details",
    }, barangayActor.name).ok).toBe(true);
    expect(demoAssignResponder(incident.id, "RESP-005", "Proceed with trauma kit.", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "Dispatched", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "Responding", barangayActor.name).ok).toBe(true);
    expect(demoEscalateIncident(incident.id, "Municipal transport support required.", barangayActor.name).ok).toBe(true);
    expect(getDemoIncident(incident.id)).toMatchObject({ status: "Responding", escalationStatus: "Pending Acknowledgement" });
    expect(demoAcknowledgeEscalation(incident.id, "Municipal support coordinated.", municipalActor.name).ok).toBe(true);
    expect(getDemoIncident(incident.id)).toMatchObject({ status: "Responding", escalationStatus: "Coordinating" });
    expect(getDemoSnapshot(barangayActor).incidents.some((item) => item.id === incident.id)).toBe(true);
    expect(demoAssignResource(incident.id, "AMB-001", municipalActor.name).ok).toBe(true);
    expect(demoAddFieldUpdate(incident.id, "Municipal ambulance met the barangay team.", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "On Scene", barangayActor.name).ok).toBe(true);
    expect(demoUpdateIncidentStatus(incident.id, "Resolved", barangayActor.name).ok).toBe(true);
    expect(demoCloseIncident(incident.id, "Patient stabilized and transported", "Completed", "Joint response documented.", municipalActor.name).ok).toBe(true);

    const completed = getDemoIncident(incident.id)!;
    expect(completed.status).toBe("Closed");
    expect(completed.activityHistory?.length).toBeGreaterThanOrEqual(10);
    const actions = getDemoAuditLogs().filter((entry) => entry.entityId === incident.id).map((entry) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(["create_incident", "classify_incident", "assign_responder", "escalate_incident", "acknowledge_escalation", "assign_resource", "submit_field_update", "update_incident_status", "close_incident"]));
  });

  it("creates direct LT-MDRRMO reports without forcing barangay ownership", () => {
    const incident = demoCreateIncident({
      reportingChannel: "Emergency Hotline",
      reportingSource: "Municipal caller",
      category: "Security/Public Safety",
      incidentSubtype: "Traffic or crowd safety",
      description: "Municipal traffic incident requiring direct coordination.",
      location: "Municipal hall junction",
      reportedAt: new Date().toISOString(),
      personsAffected: 0,
      alertLevel: "Moderate",
      managementMode: "LT-MDRRMO Direct",
    }, municipalActor.name);

    expect(incident).toMatchObject({ intakeOrganization: "LT-MDRRMO", managementMode: "LT-MDRRMO Direct" });
    expect(incident.barangayId).toBeUndefined();
    expect(getDemoSnapshot(municipalActor).incidents.some((item) => item.id === incident.id)).toBe(true);
    expect(getDemoSnapshot(barangayActor).incidents.some((item) => item.id === incident.id)).toBe(false);
  });
});
