import { NextResponse } from "next/server";
import { acknowledgeEscalation } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["mdrrmo_admin", "mdrrmo_operations", "admin", "super_admin"]);
    const body = (await request.json()) as { incidentId?: string; notes?: string };
    if (!body.incidentId || !body.notes?.trim()) {
      return NextResponse.json({ ok: false, reason: "Incident and acknowledgement notes are required." }, { status: 400 });
    }
    await requireIncidentPermission(actor, body.incidentId, "coordinate");
    const result = await acknowledgeEscalation(body.incidentId, body.notes, actor.id, actor.name);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Acknowledgement failed." }, { status });
  }
}
