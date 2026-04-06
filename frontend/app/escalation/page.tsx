"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import svgPaths from "../../imports/7Escalation/svg-qel37b9gj0";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import type { ApiTriageResponse } from "../../lib/api";
import { readSession } from "../../lib/triage-session";

const mapImage = "/demo.png";

function escalationCopy(triage: ApiTriageResponse | null) {
  const tier = triage?.routing.resolver_tier;
  const priority = triage?.routing.priority ?? "moderate";
  const fault = triage?.diagnosis.likely_fault ?? "Escalated charger issue";
  const hazard = (triage?.diagnosis.hazard_flags.length ?? 0) > 0;

  if (tier === "technician") {
    return {
      badge: priority === "critical" ? "Critical Safety Escalation" : "Technician Dispatch",
      badgeVariant: "destructive" as const,
      title: "Technician Support Required",
      description: "This incident requires on-site technical intervention to restore the charger safely.",
      actionHeading: "On-site Response",
      actionBody: triage?.routing.next_action ?? "Dispatch a qualified technician to inspect the charger.",
      alertTitle: hazard ? "Safety Protocol" : "Dispatch Protocol",
      alertBody: triage?.artifact.safety_note ?? "Do not attempt further troubleshooting until the unit has been inspected.",
      eta: "Dispatch in progress",
      footerLink: "/guidance",
      footerLabel: "View Safety Guidance",
      tone: "red" as const,
      fault,
    };
  }

  return {
    badge: priority === "high" ? "High Priority Remote Review" : "Remote Ops Review",
    badgeVariant: "secondary" as const,
    title: "Remote Operations Review Required",
    description: "This incident needs remote review before any on-site action is taken.",
    actionHeading: "Remote Next Action",
    actionBody: triage?.routing.next_action ?? "Run remote diagnostics and review charger status.",
    alertTitle: "Operational Guardrail",
    alertBody: triage?.artifact.safety_note ?? "Do not attempt unsanctioned repair actions while remote review is in progress.",
    eta: "Remote review queued",
    footerLink: "/guidance",
    footerLabel: "View Handling Guidance",
    tone: "slate" as const,
    fault,
  };
}

export default function Escalation() {
  const [triage, setTriage] = useState<ApiTriageResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    setTriage(session.triage ?? null);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading escalation details...</p>
      </div>
    );
  }

  const copy = escalationCopy(triage);
  const hazardFlags = triage?.diagnosis.hazard_flags ?? [];
  const isTechnician = triage?.routing.resolver_tier === "technician";
  const accentClass = copy.tone === "red" ? "text-red-600 bg-red-100 border-red-200" : "text-slate-700 bg-slate-100 border-slate-200";
  const alertClass = copy.tone === "red" ? "border-red-600" : "border-slate-500";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      <Card className="w-full overflow-hidden shadow-xl border-slate-200 mb-6 relative z-10">
        <div className="bg-slate-50 border-b border-slate-200 p-6 px-8 flex justify-between items-center w-full">
          <Badge variant={copy.badgeVariant} className="font-bold text-[10px] uppercase tracking-widest px-3 py-1 shadow-sm">
            {copy.badge}
          </Badge>
          <div className="font-mono text-slate-700 text-sm font-semibold tracking-wider">
            {triage?.incident_id ? `INC-${triage.incident_id}` : "ESCALATED CASE"}
          </div>
        </div>

        <CardHeader className="p-10 md:p-14 pb-0 flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner mb-8 border ${accentClass}`}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 32.85 27">
              <path d={svgPaths.p3e5f5e80} fill="currentColor" />
            </svg>
          </div>

          <CardTitle className="text-3xl font-extrabold mb-4 tracking-tight leading-snug">
            {copy.title}
          </CardTitle>

          <CardDescription className="text-lg max-w-lg mx-auto mb-10 text-slate-600 leading-relaxed">
            {copy.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-14 flex flex-col items-center">
          <div className="w-full flex flex-col gap-4 mb-10">
            <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Likely Fault</h4>
              <p className="text-slate-800 font-medium">{copy.fault}</p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{copy.actionHeading}</h4>
                <p className="text-slate-800 font-medium">{copy.actionBody}</p>
                {triage?.routing.fallback_action ? (
                  <p className="text-slate-500 text-sm mt-3">Fallback: {triage.routing.fallback_action}</p>
                ) : null}
              </Card>

              <Alert variant={isTechnician ? "destructive" : "default"} className={`border-l-4 rounded-xl ${alertClass}`}>
                <svg className={`w-5 h-5 ${isTechnician ? "text-red-600" : "text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <AlertTitle className="text-xs font-bold uppercase tracking-widest mb-2">{copy.alertTitle}</AlertTitle>
                <AlertDescription className="font-bold">
                  {copy.alertBody}
                </AlertDescription>
              </Alert>
            </div>

            {hazardFlags.length > 0 ? (
              <Card className="p-6 border-red-200 shadow-sm bg-red-50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-red-700 mb-2">Hazard Flags</h4>
                <p className="text-red-800 font-medium">{hazardFlags.join(" | ")}</p>
              </Card>
            ) : null}
          </div>

          <div className="w-full border-t border-slate-200 pt-10 flex flex-col items-center">
            <div className="flex items-center gap-3 text-slate-700 font-medium mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 10.5 12.25">
                <path d={svgPaths.p13490000} fill="currentColor" />
              </svg>
              {copy.eta}
            </div>

            <div className="w-full h-48 bg-slate-200 rounded-xl overflow-hidden relative mb-8 shadow-inner border border-slate-300">
              <ImageWithFallback src={mapImage} alt="Escalation context" className="w-full h-full object-cover scale-110 opacity-90 saturate-50 mix-blend-multiply" />
              <div className={`absolute inset-0 pointer-events-none ${isTechnician ? "bg-red-600/10" : "bg-slate-700/10"}`}></div>
            </div>

            <Button asChild size="lg" variant="secondary" className="w-full h-14 text-lg font-bold uppercase tracking-widest shadow-sm rounded-xl">
              <Link href="/confirmation">Return to Asset Overview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="w-full flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${isTechnician ? "bg-red-600" : "bg-slate-600"}`}></div>
          <span className="font-mono text-xs font-semibold text-slate-600">
            {triage?.routing.resolver_tier === "technician" ? "TECHNICIAN LANE ACTIVE" : "REMOTE REVIEW ACTIVE"}
          </span>
        </div>
        <Button variant="link" asChild className="text-slate-600 hover:text-slate-900 px-0 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-800">
          <Link href={copy.footerLink}>{copy.footerLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
