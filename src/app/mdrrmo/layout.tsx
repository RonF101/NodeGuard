import type { ReactNode } from "react";
import { requireDashboardActor } from "@/lib/serverAuth";

export default async function MdrrmoLayout({ children }: { children: ReactNode }) {
  await requireDashboardActor("mdrrmo");
  return children;
}
