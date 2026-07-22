import { AuditLogView } from "@/components/MonitoringViews";
import { requireDashboardAdministrator } from "@/lib/serverAuth";

export default async function AuditLogsPage() {
  await requireDashboardAdministrator("mdrrmo");
  return <AuditLogView />;
}
