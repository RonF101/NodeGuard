import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { getDemoSnapshot } from "@/lib/nodeguardDemoStore";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, reason: "The demo data service is disabled when Supabase is configured." },
        { status: 404 },
      );
    }
    const actor = await requireRequestActor(request, [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
      "field_responder",
    ]);
    return NextResponse.json({ ok: true, ...getDemoSnapshot(actor) });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({
      ok: false,
      reason: error instanceof Error ? error.message : "Unable to load prototype data.",
    }, { status });
  }
}
