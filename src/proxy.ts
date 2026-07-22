import { NextRequest, NextResponse } from "next/server";

const legacyDashboardRoutes = new Set([
  "/dashboard",
  "/alerts",
  "/incidents",
  "/responders",
  "/nodes",
  "/map",
  "/reports",
  "/analytics",
  "/users",
  "/settings",
]);

export function proxy(request: NextRequest) {
  if (legacyDashboardRoutes.has(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "legacy-route");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/alerts", "/incidents", "/responders", "/nodes", "/map", "/reports", "/analytics", "/users", "/settings"],
};
