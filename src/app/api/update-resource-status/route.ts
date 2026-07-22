import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor, requireResourcePermission } from "@/lib/auth";
import { updateResourceAvailability } from "@/lib/nodeguardRepository";
import type { ResourceStatus } from "@/types";

const allowedStatuses: Array<Exclude<ResourceStatus, "Dispatched">> = [
  "Available",
  "Under Maintenance",
  "Unavailable",
  "Reserved",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "mdrrmo_admin", "admin", "super_admin"]);
    const body = (await request.json()) as {
      resourceId?: string;
      reason?: string;
      status?: ResourceStatus;
    };
    const reason = body.reason?.trim() ?? "";
    const status = allowedStatuses.find((item) => item === body.status);
    if (!body.resourceId || !status || !reason) {
      return NextResponse.json(
        { ok: false, reason: "Resource, availability status, and reason are required." },
        { status: 400 },
      );
    }
    await requireResourcePermission(actor, body.resourceId);

    const result = await updateResourceAvailability(
      body.resourceId,
      status,
      reason,
      actor.id,
      actor.name,
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
      { ok: false, reason: "Invalid resource availability request." },
      { status: 400 },
    );
  }
}
