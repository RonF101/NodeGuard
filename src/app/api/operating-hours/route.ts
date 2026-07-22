import { NextResponse } from "next/server";
import { AuthorizationError, isBarangayRole, requireRequestActor } from "@/lib/auth";
import {
  fetchBarangayOperatingHours,
  updateBarangayOperatingHours,
} from "@/lib/nodeguardRepository";
import type { BarangayOperatingHours } from "@/types";

export async function GET(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations",
    ]);
    const requested = new URL(request.url).searchParams.get("barangayId") ?? undefined;
    const barangayId = isBarangayRole(actor.effectiveRole) ? actor.barangayId ?? undefined : requested;
    const settings = await fetchBarangayOperatingHours(barangayId);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Settings could not be loaded." }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "mdrrmo_admin"]);
    const body = (await request.json()) as Partial<BarangayOperatingHours>;
    const barangayId = isBarangayRole(actor.effectiveRole) ? actor.barangayId : body.barangayId;
    if (
      !barangayId || !Array.isArray(body.staffedDays) || !body.staffedDays.length
      || !body.opensAt || !body.closesAt
      || !Number.isInteger(body.acknowledgementMinutes)
      || typeof body.isEnabled !== "boolean"
    ) {
      return NextResponse.json({ ok: false, reason: "Complete operating hours and acknowledgement settings are required." }, { status: 400 });
    }
    const result = await updateBarangayOperatingHours({
      barangayId,
      timezone: "Asia/Manila",
      staffedDays: body.staffedDays,
      opensAt: body.opensAt,
      closesAt: body.closesAt,
      acknowledgementMinutes: body.acknowledgementMinutes!,
      isEnabled: body.isEnabled,
    }, actor.id, actor.name);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Settings could not be updated." }, { status });
  }
}
