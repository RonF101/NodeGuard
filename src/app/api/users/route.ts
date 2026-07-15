import { NextResponse } from "next/server";
import { AuthorizationError, DashboardRole, requireRequestActor } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { users as demoUsers } from "@/data/users";

const allowedRoles: DashboardRole[] = ["personnel", "admin", "super_admin"];

function roleLabel(role: DashboardRole) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Personnel";
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { ok: false, reason: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { ok: false, reason: error instanceof Error ? error.message : "User management failed." },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["admin", "super_admin"]);
    if (actor.demo) return NextResponse.json({ ok: true, users: demoUsers });

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const [{ data: profiles, error: profileError }, authResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, is_active, updated_at")
        .order("full_name"),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (profileError) throw profileError;
    if (authResult.error) throw authResult.error;

    const authById = new Map(authResult.data.users.map((user) => [user.id, user]));
    const users = (profiles ?? []).map((profile) => {
      const authUser = authById.get(profile.id);
      return {
        id: profile.id,
        name: profile.full_name,
        email: authUser?.email ?? "Email unavailable",
        role: roleLabel(profile.role as DashboardRole),
        status: profile.is_active === false ? "Disabled" : "Active",
        lastActive: authUser?.last_sign_in_at ?? profile.updated_at,
      };
    });
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["admin", "super_admin"]);
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: DashboardRole;
      agencyUnit?: string;
      contactNumber?: string;
    };
    if (
      !body.email?.includes("@") ||
      !body.fullName?.trim() ||
      !body.password ||
      body.password.length < 8 ||
      !body.role ||
      !allowedRoles.includes(body.role) ||
      !body.agencyUnit?.trim()
    ) {
      return NextResponse.json(
        { ok: false, reason: "Provide a valid email, name, role, agency, and password of at least 8 characters." },
        { status: 400 },
      );
    }
    if (body.role === "super_admin" && actor.role !== "super_admin") {
      throw new AuthorizationError("Only a super administrator can create another super administrator.", 403);
    }
    if (actor.demo) {
      return NextResponse.json({
        ok: true,
        user: {
          id: `DEMO-${Date.now()}`,
          name: body.fullName.trim(),
          email: body.email.trim(),
          role: roleLabel(body.role),
          status: "Active",
          lastActive: "Never",
        },
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName.trim() },
    });
    if (createError || !data.user) throw createError ?? new Error("Account creation failed.");

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: body.fullName.trim(),
      role: body.role,
      agency_unit: body.agencyUnit.trim(),
      contact_number: body.contactNumber?.trim() || null,
      is_active: true,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }
    await supabase.from("audit_logs").insert({
      actor_profile_id: actor.id,
      action: "create_user",
      entity_type: "profile",
      entity_id: data.user.id,
      details: { role: body.role, email: body.email.trim() },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        name: body.fullName.trim(),
        email: body.email.trim(),
        role: roleLabel(body.role),
        status: "Active",
        lastActive: "Never",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireRequestActor(request, ["admin", "super_admin"]);
    const body = (await request.json()) as {
      id?: string;
      role?: DashboardRole;
      isActive?: boolean;
    };
    if (!body.id || (!body.role && typeof body.isActive !== "boolean")) {
      return NextResponse.json({ ok: false, reason: "Missing user update fields." }, { status: 400 });
    }
    if (body.id === actor.id && body.isActive === false) {
      return NextResponse.json({ ok: false, reason: "You cannot disable your own active session." }, { status: 409 });
    }
    if (body.role && !allowedRoles.includes(body.role)) {
      return NextResponse.json({ ok: false, reason: "Invalid NodeGuard role." }, { status: 400 });
    }
    if (body.role === "super_admin" && actor.role !== "super_admin") {
      throw new AuthorizationError("Only a super administrator can grant the super administrator role.", 403);
    }
    if (actor.demo) return NextResponse.json({ ok: true });

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const profileUpdate: { role?: DashboardRole; is_active?: boolean } = {};
    if (body.role) profileUpdate.role = body.role;
    if (typeof body.isActive === "boolean") profileUpdate.is_active = body.isActive;
    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", body.id);
    if (profileError) throw profileError;

    if (typeof body.isActive === "boolean") {
      const { error: authError } = await supabase.auth.admin.updateUserById(body.id, {
        ban_duration: body.isActive ? "none" : "876000h",
      });
      if (authError) throw authError;
    }
    await supabase.from("audit_logs").insert({
      actor_profile_id: actor.id,
      action: "update_user",
      entity_type: "profile",
      entity_id: body.id,
      details: profileUpdate,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
