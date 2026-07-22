import { NextResponse } from "next/server";
import { escalateIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel"]);
    const body = (await request.json()) as { incidentId?: string; reason?: string };
    if (!body.incidentId || !body.reason?.trim()) {
      return NextResponse.json({ ok: false, reason: "Incident and escalation reason are required." }, { status: 400 });
    }
    await requireIncidentPermission(actor, body.incidentId, "escalate");
    const result = await escalateIncident(body.incidentId, body.reason, actor.id, actor.name);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Escalation failed." }, { status });
  }
}
