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

const resourceLifecycleMigration = readFileSync(
  path.resolve("supabase/migrations/0011_resource_availability_lifecycle.sql"),
  "utf8",
);

const barangayFirstMigration = readFileSync(
  path.resolve("supabase/migrations/0012_barangay_first_operational_model.sql"),
  "utf8",
);

const omnichannelMigration = readFileSync(
  path.resolve("supabase/migrations/0013_omnichannel_intake_and_after_hours.sql"),
  "utf8",
);

const escalationSeparationMigration = readFileSync(
  path.resolve("supabase/migrations/0014_separate_operational_status_from_escalation.sql"),
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

describe("response resource lifecycle contract", () => {
  it("protects assignment, release, and availability changes behind dispatcher RPCs", () => {
    expect(resourceLifecycleMigration).toContain(
      "create or replace function public.assign_nodeguard_resource",
    );
    expect(resourceLifecycleMigration).toContain(
      "create or replace function public.release_nodeguard_resource",
    );
    expect(resourceLifecycleMigration).toContain(
      "create or replace function public.set_nodeguard_resource_status",
    );
    expect(resourceLifecycleMigration).toContain("public.is_nodeguard_dispatcher(v_actor)");
    expect(resourceLifecycleMigration).toContain("one_active_assignment_per_resource");
  });

  it("automatically returns resources to available when incidents are finalized", () => {
    expect(resourceLifecycleMigration).toContain("release_resources_for_final_incident");
    expect(resourceLifecycleMigration).toContain(
      "new.status in ('resolved', 'closed', 'false_alert')",
    );
    expect(resourceLifecycleMigration).toContain("status = 'available'");
    expect(resourceLifecycleMigration).toContain("release_reason");
  });
});

describe("barangay-first operational contract", () => {
  it("adds jurisdiction, separate controller roles, and read-versus-coordinate authorization", () => {
    for (const role of [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
      "field_responder",
    ]) {
      expect(barangayFirstMigration).toContain(`'${role}'`);
    }
    expect(barangayFirstMigration).toContain("create table if not exists public.barangays");
    expect(barangayFirstMigration).toContain("public.can_read_nodeguard_incident");
    expect(barangayFirstMigration).toContain("public.can_coordinate_nodeguard_incident");
    expect(barangayFirstMigration).toContain("i.escalation_status <> 'not_escalated'");
  });

  it("supports explicit validation, escalation, assignment instructions, and responder decline", () => {
    for (const result of [
      "validated",
      "accidental_activation",
      "duplicate_report",
      "non_emergency",
      "unverified",
      "false_or_misleading",
      "fraudulent_hoax_prank",
    ]) {
      expect(barangayFirstMigration).toContain(`'${result}'`);
    }
    expect(barangayFirstMigration).toContain("create or replace function public.escalate_nodeguard_incident");
    expect(barangayFirstMigration).toContain("assigned_by_organization");
    expect(barangayFirstMigration).toContain("assignment_instructions");
    expect(barangayFirstMigration).toContain("'unable_to_respond'");
    expect(barangayFirstMigration).toContain("Only the assigned field responder may report inability to respond");
  });

  it("keeps incident media private and visibility-scoped", () => {
    expect(barangayFirstMigration).toContain("values ('incident-media', 'incident-media', false)");
    expect(barangayFirstMigration).toContain("public.can_read_nodeguard_incident(a.incident_id)");
  });
});

describe("omnichannel intake and after-hours routing contract", () => {
  it("supports manual reports without IoT evidence and records the full intake channel", () => {
    expect(omnichannelMigration).toContain("alter table public.incidents alter column device_id drop not null");
    expect(omnichannelMigration).toContain("source_type = 'manual_entry' and device_id is null");
    for (const channel of [
      "emergency_hotline", "mobile_call", "sms", "social_media", "email",
      "walk_in", "radio", "field_responder", "partner_office", "iot_node",
    ]) {
      expect(omnichannelMigration).toContain(`'${channel}'`);
    }
    expect(omnichannelMigration).toContain("create_nodeguard_incident_report");
    expect(omnichannelMigration).toContain("'create_incident_report'");
  });

  it("provides direct LT-MDRRMO handling, barangay referral, and central coordination", () => {
    expect(omnichannelMigration).toContain("'referred_to_barangay'");
    expect(omnichannelMigration).toContain("'barangay_validation_requested'");
    expect(omnichannelMigration).toContain("'mdrrmo_direct'");
    expect(omnichannelMigration).toContain("i.managing_organization = 'mdrrmo'");
    expect(omnichannelMigration).toContain("create or replace function public.close_nodeguard_incident");
    expect(omnichannelMigration).toContain("Actions taken, result or outcome, and closure notes are required");
  });

  it("uses configurable staffed hours and an acknowledgement deadline for IoT fallback", () => {
    expect(omnichannelMigration).toContain("create table if not exists public.barangay_operating_hours");
    expect(omnichannelMigration).toContain("acknowledgement_minutes");
    expect(omnichannelMigration).toContain("public.is_barangay_staffed");
    expect(omnichannelMigration).toContain("new.after_hours_alert := not public.is_barangay_staffed");
    expect(omnichannelMigration).toContain("acknowledge_nodeguard_after_hours_alert");
    expect(omnichannelMigration).toContain("LT-MDRRMO claimed after-hours fallback coordination");
  });
});

describe("separate operational status and escalation contract", () => {
  it("preserves the active workflow status during escalation and acknowledgement", () => {
    expect(escalationSeparationMigration).toContain("set escalation_status = 'pending_acknowledgement'");
    expect(escalationSeparationMigration).toContain("set escalation_status = 'coordinating'");
    expect(escalationSeparationMigration).toContain("'operational_status', v_incident.status");
  });

  it("retains same-barangay coordination access after escalation", () => {
    expect(escalationSeparationMigration).toContain("i.managing_organization = 'barangay' or i.escalation_status <> 'not_escalated'");
  });
});
