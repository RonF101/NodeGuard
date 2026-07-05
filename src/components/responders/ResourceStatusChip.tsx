import { StatusChip } from "@/components/StatusChip";
import { ResourceStatus } from "@/types";

export function ResourceStatusChip({ status }: { status: ResourceStatus }) {
  return <StatusChip status={status} />;
}
