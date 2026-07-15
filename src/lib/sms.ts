import { getSupabaseClient } from "@/lib/supabaseClient";

export type SmsDeliveryResult = {
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

export async function sendAssignmentSms(
  responderCode: string,
  incidentPublicId: string,
): Promise<SmsDeliveryResult> {
  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  if (!webhookUrl) {
    return { status: "skipped", reason: "SMS webhook is not configured." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { status: "skipped", reason: "Supabase is not configured." };
  const [{ data: responder }, { data: incident }] = await Promise.all([
    supabase
      .from("responders")
      .select("name, contact_number")
      .eq("public_code", responderCode)
      .maybeSingle(),
    supabase
      .from("incidents")
      .select("public_id, category, location_name, priority")
      .eq("public_id", incidentPublicId)
      .maybeSingle(),
  ]);
  if (!responder?.contact_number || !incident) {
    return { status: "skipped", reason: "Responder phone or incident details are unavailable." };
  }
  const phoneDigits = responder.contact_number.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return { status: "skipped", reason: "Responder contact is not an SMS-capable phone number." };
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  if (process.env.SMS_WEBHOOK_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.SMS_WEBHOOK_TOKEN}`);
  }
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: responder.contact_number,
        recipient: responder.name,
        incidentId: incident.public_id,
        message: `[NodeGuard] ${incident.public_id}: ${incident.category} at ${incident.location_name}. Priority: ${incident.priority}. Open the personnel app for details.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { status: "failed", reason: `SMS provider returned HTTP ${response.status}.` };
    }
    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "SMS delivery failed.",
    };
  }
}
