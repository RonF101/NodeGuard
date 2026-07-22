import { NextResponse } from "next/server";
import { validateIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";
import { ValidationStatus } from "@/types";

const allowedStatuses: ValidationStatus[] = [
  "Pending Review",
  "Confirmed",
  "False Alarm",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel"]);
    const body = (await request.json()) as {
      incidentId?: string;
      validationStatus?: ValidationStatus;
    };
    if (
      !body.incidentId ||
      !body.validationStatus ||
      !allowedStatuses.includes(body.validationStatus)
    ) {
      return NextResponse.json(
        { ok: false, reason: "Invalid incident validation request." },
        { status: 400 },
      );
    }
    await requireIncidentPermission(actor, body.incidentId, "validate");

    const result = await validateIncident(
      body.incidentId,
      body.validationStatus,
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
      { ok: false, reason: "Invalid incident validation request." },
      { status: 400 },
    );
  }
}
