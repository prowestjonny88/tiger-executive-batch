import { PageShell } from "../../../components/layout/page-shell";
import { PageLoading } from "../../../components/support";

export default function Loading() {
  return (
    <PageShell maxWidth="4xl">
      <PageLoading label="Loading ChargerDoc support ticket flow..." />
    </PageShell>
  );
}
