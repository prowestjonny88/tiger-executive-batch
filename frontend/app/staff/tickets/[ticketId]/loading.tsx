import { PageShell } from "../../../../components/layout/page-shell";
import { TicketDetailSkeleton } from "../../../../components/support";

export default function Loading() {
  return (
    <PageShell maxWidth="7xl" density="detail">
      <TicketDetailSkeleton />
    </PageShell>
  );
}
