import { NextResponse } from "next/server";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";
import { updateIncidentWorkflowStatus } from "@/lib/nodeguardRepository";
import type { IncidentStatus } from "@/types";

type WorkflowStatus = Extract<
  IncidentStatus,
  "Dispatched" | "Responding" | "On Scene" | "Resolved" | "Closed"
>;

const allowedStatuses: WorkflowStatus[] = [
  "Dispatched",
  "Responding",
  "On Scene",
  "Resolved",
  "Closed",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "personnel",
      "admin",
      "super_admin",
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
      "field_responder",
    ]);
    const body = (await request.json()) as {
      incidentId?: string;
      status?: WorkflowStatus;
    };
    if (!body.incidentId || !body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { ok: false, reason: "Invalid incident status update." },
        { status: 400 },
      );
    }
    await requireIncidentPermission(actor, body.incidentId, "status");

    const result = await updateIncidentWorkflowStatus(
      body.incidentId,
      body.status,
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
      { ok: false, reason: "Unable to update the incident status." },
      { status: 400 },
    );
  }
}
