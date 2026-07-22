import { NextResponse } from "next/server";
import { assignResponderToIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireRequestActor, requireResponderAssignmentPermission } from "@/lib/auth";
import { sendAssignmentSms } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations", "admin", "super_admin"]);
    const body = (await request.json()) as {
      responderId?: string;
      incidentId?: string;
      instructions?: string;
    };

    if (!body.responderId || !body.incidentId) {
      return NextResponse.json(
        { ok: false, reason: "Missing responderId or incidentId." },
        { status: 400 },
      );
    }
    await requireResponderAssignmentPermission(actor, body.responderId, body.incidentId);

    const instructions = body.instructions?.trim() ?? "";
    if (instructions.length > 1000) {
      return NextResponse.json(
        { ok: false, reason: "Dispatch instructions must be 1,000 characters or fewer." },
        { status: 400 },
      );
    }

    const result = await assignResponderToIncident(
      body.responderId,
      body.incidentId,
      actor.id,
      actor.organizationName ?? (actor.organizationType === "Barangay" ? "Barangay Operations" : "LT-MDRRMO"),
      instructions,
      actor.name,
    );
    const sms = result.ok && !actor.demo
      ? await sendAssignmentSms(body.responderId, body.incidentId)
      : { status: "skipped" as const };
    return NextResponse.json({ ...result, sms }, { status: result.ok ? 200 : 409 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, reason: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, reason: "Invalid assignment request." },
      { status: 400 },
    );
  }
}
