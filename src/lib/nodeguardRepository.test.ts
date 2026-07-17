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
  cancelBackupRequest,
  decideBackupOffer,
  updateIncidentAlertLevel,
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
});
