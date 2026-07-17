import { describe, expect, it } from "vitest";
import { getValidIncidentActions } from "@/config/incidentOperations";
import type { Incident, IncidentStatus } from "@/types";

function incident(status: IncidentStatus): Incident {
  return {
    id: "NG-TEST",
    category: "Medical Emergency",
    deviceId: "LT-NODE-001",
    location: "Pico",
    timestamp: "2026-07-17T10:00:00+08:00",
    status,
    triggerMethod: "Button",
    voiceContext: "No voice context",
    callerContext: "Test incident",
    assignedResponder: "EMS Team Alpha",
    alertLevel: "High",
  };
}

describe("dashboard incident workflow actions", () => {
  it("never offers a dispatcher Resolve action", () => {
    expect(getValidIncidentActions(incident("Responding"))).not.toContain("resolve");
    expect(getValidIncidentActions(incident("On Scene"))).not.toContain("resolve");
  });

  it("allows dashboard closure only after responder resolution", () => {
    expect(getValidIncidentActions(incident("On Scene"))).not.toContain("close");
    expect(getValidIncidentActions(incident("Resolved"))).toContain("close");
  });
});
