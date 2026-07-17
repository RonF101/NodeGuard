import { describe, expect, it } from "vitest";
import {
  alertLevelOrder,
  compareAlertLevels,
  sortIncidentsByAlertLevel,
} from "@/config/alertLevels";
import type { AlertLevel, Incident } from "@/types";

function incident(id: string, alertLevel: AlertLevel, timestamp: string): Incident {
  return {
    id,
    category: "Medical Emergency",
    deviceId: `NODE-${id}`,
    location: "La Trinidad",
    timestamp,
    status: "Pending Verification",
    triggerMethod: "Voice",
    voiceContext: "No voice context",
    callerContext: "Test incident",
    assignedResponder: "Unassigned",
    alertLevel,
  };
}

describe("shared alert-level ranking", () => {
  it("uses the required non-alphabetic order with Unassessed first", () => {
    expect(alertLevelOrder).toEqual([
      "Unassessed",
      "Critical",
      "High",
      "Moderate",
      "Low",
    ]);
    expect(compareAlertLevels("Unassessed", "Critical")).toBeLessThan(0);
    expect(compareAlertLevels("Critical", "Low")).toBeLessThan(0);
  });

  it("sorts by alert level and then newest reported time with a stable id fallback", () => {
    const sorted = sortIncidentsByAlertLevel([
      incident("LOW", "Low", "2026-07-17T10:00:00+08:00"),
      incident("HIGH-OLD", "High", "2026-07-17T09:00:00+08:00"),
      incident("UNASSESSED", "Unassessed", "2026-07-17T08:00:00+08:00"),
      incident("HIGH-NEW", "High", "2026-07-17T11:00:00+08:00"),
    ]);
    expect(sorted.map(({ id }) => id)).toEqual([
      "UNASSESSED",
      "HIGH-NEW",
      "HIGH-OLD",
      "LOW",
    ]);
  });

  it("reverses the alert-level groups without losing the newest-first tiebreaker", () => {
    const sorted = sortIncidentsByAlertLevel([
      incident("CRITICAL", "Critical", "2026-07-17T08:00:00+08:00"),
      incident("LOW", "Low", "2026-07-17T09:00:00+08:00"),
      incident("UNASSESSED", "Unassessed", "2026-07-17T10:00:00+08:00"),
    ], true);
    expect(sorted.map(({ id }) => id)).toEqual(["LOW", "CRITICAL", "UNASSESSED"]);
  });
});
