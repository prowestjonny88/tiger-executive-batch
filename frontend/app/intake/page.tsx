import { IntakeFormCard } from "../../components/intake-form";
import { SiteShell } from "../../components/site-shell";

export default function IntakePage() {
  return (
    <SiteShell activeNav="report">
      <section className="page-stack page-hero">
        <span className="eyebrow">Live triage shell</span>
        <h1>Evidence capture &amp; guided intake</h1>
        <p className="hero-copy">
          The frontend now mirrors the prototype's technical-manual tone while keeping the existing preview and triage
          APIs unchanged.
        </p>
      </section>
      <IntakeFormCard />
    </SiteShell>
  );
}
