"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  Menu,
  Power,
  Route,
  ShieldCheck,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
} as const;

const sectionReveal = {
  hidden: { opacity: 0, y: 46, scale: 0.985, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
} as const;

const navItems = [
  { label: "How it Works", href: "#workflow" },
  { label: "Evidence Types", href: "#evidence" },
  { label: "Output", href: "#output" },
  { label: "Safety", href: "#safety" },
];

const images = {
  hero: "/landing/hero-ev-charger-wall.jpg",
  charger: "/landing/card-charger-unit.jpg",
  evdb: "/landing/card-evdb.jpg",
  isolator: "/landing/card-isolator.jpg",
  preview: "/landing/preview-evdb-case.jpg",
  proof: "/landing/proof-closeup-photo.jpg",
  noLight: "/landing/case-charger-no-light.jpg",
  isolatorOff: "/landing/case-isolator-off.jpg",
  mockDashboard: "/landing/mock-dashboard-result.png",
};

function PillCta({ href, children, dark = false }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold transition duration-300 ${
        dark
          ? "bg-white text-[var(--rex-charcoal)] hover:bg-white/90"
          : "bg-[var(--rex-green)] text-white shadow-[0_12px_30px_rgba(22,184,86,0.24)] hover:bg-[var(--rex-green-dark)]"
      }`}
    >
      {children}
      <span
        className={`grid size-8 place-items-center rounded-full transition group-hover:translate-x-1 ${
          dark ? "bg-[var(--rex-green)] text-white" : "bg-white/20 text-white"
        }`}
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

function SectionIntro({ kicker, title, copy }: { kicker: string; title: string; copy?: string }) {
  return (
    <motion.div {...fadeUp} className="mx-auto mb-14 max-w-3xl text-center">
      <p className="landing-kicker mb-4">{kicker}</p>
      <h2 className="text-3xl font-bold leading-tight tracking-normal text-[var(--rex-charcoal)] md:text-5xl">{title}</h2>
      {copy ? <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--rex-muted)] md:text-lg">{copy}</p> : null}
    </motion.div>
  );
}

function SectionFrame({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { amount: 0.18, margin: "-12% 0px -12% 0px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      data-inview={inView}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.18, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
      className={`landing-section-frame ${className ?? ""}`}
    >
      {children}
    </motion.section>
  );
}

function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${
        scrolled ? "border-b border-[var(--rex-line)] bg-white/92 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="landing-container flex h-20 items-center justify-between">
        <Link href="/" className={`flex items-center gap-3 font-bold ${scrolled ? "text-[var(--rex-charcoal)]" : "text-white"}`}>
          <span className="grid size-10 place-items-center rounded-full bg-[var(--rex-green)] text-white">
            <Zap className="size-5" />
          </span>
          <span className="text-lg tracking-normal">RExharge Assist</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-semibold transition ${scrolled ? "text-[var(--rex-muted)] hover:text-[var(--rex-charcoal)]" : "text-white/80 hover:text-white"}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <PillCta href="/upload">Go to Dashboard</PillCta>
        </div>

        <button
          className={`grid size-11 place-items-center rounded-full border lg:hidden ${
            scrolled ? "border-[var(--rex-line)] text-[var(--rex-charcoal)]" : "border-white/30 text-white"
          }`}
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle landing navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="mx-4 mb-4 rounded-3xl border border-[var(--rex-line)] bg-white p-5 shadow-xl lg:hidden">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="font-semibold text-[var(--rex-charcoal)]">
                {item.label}
              </a>
            ))}
            <Link href="/upload" className="rounded-full bg-[var(--rex-green)] px-5 py-3 text-center text-sm font-bold text-white">
              Go to Dashboard
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-[var(--rex-dark)]">
      <motion.img
        src={images.hero}
        alt="EV charger mounted on a wall"
        className="absolute inset-0 h-full w-full object-cover opacity-75"
        initial={{ scale: 1 }}
        animate={{ scale: 1.06 }}
        transition={{ duration: 14, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.52)_48%,rgba(0,0,0,0.16)_100%)]" />
      <div className="landing-container relative z-10 grid min-h-[92vh] items-center gap-10 pb-16 pt-28 lg:grid-cols-[0.95fr_0.72fr]">
        <motion.div {...fadeUp} className="max-w-3xl text-white">
          <Badge className="mb-7 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-white/12">
            Theme 2 EV Charger Troubleshooting
          </Badge>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-normal md:text-7xl">
            EV Charger Fault Triage, Made Simple.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/78 md:text-xl">
            Upload a charger, EVDB, or isolator photo. RExharge Assist identifies the observation, maps the fault type, and routes the case to the right next step.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <PillCta href="/upload">Go to Dashboard</PillCta>
            <PillCta href="#workflow" dark>
              See How It Works
            </PillCta>
          </div>
          <div className="mt-14 grid max-w-2xl grid-cols-1 gap-4 border-t border-white/18 pt-8 sm:grid-cols-3">
            {[
              ["4", "required outputs"],
              ["3", "supported evidence types"],
              ["2", "routing destinations"],
            ].map(([number, label]) => (
              <div key={label}>
                <div className="text-4xl font-extrabold text-white">{number}</div>
                <div className="mt-1 text-sm font-medium text-white/68">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="hidden lg:block"
          initial={{ opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        >
          <div className="rounded-[28px] border border-white/18 bg-white/12 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <img
              src={images.mockDashboard}
              alt="Organizer required output preview"
              className="aspect-[7/5] w-full rounded-[20px] object-cover"
            />
          </div>
        </motion.div>
      </div>
      <ScrollDots />
    </section>
  );
}

function ScrollDots() {
  return (
    <div className="fixed right-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
      {["hero", "support", "workflow", "output", "safety"].map((id) => (
        <a key={id} href={`#${id}`} className="size-2.5 rounded-full bg-white/45 ring-1 ring-black/10 transition hover:bg-[var(--rex-green)]" aria-label={`Scroll to ${id}`} />
      ))}
    </div>
  );
}

