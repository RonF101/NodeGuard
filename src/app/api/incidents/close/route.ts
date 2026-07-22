import { NextResponse } from "next/server";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";
import { closeIncidentRecord } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations",
    ]);
    const body = (await request.json()) as {
      incidentId?: string;
      actionsTaken?: string;
      resultOutcome?: string;
      closureNotes?: string;
    };
    if (!body.incidentId || !body.actionsTaken?.trim() || !body.resultOutcome?.trim() || !body.closureNotes?.trim()) {
      return NextResponse.json({ ok: false, reason: "Actions taken, result or outcome, and closure notes are required." }, { status: 400 });
    }
    await requireIncidentPermission(actor, body.incidentId, "close");
    const result = await closeIncidentRecord(body.incidentId, body.actionsTaken, body.resultOutcome, body.closureNotes, actor.id, actor.name);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Incident closure failed." }, { status });
  }
}
