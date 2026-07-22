import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  actorFromAccessToken,
  getDemoActor,
  isBarangayRole,
  isMdrrmoRole,
  roleHome,
  type RequestActor,
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { OperationalRole } from "@/types";

export const nodeGuardSessionCookie = "nodeguard_dashboard_session";
export const nodeGuardDemoRoleCookie = "nodeguard_demo_role";

export async function getPageActor(): Promise<RequestActor | null> {
  const cookieStore = await cookies();
  if (!isSupabaseConfigured()) {
    const demoRole = cookieStore.get(nodeGuardDemoRoleCookie)?.value as OperationalRole | undefined;
    const headers = new Headers();
    if (demoRole) headers.set("x-nodeguard-demo-role", demoRole);
    return getDemoActor(new Request("http://nodeguard.local", { headers }));
  }
  const token = cookieStore.get(nodeGuardSessionCookie)?.value;
  if (!token) return null;
  try {
    return await actorFromAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireDashboardActor(environment: "barangay" | "mdrrmo") {
  const actor = await getPageActor();
  if (!actor) redirect("/?reason=session");
  const allowed = environment === "barangay"
    ? isBarangayRole(actor.effectiveRole)
    : isMdrrmoRole(actor.effectiveRole);
  if (!allowed) redirect(roleHome(actor.effectiveRole));
  return actor;
}

export async function requireDashboardAdministrator(environment: "barangay" | "mdrrmo") {
  const actor = await requireDashboardActor(environment);
  const authorized = environment === "barangay"
    ? actor.effectiveRole === "barangay_admin"
    : actor.effectiveRole === "mdrrmo_admin";
  if (!authorized) redirect(roleHome(actor.effectiveRole));
  return actor;
}
