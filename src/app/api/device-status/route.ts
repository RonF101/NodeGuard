import { NextResponse } from "next/server";
import { AuthorizationError, requireRequestActor } from "@/lib/auth";
import { updateDeviceStatus } from "@/lib/nodeguardRepository";

const statuses = ["online", "maintenance", "offline"] as const;

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["admin", "super_admin"]);
    const body = (await request.json()) as {
      deviceId?: string;
      status?: (typeof statuses)[number];
    };
    if (!body.deviceId || !body.status || !statuses.includes(body.status)) {
      return NextResponse.json({ ok: false, reason: "Invalid device status update." }, { status: 400 });
    }
    const result = await updateDeviceStatus(
      body.deviceId,
      body.status,
      actor.demo ? undefined : actor.id,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, reason: "Invalid device status update." }, { status: 400 });
  }
}
