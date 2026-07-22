import { NextResponse } from "next/server";
import { AuthorizationError, requireBackupRequestPermission, requireRequestActor } from "@/lib/auth";
import { cancelBackupRequest } from "@/lib/nodeguardRepository";

export async function DELETE(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
      "admin",
      "super_admin",
    ]);
    const body = (await request.json()) as { requestId?: string; reason?: string };
    if (!body.requestId || !body.reason?.trim() || body.reason.length > 500) {
      return NextResponse.json(
        { ok: false, reason: "A backup request and cancellation reason are required." },
        { status: 400 },
      );
    }
    await requireBackupRequestPermission(actor, body.requestId);
    const result = await cancelBackupRequest(
      body.requestId,
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
      { ok: false, reason: "Unable to cancel the backup request." },
      { status: 400 },
    );
  }
}
