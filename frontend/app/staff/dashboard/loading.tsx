import { PageShell } from "../../../components/layout/page-shell";
import { TicketListSkeleton } from "../../../components/support";

export default function Loading() {
  return (
    <PageShell maxWidth="7xl" density="dashboard">
      <TicketListSkeleton count={4} />
    </PageShell>
  );
}
