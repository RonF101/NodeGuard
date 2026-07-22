import { AppShell } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { PageHeader } from "@/components/PageHeader";
export default function MdrrmoMapPage() { return <AppShell><PageHeader eyebrow="Municipality-Wide Monitoring" title="NodeGuard Incident & Node Map" subtitle="Monitor manual incident locations and supporting IoT nodes across participating barangays." /><MapPanel environment="mdrrmo" /></AppShell>; }
