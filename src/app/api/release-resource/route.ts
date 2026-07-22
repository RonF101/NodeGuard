import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor, requireResourcePermission } from "@/lib/auth";
import { releaseResourceFromIncident } from "@/lib/nodeguardRepository";
import type { ResourceStatus } from "@/types";

const allowedStatuses: Array<Exclude<ResourceStatus, "Dispatched">> = [
  "Available",
  "Under Maintenance",
  "Unavailable",
  "Reserved",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations", "admin", "super_admin"]);
    const body = (await request.json()) as {
      resourceId?: string;
      reason?: string;
      nextStatus?: ResourceStatus;
    };
    const reason = body.reason?.trim() ?? "";
    const nextStatus = allowedStatuses.find(
      (status) => status === (body.nextStatus ?? "Available"),
    );
    if (!body.resourceId || !reason || !nextStatus) {
      return NextResponse.json(
        { ok: false, reason: "Resource, release reason, and post-release status are required." },
        { status: 400 },
      );
    }
    await requireResourcePermission(actor, body.resourceId);

    const result = await releaseResourceFromIncident(
      body.resourceId,
      reason,
      nextStatus,
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
      { ok: false, reason: "Invalid resource release request." },
      { status: 400 },
    );
  }
}
