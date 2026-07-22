import { NextResponse } from "next/server";
import {
  AuthorizationError,
  isBarangayRole,
  isMdrrmoRole,
  requireIncidentPermission,
  requireRequestActor,
} from "@/lib/auth";
import { acknowledgeAfterHoursAlert } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations",
    ]);
    const body = (await request.json()) as {
      incidentId?: string;
      action?: "barangay_acknowledge" | "mdrrmo_claim";
      notes?: string;
    };
    if (!body.incidentId || !body.action || !body.notes?.trim()) {
      return NextResponse.json({ ok: false, reason: "Incident, action, and acknowledgement notes are required." }, { status: 400 });
    }
    if (body.action === "barangay_acknowledge" && !isBarangayRole(actor.effectiveRole)) {
      throw new AuthorizationError("A barangay role is required for this acknowledgement.", 403);
    }
    if (body.action === "mdrrmo_claim" && !isMdrrmoRole(actor.effectiveRole)) {
      throw new AuthorizationError("An LT-MDRRMO role is required for fallback coordination.", 403);
    }
    await requireIncidentPermission(actor, body.incidentId, "read");
    const result = await acknowledgeAfterHoursAlert(body.incidentId, body.action, body.notes, actor.id, actor.name);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "After-hours action failed." }, { status });
  }
}
