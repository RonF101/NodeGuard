import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Operational Metrics"
        title="Analytics"
        subtitle="Incident trends, node activity, alert validation, and prone-area insights."
      />
      <AnalyticsCharts />
    </AppShell>
  );
}
