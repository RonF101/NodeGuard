import type { ReactNode } from "react";
import { requireDashboardActor } from "@/lib/serverAuth";

export default async function BarangayLayout({ children }: { children: ReactNode }) {
  await requireDashboardActor("barangay");
  return children;
}
