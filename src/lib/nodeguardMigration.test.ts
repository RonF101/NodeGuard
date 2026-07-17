import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve("supabase/migrations/0008_alert_levels_and_backup_requests.sql"),
  "utf8",
);

const responderWorkflowMigration = readFileSync(
  path.resolve("supabase/migrations/0010_responder_resolution_and_backup_demo.sql"),
  "utf8",
);

describe("alert-level and backup database contract", () => {
  it("enforces authorized alert-level updates and writes an immutable audit entry", () => {
    expect(migration).toContain("create or replace function public.update_nodeguard_alert_level");
    expect(migration).toContain("Only a dispatcher or responder assigned to this incident");
    expect(migration).toContain("insert into public.incident_priority_updates");
    expect(migration).toContain("insert into public.audit_logs");
  });

  it("prevents duplicate offers and validates availability", () => {
    expect(migration).toContain("unique (backup_request_id, responder_id)");
    expect(migration).toContain("Only responders marked Available can offer assistance");
    expect(migration).toContain("This responder has already offered assistance");
  });

  it("supports the complete backup lifecycle and closes active requests with final incidents", () => {
    for (const status of [
      "requested",
      "assistance_offered",
      "partially_filled",
      "confirmed",
      "fulfilled",
      "cancelled",
      "closed",
    ]) {
      expect(migration).toContain(`'${status}'`);
    }
    expect(migration).toContain("close_backup_requests_for_final_incident");
    expect(migration).toContain("incident_activity_events");
  });
});

describe("responder resolution and backup demo contract", () => {
  it("reserves incident resolution for a linked assigned responder", () => {
    expect(responderWorkflowMigration).toContain(
      "Only the assigned responder can resolve an incident",
    );
    expect(responderWorkflowMigration).toContain(
      "assigned_responder_name is distinct from v_responder.name",
    );
  });

  it("seeds the non-Ronie backup demonstration", () => {
    expect(responderWorkflowMigration).toContain("NG-2026-207");
    expect(responderWorkflowMigration).toContain("EMS Team Alpha");
    expect(responderWorkflowMigration).toContain("BR-DEMO-207");
    expect(responderWorkflowMigration).toContain(
      "array['medical', 'equipment_vehicle']",
    );
  });
});
