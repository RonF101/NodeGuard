import { NextResponse } from "next/server";
import { AuthorizationError, requireBackupOfferPermission, requireRequestActor } from "@/lib/auth";
import { decideBackupOffer } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
      "admin",
      "super_admin",
    ]);
    const body = (await request.json()) as {
      offerId?: string;
      decision?: "approved" | "declined";
      note?: string;
    };
    if (
      !body.offerId ||
      !body.decision ||
      !["approved", "declined"].includes(body.decision) ||
      (body.note?.length ?? 0) > 500
    ) {
      return NextResponse.json(
        { ok: false, reason: "Provide a valid backup offer decision." },
        { status: 400 },
      );
    }
    await requireBackupOfferPermission(actor, body.offerId);
    const result = await decideBackupOffer(
      body.offerId,
      body.decision,
      body.note,
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
      { ok: false, reason: "Unable to decide the backup offer." },
      { status: 400 },
    );
  }
}
