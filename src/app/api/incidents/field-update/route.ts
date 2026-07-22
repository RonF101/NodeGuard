import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireIncidentPermission,
  requireRequestActor,
} from "@/lib/auth";
import { addIncidentFieldUpdate } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
      "field_responder",
    ]);
    const body = (await request.json()) as { incidentId?: string; remarks?: string };
    if (!body.incidentId || !body.remarks?.trim()) {
      return NextResponse.json(
        { ok: false, reason: "Incident and field-update remarks are required." },
        { status: 400 },
      );
    }
    if (body.remarks.trim().length > 1_000) {
      return NextResponse.json(
        { ok: false, reason: "Field updates must be 1,000 characters or fewer." },
        { status: 400 },
      );
    }
    await requireIncidentPermission(actor, body.incidentId, "status");
    const result = await addIncidentFieldUpdate(
      body.incidentId,
      body.remarks.trim(),
      actor.id,
      actor.name,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({
      ok: false,
      reason: error instanceof Error ? error.message : "Unable to submit the field update.",
    }, { status });
  }
}
