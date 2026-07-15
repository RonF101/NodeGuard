import { NextResponse } from "next/server";
import { assignResourceToIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["personnel", "admin", "super_admin"]);
    const body = (await request.json()) as {
      resourceId?: string;
      incidentId?: string;
    };
    if (!body.resourceId || !body.incidentId) {
      return NextResponse.json(
        { ok: false, reason: "Missing resourceId or incidentId." },
        { status: 400 },
      );
    }

    const result = await assignResourceToIncident(
      body.resourceId,
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
      { ok: false, reason: "Invalid resource assignment request." },
      { status: 400 },
    );
  }
}
