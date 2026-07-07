import { NextResponse } from "next/server";
import { assignResponderToIncident } from "@/lib/nodeguardRepository";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    responderId?: string;
    incidentId?: string;
  };

  if (!body.responderId || !body.incidentId) {
    return NextResponse.json({ ok: false, reason: "Missing responderId or incidentId." }, { status: 400 });
  }

  const result = await assignResponderToIncident(body.responderId, body.incidentId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
