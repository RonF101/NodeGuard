import { NextResponse } from "next/server";
import { createBarangayIncidentReport, escalateIncident } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { EmergencyCategory } from "@/types";

const categories: EmergencyCategory[] = ["Medical Emergency", "Security/Public Safety", "Fire/Disaster Emergency"];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel"]);
    if (!actor.barangayId) throw new AuthorizationError("This account has no assigned barangay.", 403);
    const body = (await request.json()) as {
      category?: EmergencyCategory;
      occurredAt?: string;
      location?: string;
      approximateAddress?: string;
      coordinates?: string;
      description?: string;
      personsAffected?: number;
      reportingSource?: string;
      actionsTaken?: string;
      assignedResponder?: string;
      status?: "Validated" | "Dispatched" | "Responding" | "Resolved";
      escalationInformation?: string;
    };
    if (!body.category || !categories.includes(body.category) || !body.occurredAt || !body.location?.trim() || !body.description?.trim() || !body.reportingSource?.trim()) {
      return NextResponse.json({ ok: false, reason: "Category, date/time, location, description, and reporting source are required." }, { status: 400 });
    }
    const result = await createBarangayIncidentReport({
      barangayId: actor.barangayId,
      category: body.category,
      occurredAt: body.occurredAt,
      location: body.location,
      approximateAddress: body.approximateAddress || body.location,
      coordinates: body.coordinates,
      description: body.description,
      personsAffected: body.personsAffected ?? 0,
      reportingSource: body.reportingSource,
      actionsTaken: body.actionsTaken ?? "",
    }, actor.id);
    if (result.ok && result.incidentId && !actor.demo) {
      const supabase = getSupabaseClient();
      const statusMap = { Validated: "validated", Dispatched: "dispatched", Responding: "responding", Resolved: "resolved" } as const;
      const initialStatus = body.status && statusMap[body.status] ? statusMap[body.status] : "validated";
      await supabase?.from("incidents").update({
        status: initialStatus,
        assigned_responder_name: body.assignedResponder?.trim() || null,
        assignment_source: body.assignedResponder?.trim() ? "barangay" : null,
        assignment_instructions: body.actionsTaken?.trim() || null,
        updated_by: actor.id,
      }).eq("public_id", result.incidentId);
      if (body.escalationInformation?.trim()) {
        const escalation = await escalateIncident(result.incidentId, body.escalationInformation, actor.id);
        if (!escalation.ok) return NextResponse.json({ ...result, warning: escalation.reason }, { status: 201 });
      }
    }
    return NextResponse.json(result, { status: result.ok ? 201 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Report submission failed." }, { status });
  }
}
