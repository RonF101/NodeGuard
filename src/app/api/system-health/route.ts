import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { getSupabaseClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["mdrrmo_admin", "mdrrmo_operations", "admin", "super_admin"]);
    const supabase = getSupabaseClient();
    const [databaseProbe, bucketProbe] = supabase
      ? await Promise.all([
          supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1),
          supabase.storage.listBuckets(),
        ])
      : [{ error: new Error("Not configured") }, { data: [], error: new Error("Not configured") }];
    return NextResponse.json({
      ok: true,
      mode: actor.demo ? "demo" : "live",
      database: isSupabaseConfigured() && !databaseProbe.error,
      serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      smsWebhook: Boolean(process.env.SMS_WEBHOOK_URL),
      voiceStorage: Boolean(bucketProbe.data?.some((bucket) => bucket.id === "voice-contexts")),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, reason: "Health check failed." }, { status: 500 });
  }
}
