import { NextResponse } from "next/server";
import { setDeviceBuzzer } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
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

  const result = await setDeviceBuzzer(body.deviceId, body.active, "dashboard");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
