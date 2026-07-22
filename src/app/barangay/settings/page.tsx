import { AppShell } from "@/components/AppShell";
import { OperatingHoursPanel } from "@/components/OperatingHoursPanel";
import { PageHeader } from "@/components/PageHeader";
import { requireDashboardAdministrator } from "@/lib/serverAuth";

export default async function BarangaySettingsPage() {
  await requireDashboardAdministrator("barangay");
  return <AppShell><PageHeader eyebrow="Barangay Operational Configuration" title="Settings" subtitle="Configure staffed hours and the acknowledgement period used for after-hours IoT fallback routing." /><OperatingHoursPanel environment="barangay" /></AppShell>;
}
