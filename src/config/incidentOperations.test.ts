import { describe, expect, it } from "vitest";
import { getIncidentStatusLabel, getValidIncidentActions } from "@/config/incidentOperations";
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
  it("offers an authorized Resolve action after active response begins", () => {
    expect(getValidIncidentActions(incident("Dispatched"))).not.toContain("resolve");
    expect(getValidIncidentActions(incident("Responding"))).toContain("resolve");
    expect(getValidIncidentActions(incident("On Scene"))).toContain("resolve");
  });

  it("keeps assignment and dispatch as separate confirmed steps", () => {
    expect(getValidIncidentActions(incident("Assigned"))).toContain("confirm-dispatch");
    expect(getValidIncidentActions(incident("Assigned"))).not.toContain("start-response");
    expect(getValidIncidentActions(incident("Dispatched"))).toContain("start-response");
  });

  it("allows dashboard closure only after responder resolution", () => {
    expect(getValidIncidentActions(incident("On Scene"))).not.toContain("close");
    expect(getValidIncidentActions(incident("Resolved"))).toContain("close");
  });

  it("returns an unable-to-respond incident to the dispatch queue", () => {
    expect(getValidIncidentActions(incident("Unable to Respond"))).toContain("dispatch");
    expect(getValidIncidentActions(incident("Unable to Respond"))).not.toContain("close");
  });

  it("presents a reviewed unassigned incident as awaiting assignment", () => {
    expect(getIncidentStatusLabel("Validated")).toBe("Awaiting Assignment");
    expect(getIncidentStatusLabel("Verified")).toBe("Awaiting Assignment");
  });
});
