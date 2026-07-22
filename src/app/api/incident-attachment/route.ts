import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AuthorizationError, requireIncidentPermission, requireRequestActor } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { demoAddAttachment } from "@/lib/nodeguardDemoStore";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "audio/mpeg", "audio/mp4"]);

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["barangay_admin", "barangay_personnel", "mdrrmo_admin", "mdrrmo_operations"]);
    const form = await request.formData();
    const incidentId = String(form.get("incidentId") ?? "");
    const file = form.get("file");
    if (!incidentId || !(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || !allowedTypes.has(file.type)) {
      return NextResponse.json({ ok: false, reason: "Attach a supported image, audio file, or PDF up to 10 MB." }, { status: 400 });
    }
    const incident = await requireIncidentPermission(actor, incidentId, "read");
    if (actor.demo) {
      const result = demoAddAttachment(incidentId, file.name, actor.name);
      return NextResponse.json(result, { status: result.ok ? 201 : 409 });
    }
    if (!incident) throw new AuthorizationError("Incident access could not be verified.", 403);
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Storage is unavailable.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${incident.id}/${randomUUID()}-${safeName}`;
    const upload = await supabase.storage.from("incident-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;
    const { error: metadataError } = await supabase.from("incident_attachments").insert({
      incident_id: incident.id,
      storage_path: storagePath,
      media_type: "report_attachment",
      uploaded_by: actor.id,
    });
    if (metadataError) {
      await supabase.storage.from("incident-media").remove([storagePath]);
      throw metadataError;
    }
    return NextResponse.json({ ok: true, path: storagePath });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "Attachment upload failed." }, { status });
  }
}
