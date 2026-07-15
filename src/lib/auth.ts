import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";

export type DashboardRole = "personnel" | "admin" | "super_admin";

export type RequestActor = {
  id: string;
  name: string;
  role: DashboardRole;
  demo: boolean;
};

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireRequestActor(
  request: Request,
  allowedRoles: DashboardRole[],
): Promise<RequestActor> {
  if (!isSupabaseConfigured()) {
    return {
      id: "demo-operator",
      name: "Demo Operator",
      role: "super_admin",
      demo: true,
    };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    throw new AuthorizationError("A valid dashboard session is required.", 401);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new AuthorizationError("NodeGuard authentication is unavailable.", 401);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw new AuthorizationError("The dashboard session is invalid or expired.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile || profile.is_active === false) {
    throw new AuthorizationError(
      "This account is not linked to a NodeGuard personnel profile.",
      403,
    );
  }

  const role = profile.role as DashboardRole;
  if (!allowedRoles.includes(role)) {
    throw new AuthorizationError(
      "Your NodeGuard role cannot perform this operation.",
      403,
    );
  }

  return {
    id: user.id,
    name: profile.full_name,
    role,
    demo: false,
  };
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const supabase = getSupabaseClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