function ServiceCardsSection() {
  const cards = [
    {
      title: "Charger Unit",
      image: images.charger,
      copy: "Detects red light, blinking red light, no light, and readable charger identity labels.",
    },
    {
      title: "EV Distribution Board",
      image: images.evdb,
      copy: "Checks for missing MCB/RCCB or wrong component and specification evidence.",
    },
    {
      title: "Isolator Switch",
      image: images.isolator,
      copy: "Checks whether the isolator is ON or OFF/open circuit before routing the case.",
    },
  ];

  return (
    <SectionFrame id="support" className="landing-section bg-white">
      <div className="landing-container">
        <SectionIntro
          kicker="No-fuss support"
          title="No-fuss charger support from photo to next action."
          copy="Charger downtime can come from visible charger indicators, EVDB protection issues, or isolator switch state. The landing flow makes those evidence types clear before users enter the dashboard."
        />
        <div className="grid gap-7 md:grid-cols-3">
          {cards.map((card) => (
            <motion.article
              key={card.title}
              {...fadeUp}
              className="group overflow-hidden rounded-[24px] border border-[var(--rex-line)] bg-white shadow-[0_18px_50px_rgba(16,21,19,0.08)] transition duration-300 hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img src={card.image} alt={card.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              </div>
              <div className="p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-[var(--rex-charcoal)]">{card.title}</h3>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--rex-green-soft)] text-[var(--rex-green-dark)] transition group-hover:bg-[var(--rex-green)] group-hover:text-white">
                    <ChevronRight className="size-5" />
                  </span>
                </div>
                <p className="leading-7 text-[var(--rex-muted)]">{card.copy}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function ProblemSection() {
  const rows = [
    "Technicians are used for cases that may be customer-resolvable.",
    "Photos arrive without the exact evidence needed for diagnosis.",
    "After-sales teams need structured routing, not free-text complaints.",
  ];

  return (
    <SectionFrame className="landing-section bg-[var(--rex-bg-soft)]">
      <div className="landing-container grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div {...fadeUp}>
          <p className="landing-kicker mb-4">Field support problem</p>
          <h2 className="text-3xl font-bold leading-tight text-[var(--rex-charcoal)] md:text-5xl">Manual troubleshooting slows down simple fixes.</h2>
          <p className="mt-6 text-lg leading-8 text-[var(--rex-muted)]">
            Many charger cases begin with unclear photos, missing proof, or simple switch and breaker issues. A guided triage layer turns the first report into a cleaner support decision.
          </p>
        </motion.div>
        <motion.div {...fadeUp} className="space-y-4">
          {rows.map((row) => (
            <div key={row} className="flex gap-4 rounded-2xl border border-[var(--rex-line)] bg-white p-5 shadow-sm">
              <span className="mt-2 size-3 shrink-0 rounded-full bg-[var(--rex-green)]" />
              <p className="text-base font-semibold leading-7 text-[var(--rex-charcoal)]">{row}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </SectionFrame>
  );
}

function WorkflowSection() {
  const steps = [
    ["01", "Upload Evidence", "User uploads a charger, EVDB, or isolator image."],
    ["02", "Detect Observation", "The system identifies red light, no light, wrong specs, or isolator OFF."],
    ["03", "Classify Fault", "The observation maps to a Theme 2 fault type."],
    ["04", "Route Case", "Customer cases display next actions; after-sales cases route to a team identifier."],
  ];

  return (
    <SectionFrame id="workflow" className="landing-section bg-white">
      <div className="landing-container">
        <SectionIntro kicker="Workflow" title="Upload -> Observe -> Classify -> Route" />
        <div className="relative grid gap-6 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-[var(--rex-line)] md:block" />
          <div className="absolute left-0 top-12 hidden h-px w-2/3 bg-[var(--rex-green)] md:block" />
          {steps.map(([number, title, copy]) => (
            <motion.div key={number} {...fadeUp} className="group relative rounded-3xl bg-white p-6">
              <div className="mb-8 grid size-24 place-items-center rounded-full border-8 border-white bg-[var(--rex-bg-soft)] text-xl font-extrabold text-[var(--rex-charcoal)] shadow-sm transition group-hover:bg-[var(--rex-green)] group-hover:text-white">
                {number}
              </div>
              <h3 className="text-xl font-bold text-[var(--rex-charcoal)]">{title}</h3>
              <p className="mt-3 leading-7 text-[var(--rex-muted)]">{copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function OutputPreviewSection() {
  const fields = [
    ["Observation Result", "Wrong Component / Specs"],
    ["Input Component", "EVDB"],
    ["Fault Type", "Protection Issue"],
    ["Recipient", "After-sales Team"],
    ["Assigned Team", "AS_TEAM_01"],
  ];

  return (
    <SectionFrame id="output" className="landing-section bg-[var(--rex-bg-soft)]">
      <div className="landing-container grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <motion.div {...fadeUp}>
          <p className="landing-kicker mb-4">Product proof</p>
          <h2 className="text-3xl font-bold leading-tight text-[var(--rex-charcoal)] md:text-5xl">A structured support result, not a guess.</h2>
          <p className="mt-6 text-lg leading-8 text-[var(--rex-muted)]">
            The result view is built around organizer-required fields: observation, charger identity when readable, fault type, recipient, team ID, and action message.
          </p>
        </motion.div>
        <motion.div {...fadeUp} className="grid gap-5 rounded-[28px] bg-white p-4 shadow-[0_24px_70px_rgba(16,21,19,0.12)] md:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[20px] bg-[var(--rex-bg-soft)]">
            <img src={images.preview} alt="EVDB evidence preview" className="h-full min-h-[360px] w-full object-cover" />
          </div>
          <div className="rounded-[20px] border border-[var(--rex-line)] p-6">
            <Badge className="mb-6 rounded-full bg-[var(--rex-green-soft)] px-3 py-1 font-bold text-[var(--rex-green-dark)] hover:bg-[var(--rex-green-soft)]">
              Routed to After-sales
            </Badge>
            <div className="grid gap-4">
              {fields.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--rex-line)] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rex-muted)]">{label}</p>
                  <p className="mt-1 text-lg font-bold text-[var(--rex-charcoal)]">{value}</p>
                </div>
              ))}
              <div className="rounded-2xl bg-[var(--rex-charcoal)] p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">Action Message</p>
                <p className="mt-2 text-sm font-semibold leading-6">Contact after-sales team to repair or replace incorrectly specified breakers.</p>
              </div>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rex-muted)]">Official Theme 2 output fields</p>
          </div>
        </motion.div>
      </div>
    </SectionFrame>
  );
}

function EvidenceTabsSection() {
  return (
    <SectionFrame id="evidence" className="landing-section bg-white">
      <div className="landing-container">
        <SectionIntro
          kicker="Evidence types"
          title="Focused on the three photo categories that matter."
          copy="Each tab explains the observation, likely fault type, and next action without turning the page into a technical manual."
        />
        <Tabs defaultValue="evdb" className="mx-auto max-w-4xl">
          <TabsList className="mx-auto mb-8 grid w-full max-w-xl grid-cols-3 rounded-full bg-[var(--rex-bg-soft)] p-1">
            <TabsTrigger value="evdb" className="rounded-full py-3 data-[state=active]:bg-[var(--rex-green)] data-[state=active]:text-white">
              EVDB
            </TabsTrigger>
            <TabsTrigger value="charger" className="rounded-full py-3 data-[state=active]:bg-[var(--rex-green)] data-[state=active]:text-white">
              Charger
            </TabsTrigger>
            <TabsTrigger value="isolator" className="rounded-full py-3 data-[state=active]:bg-[var(--rex-green)] data-[state=active]:text-white">
              Isolator
            </TabsTrigger>
          </TabsList>
          {[
            ["evdb", "Missing MCB/RCCB or wrong component/specs", "Protection Issue", "Route to after-sales for repair or replacement."],
            ["charger", "Red light, blinking red light, no light, serial label / brand model", "Charger Issue, Supply Issue, Installation Issue, or Manual Error", "Customer checks supply for no light; red-light cases may need after-sales proof."],
            ["isolator", "Isolator OFF / open circuit", "Power Cut", "Advise customer to turn ON isolator and check whether EVDB breaker has tripped."],
          ].map(([value, observation, fault, action]) => (
            <TabsContent key={value} value={value}>
              <motion.div {...fadeUp} className="grid gap-4 rounded-[28px] border border-[var(--rex-line)] bg-[var(--rex-bg-soft)] p-6 md:grid-cols-3">
                {[
                  ["Observation", observation],
                  ["Fault Type", fault],
                  ["Next Action", action],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-2xl bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rex-green-dark)]">{label}</p>
                    <p className="mt-3 font-semibold leading-7 text-[var(--rex-charcoal)]">{text}</p>
                  </div>
                ))}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SectionFrame>
  );
}

function ProofSection() {
  const items = ["EVDB MCB/RCCB label close-up", "Charger serial label close-up", "Isolator ON/OFF position", "App screenshot for charger red light"];

  return (
    <SectionFrame id="safety" className="bg-[var(--rex-charcoal)] py-20 text-white md:py-28">
      <div className="landing-container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div {...fadeUp} className="overflow-hidden rounded-[28px]">
          <img src={images.proof} alt="Phone capturing electrical proof" className="h-full min-h-[360px] w-full object-cover" />
        </motion.div>
        <motion.div {...fadeUp}>
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--rex-green)]">Proof first</p>
          <h2 className="text-3xl font-bold leading-tight md:text-5xl">When evidence is unclear, the system asks for proof.</h2>
          <p className="mt-6 leading-8 text-white/70">
            It should not guess unreadable serial numbers, breaker ratings, RCCB type, or hidden switch states. If the image is unclear, it asks for the exact proof needed before routing confidently.
          </p>
          <div className="mt-8 grid gap-3">
            {items.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3">
                <CheckCircle2 className="size-5 shrink-0 text-[var(--rex-green)]" />
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SectionFrame>
  );
}

function CaseStudiesSection() {
  const cases = [
    ["EVDB wrong specs", images.preview, "Evidence: EVDB photo", "Observation: Wrong Component / Specs", "Route: After-sales Team"],
    ["Charger no light", images.noLight, "Evidence: Charger front panel", "Observation: No Light", "Route: Customer checks EVDB breaker first"],
    ["Isolator OFF", images.isolatorOff, "Evidence: Isolator switch", "Observation: Isolator OFF", "Route: Customer turns ON isolator"],
  ];

  return (
    <SectionFrame className="landing-section bg-white">
      <div className="landing-container">
        <SectionIntro kicker="Scenarios" title="Example triage scenarios" />
        <div className="grid gap-7 md:grid-cols-3">
          {cases.map(([title, image, evidence, observation, route]) => (
            <motion.article key={title} {...fadeUp} className="group overflow-hidden rounded-[24px] border border-[var(--rex-line)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={image} alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-[var(--rex-charcoal)]">{title}</h3>
                <div className="mt-5 space-y-2 text-sm font-semibold text-[var(--rex-muted)]">
                  <p>{evidence}</p>
                  <p>{observation}</p>
                  <p>{route}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--rex-green-dark)]">
                  View flow <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function MvpAlignmentSection() {
  const outputs = ["Observation Result", "Serial + Brand/Model", "Fault Type", "Customer / After-sales Routing"];

  return (
    <SectionFrame className="bg-[var(--rex-bg-soft)] py-16">
      <div className="landing-container">
        <motion.div {...fadeUp} className="grid gap-8 rounded-[28px] bg-white p-8 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="landing-kicker mb-4">Theme 2 MVP</p>
            <h2 className="text-3xl font-bold leading-tight text-[var(--rex-charcoal)]">Built for Theme 2&apos;s required outputs.</h2>
            <p className="mt-4 leading-7 text-[var(--rex-muted)]">Every report becomes a clear troubleshooting decision rather than an unstructured complaint.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {outputs.map((output) => (
              <div key={output} className="flex items-center gap-3 rounded-2xl border border-[var(--rex-line)] p-4">
                <ClipboardCheck className="size-5 shrink-0 text-[var(--rex-green-dark)]" />
                <span className="font-bold text-[var(--rex-charcoal)]">{output}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SectionFrame>
  );
}

function FinalCtaSection() {
  return (
    <SectionFrame className="relative overflow-hidden bg-white py-24 text-center md:py-32">
      <div className="landing-container relative z-10">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl">
          <p className="landing-kicker mb-4">Start report</p>
          <h2 className="text-4xl font-extrabold leading-tight text-[var(--rex-charcoal)] md:text-6xl">Start a guided charger fault report.</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--rex-muted)]">Open the dashboard, upload evidence, and generate a structured support result.</p>
          <div className="mt-9">
            <PillCta href="/upload">Go to Dashboard</PillCta>
          </div>
          <p className="mt-5 text-sm font-semibold text-[var(--rex-muted)]">Demo mode is available for judge walkthroughs.</p>
        </motion.div>
      </div>
    </SectionFrame>
  );
}

function LandingFooter() {
  const groups = [
    ["Product", "Dashboard", "Upload Evidence", "History", "Safety"],
    ["Evidence Types", "Charger", "EVDB", "Isolator"],
    ["Competition", "Theme 2 MVP", "Output Requirements", "Demo Mode"],
    ["Support", "Contact", "Safety Notice"],
  ];

  return (
    <footer className="bg-[var(--rex-charcoal)] py-12 text-white">
      <div className="landing-container grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
        <div>
          <div className="flex items-center gap-3 text-xl font-bold">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--rex-green)]">
              <Zap className="size-5" />
            </span>
            RExharge Assist
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/62">EV charger fault triage prototype for Theme 2. Electrical repair decisions should be verified by qualified personnel where required.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map(([title, ...links]) => (
            <div key={title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/45">{title}</h3>
              <div className="mt-4 space-y-3">
                {links.map((link) => (
                  <p key={link} className="text-sm font-semibold text-white/72">{link}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div id="hero" className="landing-root min-h-screen scroll-smooth">
      <LandingHeader />
      <main className="landing-scroll-stage">
        <HeroSection />
        <ServiceCardsSection />
        <ProblemSection />
        <WorkflowSection />
        <OutputPreviewSection />
        <EvidenceTabsSection />
        <ProofSection />
        <CaseStudiesSection />
        <MvpAlignmentSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
