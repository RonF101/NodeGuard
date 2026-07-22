import { AppShell } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { PageHeader } from "@/components/PageHeader";

export default function BarangayMapPage() {
  return <AppShell><PageHeader eyebrow="Barangay Situation Map" title="Incident & IoT Node Map" subtitle="Monitor incident locations and supporting IoT nodes within your jurisdiction." /><MapPanel environment="barangay" /></AppShell>;
}
