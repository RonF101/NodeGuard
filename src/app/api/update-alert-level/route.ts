import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { updateIncidentAlertLevel } from "@/lib/nodeguardRepository";
import type { AlertLevel } from "@/types";

const allowedAlertLevels: AlertLevel[] = [
  "Unassessed",
  "Critical",
  "High",
  "Moderate",
  "Low",
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
      alertLevel?: AlertLevel;
      reason?: string;
    };
    if (
      !body.incidentId ||
      !body.alertLevel ||
      !allowedAlertLevels.includes(body.alertLevel) ||
      (body.reason?.length ?? 0) > 500
    ) {
      return NextResponse.json(
        { ok: false, reason: "Provide a supported alert level and an optional reason of 500 characters or fewer." },
        { status: 400 },
      );
    }

    const result = await updateIncidentAlertLevel(
      body.incidentId,
      body.alertLevel,
      "dashboard",
      body.reason,
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
      { ok: false, reason: "Unable to update the incident alert level." },
      { status: 400 },
    );
  }
}
