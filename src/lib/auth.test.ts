import { beforeEach, describe, expect, it } from "vitest";
import {
  getDemoActor,
  normalizeOperationalRole,
  requireIncidentPermission,
  roleHome,
} from "@/lib/auth";
import { demoAcknowledgeEscalation, demoClassifyIncident, demoCreateIncident, demoEscalateIncident, resetDemoState } from "@/lib/nodeguardDemoStore";

describe("NodeGuard operational roles", () => {
  beforeEach(() => resetDemoState());
  it("maps legacy roles without merging the two controller environments", () => {
    expect(normalizeOperationalRole("super_admin")).toBe("mdrrmo_admin");
    expect(normalizeOperationalRole("admin")).toBe("mdrrmo_operations");
    expect(normalizeOperationalRole("personnel", "barangay-id")).toBe("barangay_personnel");
    expect(normalizeOperationalRole("personnel", null)).toBe("field_responder");
  });

  it("routes each operational role to its own interface", () => {
    expect(roleHome("barangay_admin")).toBe("/barangay/overview");
    expect(roleHome("barangay_personnel")).toBe("/barangay/overview");
    expect(roleHome("mdrrmo_admin")).toBe("/mdrrmo/overview");
    expect(roleHome("mdrrmo_operations")).toBe("/mdrrmo/overview");
    expect(roleHome("field_responder")).toBe("/responder");
  });

  it("scopes the barangay demo actor to one owning barangay", () => {
    const actor = getDemoActor(new Request("https://nodeguard.test", {
      headers: { "x-nodeguard-demo-role": "barangay_personnel" },
    }));
    expect(actor.organizationType).toBe("Barangay");
    expect(actor.barangayId).toBe("brgy-pico");
  });

  it("keeps barangay read and field-update access after municipal acknowledgement", async () => {
    const barangay = getDemoActor(new Request("https://nodeguard.test", { headers: { "x-nodeguard-demo-role": "barangay_personnel" } }));
    const municipal = getDemoActor(new Request("https://nodeguard.test", { headers: { "x-nodeguard-demo-role": "mdrrmo_operations" } }));
    const incident = demoCreateIncident({ reportingChannel: "Walk-in Report", reportingSource: "Reporter", category: "Medical Emergency", incidentSubtype: "Medical assistance", description: "Test", location: "Pico", barangayId: "brgy-pico", reportedAt: new Date().toISOString(), personsAffected: 1, alertLevel: "High", managementMode: "Barangay Managed" }, barangay.name);
    demoClassifyIncident(incident.id, { result: "Validated", notes: "Confirmed", method: "Reporter follow-up", contacted: "Reporter", evidence: "Statement" }, barangay.name);
    demoEscalateIncident(incident.id, "Municipal support", barangay.name);
    demoAcknowledgeEscalation(incident.id, "Acknowledged", municipal.name);

    await expect(requireIncidentPermission(barangay, incident.id, "read")).resolves.toBeUndefined();
    await expect(requireIncidentPermission(barangay, incident.id, "status")).resolves.toBeUndefined();
    await expect(requireIncidentPermission(barangay, incident.id, "coordinate")).rejects.toMatchObject({ status: 403 });
  });

  it("does not expose direct municipal reports to barangay roles", async () => {
    const barangay = getDemoActor(new Request("https://nodeguard.test", { headers: { "x-nodeguard-demo-role": "barangay_personnel" } }));
    const incident = demoCreateIncident({ reportingChannel: "Emergency Hotline", reportingSource: "Caller", category: "Security/Public Safety", incidentSubtype: "Traffic or crowd safety", description: "Test", location: "Municipal hall", reportedAt: new Date().toISOString(), personsAffected: 0, alertLevel: "Moderate", managementMode: "LT-MDRRMO Direct" }, "LT-MDRRMO Operations");
    await expect(requireIncidentPermission(barangay, incident.id, "read")).rejects.toMatchObject({ status: 403 });
  });
});
