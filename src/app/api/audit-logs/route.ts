import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getDemoAuditLogs } from "@/lib/nodeguardDemoStore";

export async function GET(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["mdrrmo_admin", "super_admin"]);
    if (actor.demo) return NextResponse.json({ ok: true, logs: getDemoAuditLogs() });
    const supabase = getSupabaseClient();
    const { data, error } = await supabase!.from("audit_logs").select("id, action, entity_type, entity_id, details, created_at, profiles(full_name), barangays(name)").order("created_at", { ascending: false }).limit(250);
    if (error) throw error;
    return NextResponse.json({ ok: true, logs: (data ?? []).map((row) => ({
      id: String(row.id), action: row.action, entityType: row.entity_type, entityId: row.entity_id,
      actorName: (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.full_name ?? "System",
      barangayName: (Array.isArray(row.barangays) ? row.barangays[0] : row.barangays)?.name,
      createdAt: row.created_at, details: row.details,
    })) });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Unable to load audit logs." }, { status });
  }
}
