import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { removeResponderFromIncident } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "personnel",
      "admin",
      "super_admin",
    ]);
    const body = (await request.json()) as { incidentId?: string };
    if (!body.incidentId) {
      return NextResponse.json(
        { ok: false, reason: "Missing incidentId." },
        { status: 400 },
      );
    }

    const result = await removeResponderFromIncident(
      body.incidentId,
      actor.demo ? undefined : actor.id,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, reason: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, reason: "Unable to remove the response-team assignment." },
      { status: 400 },
    );
  }
}
