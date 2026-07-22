import SettingsPage from "@/app/settings/page";
import { requireDashboardAdministrator } from "@/lib/serverAuth";

export default async function MdrrmoSettingsPage() {
  await requireDashboardAdministrator("mdrrmo");
  return <SettingsPage />;
}
