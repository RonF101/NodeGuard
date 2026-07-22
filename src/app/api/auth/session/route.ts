import { NextResponse } from "next/server";
import {
  actorFromAccessToken,
  getDemoActor,
  roleHome,
  type AuthorizationError,
} from "@/lib/auth";
import {
  nodeGuardDemoRoleCookie,
  nodeGuardSessionCookie,
} from "@/lib/serverAuth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { OperationalRole } from "@/types";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { accessToken?: string; demoRole?: OperationalRole };
    if (!isSupabaseConfigured()) {
      const headers = new Headers();
      if (body.demoRole) headers.set("x-nodeguard-demo-role", body.demoRole);
      const actor = getDemoActor(new Request(request.url, { headers }));
      const response = NextResponse.json({ ok: true, actor, home: roleHome(actor.effectiveRole) });
      response.cookies.set(nodeGuardDemoRoleCookie, actor.effectiveRole, cookieOptions);
      return response;
    }
    if (!body.accessToken) {
      return NextResponse.json({ ok: false, reason: "A valid sign-in token is required." }, { status: 401 });
    }
    const actor = await actorFromAccessToken(body.accessToken);
    const response = NextResponse.json({ ok: true, actor, home: roleHome(actor.effectiveRole) });
    response.cookies.set(nodeGuardSessionCookie, body.accessToken, cookieOptions);
    return response;
  } catch (error) {
    const authorization = error as AuthorizationError;
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "Unable to establish the dashboard session." },
      { status: authorization.status ?? 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(nodeGuardSessionCookie, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(nodeGuardDemoRoleCookie, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
