import { IntakeFormCard } from "../../components/intake-form";
import { SiteShell } from "../../components/site-shell";

export default function DemoPage() {
  return (
    <SiteShell activeNav="history">
      <section className="page-stack page-hero">
        <span className="eyebrow">Real in-product demo mode</span>
        <h1>Seeded scenario replay</h1>
        <p className="hero-copy">
          Use the same premium intake flow for rehearsals, judging, and video capture while backend dataset work remains
          deferred.
        </p>
      </section>
      <IntakeFormCard demoMode />
    </SiteShell>
  );
}
