import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { barangays as demoBarangays } from "@/data/barangays";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations", "admin", "super_admin",
    ]);
    if (actor.demo) return NextResponse.json({ ok: true, barangays: demoBarangays });
    const supabase = getSupabaseClient();
    const query = supabase!.from("barangays").select("id, code, name, is_participating, emergency_contact").order("name");
    const { data, error } = actor.effectiveRole.startsWith("barangay_") && actor.barangayId ? await query.eq("id", actor.barangayId) : await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, barangays: (data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name, isParticipating: row.is_participating, emergencyContact: row.emergency_contact })) });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Unable to load barangays." }, { status });
  }
}
