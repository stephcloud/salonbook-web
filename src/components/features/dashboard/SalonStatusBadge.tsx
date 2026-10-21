import { Badge } from "@/components/ui/badge";
import type { SalonStatus } from "@/lib/api";
import { SALON_STATUS } from "@/lib/salon-status";

/** The salon's moderation status: waiting amber, approved green, suspended grey. */
export function SalonStatusBadge({ status }: { status: SalonStatus }) {
  const { label, variant } = SALON_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
