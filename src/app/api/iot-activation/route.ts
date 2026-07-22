import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireDevicePermission,
  requireRequestActor,
} from "@/lib/auth";
import { simulateNodeActivation } from "@/lib/nodeguardRepository";
import type { EmergencyCategory } from "@/types";

const categories: EmergencyCategory[] = [
  "Medical Emergency",
  "Security/Public Safety",
  "Fire/Disaster Emergency",
];

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, [
      "barangay_admin",
      "barangay_personnel",
      "mdrrmo_admin",
      "mdrrmo_operations",
    ]);
    const body = (await request.json()) as {
      deviceId?: string;
      category?: EmergencyCategory;
      forceAfterHours?: boolean;
    };
    if (!body.deviceId || !body.category || !categories.includes(body.category)) {
      return NextResponse.json(
        { ok: false, reason: "Select a registered node and one of its three emergency-button categories." },
        { status: 400 },
      );
    }
    await requireDevicePermission(actor, body.deviceId);
    const result = await simulateNodeActivation(
      body.deviceId,
      body.category,
      actor.name,
      Boolean(body.forceAfterHours),
    );
    return NextResponse.json(result, { status: result.ok ? 201 : 409 });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 500;
    return NextResponse.json({
      ok: false,
      reason: error instanceof Error ? error.message : "Node activation simulation failed.",
    }, { status });
  }
}
