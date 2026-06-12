import { PageShell } from "../../../components/layout/page-shell";
import { TicketListSkeleton } from "../../../components/support";

export default function Loading() {
  return (
    <PageShell maxWidth="6xl" density="detail">
      <TicketListSkeleton count={3} />
    </PageShell>
  );
}
