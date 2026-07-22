import { NextResponse } from "next/server";
import { AuthorizationError, isBarangayRole, requireRequestActor } from "@/lib/auth";
import { createIncidentReport } from "@/lib/nodeguardRepository";
import type {
  AlertLevel,
  EmergencyCategory,
  IncidentManagementMode,
  ReportingChannel,
} from "@/types";

const categories: EmergencyCategory[] = [
  "Medical Emergency",
  "Security/Public Safety",
  "Fire/Disaster Emergency",
];
const channels: ReportingChannel[] = [
  "Emergency Hotline",
  "Mobile Call",
  "SMS / Text Message",
  "Social Media Message",
  "Email",
  "Walk-in Report",
  "Radio",
  "Barangay Personnel",
  "LT-MDRRMO Personnel",
  "Field Responder",
  "Partner Office / Organization",
  "Other",
];
const priorities: AlertLevel[] = ["Unassessed", "Critical", "High", "Moderate", "Low"];
const managementModes: IncidentManagementMode[] = [
  "Referred to Barangay",
  "Barangay Validation Requested",
  "LT-MDRRMO Direct",
  "Municipal Coordination",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
    ]);
    const body = (await request.json()) as {
      reportingChannel?: ReportingChannel;
      reportingSource?: string;
      reporterContact?: string;
      reportingOffice?: string;
      category?: EmergencyCategory;
      incidentSubtype?: string;
      description?: string;
      location?: string;
      landmark?: string;
      barangayId?: string;
      reportedAt?: string;
      occurredAt?: string;
      personsAffected?: number;
      affectedPersonsCondition?: string;
      alertLevel?: AlertLevel;
      actionsTaken?: string;
      initialNotes?: string;
      managementMode?: IncidentManagementMode;
    };
    if (
      !body.reportingChannel || !channels.includes(body.reportingChannel)
      || !body.category || !categories.includes(body.category)
      || !body.alertLevel || !priorities.includes(body.alertLevel)
      || !body.reportingSource?.trim() || !body.description?.trim()
      || !body.incidentSubtype?.trim() || !body.location?.trim() || !body.reportedAt
    ) {
      return NextResponse.json({
        ok: false,
        reason: "Reporting channel, source, category, detailed incident type, severity, report time, location, and description are required.",
      }, { status: 400 });
    }
    const barangayOperator = isBarangayRole(actor.effectiveRole);
    if (barangayOperator && !actor.barangayId) {
      throw new AuthorizationError("This account has no assigned barangay.", 403);
    }
    if (!barangayOperator && (!body.managementMode || !managementModes.includes(body.managementMode))) {
      return NextResponse.json({ ok: false, reason: "Select how LT-MDRRMO will handle the report." }, { status: 400 });
    }
    if (
      !barangayOperator
      && ["Referred to Barangay", "Barangay Validation Requested"].includes(body.managementMode ?? "")
      && !body.barangayId
    ) {
      return NextResponse.json({ ok: false, reason: "Select the concerned barangay." }, { status: 400 });
    }

    const result = await createIncidentReport({
      reportingChannel: body.reportingChannel,
      reportingSource: body.reportingSource,
      reporterContact: body.reporterContact,
      reportingOffice: body.reportingOffice,
      category: body.category,
      incidentSubtype: body.incidentSubtype,
      description: body.description,
      location: body.location,
      landmark: body.landmark,
      barangayId: barangayOperator ? actor.barangayId ?? undefined : body.barangayId,
      reportedAt: body.reportedAt,
      occurredAt: body.occurredAt,
      personsAffected: Math.max(0, body.personsAffected ?? 0),
      affectedPersonsCondition: body.affectedPersonsCondition,
      alertLevel: body.alertLevel,
      actionsTaken: body.actionsTaken,
      initialNotes: body.initialNotes,
      managementMode: barangayOperator ? "Barangay Managed" : body.managementMode,
    }, actor.id, actor.name);
    return NextResponse.json(result, { status: result.ok ? 201 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({
      ok: false,
      reason: error instanceof Error ? error.message : "Incident intake failed.",
    }, { status });
  }
}
