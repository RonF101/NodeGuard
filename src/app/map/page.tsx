import { AppShell } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { PageHeader } from "@/components/PageHeader";

export default function IncidentMapPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Fixed Device Network" title="Incident Map" />
      <MapPanel />
    </AppShell>
  );
}
