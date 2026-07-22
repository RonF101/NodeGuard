import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, getSupabaseClient } = vi.hoisted(() => {
  const rpc = vi.fn();
  return {
    rpc,
    getSupabaseClient: vi.fn(() => ({ rpc })),
  };
});

vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseClient,
}));

import {
  assignResourceToIncident,
  cancelBackupRequest,
  decideBackupOffer,
  releaseResourceFromIncident,
  updateResourceAvailability,
  updateIncidentAlertLevel,
  createIncidentReport,
  acknowledgeAfterHoursAlert,
} from "@/lib/nodeguardRepository";

describe("shared NodeGuard write services", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("sends a dispatcher alert-level update to the protected shared RPC", async () => {
    await expect(
      updateIncidentAlertLevel(
        "NG-2026-201",
        "Moderate",
        "dashboard",
        "Situation stabilized",
        "actor-profile-id",
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(rpc).toHaveBeenCalledWith("update_nodeguard_alert_level", {
      p_incident_public_id: "NG-2026-201",
      p_alert_level: "medium",
      p_source: "dashboard",
      p_reason: "Situation stabilized",
      p_actor_id: "actor-profile-id",
    });
  });

  it("uses protected backup decision and cancellation RPCs", async () => {
    await decideBackupOffer("offer-id", "approved", "Confirm unit", "dispatcher-id");
    await cancelBackupRequest("request-id", "Situation stabilized", "dispatcher-id");
    expect(rpc).toHaveBeenNthCalledWith(1, "decide_nodeguard_backup_offer", {
      p_offer_id: "offer-id",
      p_decision: "approved",
      p_note: "Confirm unit",
      p_actor_id: "dispatcher-id",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "cancel_nodeguard_backup_request", {
      p_backup_request_id: "request-id",
      p_reason: "Situation stabilized",
      p_actor_id: "dispatcher-id",
    });
  });

  it("uses protected resource lifecycle RPCs", async () => {
    await assignResourceToIncident("AMB-001", "NG-2026-207", "dispatcher-id");
    await releaseResourceFromIncident(
      "AMB-001",
      "Returned to station and checked",
      "Available",
      "dispatcher-id",
    );
    await updateResourceAvailability(
      "FIRE-002",
      "Under Maintenance",
      "Pump inspection required",
      "dispatcher-id",
    );

    expect(rpc).toHaveBeenNthCalledWith(1, "assign_nodeguard_resource", {
      p_resource_code: "AMB-001",
      p_incident_public_id: "NG-2026-207",
      p_actor_id: "dispatcher-id",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "release_nodeguard_resource", {
      p_resource_code: "AMB-001",
      p_reason: "Returned to station and checked",
      p_next_status: "available",
      p_actor_id: "dispatcher-id",
    });
    expect(rpc).toHaveBeenNthCalledWith(3, "set_nodeguard_resource_status", {
      p_resource_code: "FIRE-002",
      p_status: "under_maintenance",
      p_reason: "Pump inspection required",
      p_actor_id: "dispatcher-id",
    });
  });

  it("creates a structured non-IoT incident through the omnichannel RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { incident_id: "NG-MDR-20260721-001" }, error: null });
    await expect(createIncidentReport({
      reportingChannel: "Emergency Hotline",
      reportingSource: "Caller ending 4821",
      reportingOffice: "LT-MDRRMO Operations Center",
      category: "Medical Emergency",
      incidentSubtype: "Vehicular collision",
      description: "Two injured passengers require assessment.",
      location: "Km. 5 junction",
      landmark: "Public market entrance",
      barangayId: "barangay-id",
      reportedAt: "2026-07-21T10:00:00+08:00",
      personsAffected: 2,
      affectedPersonsCondition: "Conscious, one with leg pain",
      alertLevel: "High",
      managementMode: "LT-MDRRMO Direct",
    }, "dispatcher-id")).resolves.toMatchObject({ ok: true, incidentId: "NG-MDR-20260721-001" });
    expect(rpc).toHaveBeenCalledWith("create_nodeguard_incident_report", expect.objectContaining({
      p_reporting_channel: "emergency_hotline",
      p_management_mode: "mdrrmo_direct",
      p_barangay_id: "barangay-id",
      p_actor_id: "dispatcher-id",
    }));
  });

  it("records barangay acknowledgement and municipal after-hours claims through one audited RPC", async () => {
    await acknowledgeAfterHoursAlert("NG-2026-118", "barangay_acknowledge", "Duty officer responding", "actor-id");
    expect(rpc).toHaveBeenCalledWith("acknowledge_nodeguard_after_hours_alert", {
      p_incident_public_id: "NG-2026-118",
      p_action: "barangay_acknowledge",
      p_notes: "Duty officer responding",
      p_actor_id: "actor-id",
    });
  });
});
