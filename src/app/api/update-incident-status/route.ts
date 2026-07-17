import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { updateIncidentWorkflowStatus } from "@/lib/nodeguardRepository";
import type { IncidentStatus } from "@/types";

type WorkflowStatus = Extract<
  IncidentStatus,
  "Responding" | "On Scene" | "Closed"
>;

const allowedStatuses: WorkflowStatus[] = [
  "Responding",
  "On Scene",
  "Closed",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "personnel",
      "admin",
      "super_admin",
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

    const result = await updateIncidentWorkflowStatus(
      body.incidentId,
      body.status,
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
      { ok: false, reason: "Unable to update the incident status." },
      { status: 400 },
    );
  }
}
