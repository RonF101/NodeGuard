import { NextResponse } from "next/server";
import { setDeviceBuzzer } from "@/lib/nodeguardRepository";
import { AuthorizationError, requireDevicePermission, requireRequestActor } from "@/lib/auth";

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
      deviceId?: string;
      active?: boolean;
    };

    if (!body.deviceId || typeof body.active !== "boolean") {
      return NextResponse.json(
        { ok: false, reason: "Missing deviceId or active state." },
        { status: 400 },
      );
    }
    await requireDevicePermission(actor, body.deviceId);

    const result = await setDeviceBuzzer(
      body.deviceId,
      body.active,
      "dashboard",
      actor.id,
      actor.name,
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
      { ok: false, reason: "Invalid buzzer command." },
      { status: 400 },
    );
  }
}
