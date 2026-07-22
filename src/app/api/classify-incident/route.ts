import { NextResponse } from "next/server";
import { classifyIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";
import type { ValidationResult } from "@/types";

const allowedResults: ValidationResult[] = [
  "Validated",
  "Accidental Activation",
  "Duplicate Report",
  "Non-Emergency",
  "Unverified",
  "False or Misleading Report",
  "Fraudulent, Hoax, or Prank Report",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations"]);
    const body = (await request.json()) as {
      incidentId?: string;
      result?: ValidationResult;
      notes?: string;
      method?: string;
      contacted?: string;
      evidence?: string;
    };
    if (!body.incidentId || !body.result || !allowedResults.includes(body.result) || !body.notes?.trim() || !body.method?.trim()) {
      return NextResponse.json({ ok: false, reason: "Incident, classification, verification method, and validation notes are required." }, { status: 400 });
    }
    await requireIncidentPermission(actor, body.incidentId, "validate");
    const result = await classifyIncident(
      body.incidentId,
      body.result,
      body.notes,
      actor.id,
      { method: body.method, contacted: body.contacted, evidence: body.evidence },
      actor.name,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Validation failed." }, { status });
  }
}
