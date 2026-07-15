import { NextResponse } from "next/server";
import { assignResponderToIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { sendAssignmentSms } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["personnel", "admin", "super_admin"]);
    const body = (await request.json()) as {
      responderId?: string;
      incidentId?: string;
    };

    if (!body.responderId || !body.incidentId) {
      return NextResponse.json(
        { ok: false, reason: "Missing responderId or incidentId." },
        { status: 400 },
      );
    }

    const result = await assignResponderToIncident(
      body.responderId,
      body.incidentId,
      actor.demo ? undefined : actor.id,
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
