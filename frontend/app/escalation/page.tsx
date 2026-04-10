"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import svgPaths from "../../imports/7Escalation/svg-qel37b9gj0";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { formatIssueType, type ApiTriageResponse } from "../../lib/api";
import { readSession } from "../../lib/triage-session";

const mapImage = "/demo.png";

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

  if (!triage) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">No escalation record available.</p>
      </div>
    );
  }

  const hazardFlags = triage.diagnosis.hazard_flags ?? [];
  const isHazard = hazardFlags.length > 0;
  const issueTypeLabel = formatIssueType(triage.workflow.issue_type);
  const accentClass = isHazard ? "text-red-600 bg-red-100 border-red-200" : "text-amber-700 bg-amber-100 border-amber-200";
  const alertClass = isHazard ? "border-red-600" : "border-amber-500";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      <Card className="w-full overflow-hidden shadow-xl border-slate-200 mb-6 relative z-10">
        <div className="bg-slate-50 border-b border-slate-200 p-6 px-8 flex justify-between items-center w-full">
          <Badge variant={isHazard ? "destructive" : "warning"} className="font-bold text-[10px] uppercase tracking-widest px-3 py-1 shadow-sm">
            {isHazard ? "Hazard Escalation" : "Organizer Escalation"}
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
            Escalation Required
          </CardTitle>

          <CardDescription className="text-lg max-w-lg mx-auto mb-10 text-slate-600 leading-relaxed">
            The {issueTypeLabel.toLowerCase()} branch cannot be closed safely. Continue with escalation and preserve the charger state for follow-up.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-14 flex flex-col items-center">
          <div className="w-full flex flex-col gap-4 mb-10">
            <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Likely Fault</h4>
              <p className="text-slate-800 font-medium">{triage.diagnosis.likely_fault}</p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Escalation Action</h4>
                <p className="text-slate-800 font-medium">{triage.workflow.next_action}</p>
                {triage.workflow.fallback_action ? (
                  <p className="text-slate-500 text-sm mt-3">Fallback: {triage.workflow.fallback_action}</p>
                ) : null}
              </Card>

              <Alert variant={isHazard ? "destructive" : "default"} className={`border-l-4 rounded-xl ${alertClass}`}>
                <svg className={`w-5 h-5 ${isHazard ? "text-red-600" : "text-amber-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <AlertTitle className="text-xs font-bold uppercase tracking-widest mb-2">
                  {isHazard ? "Safety Protocol" : "Escalation Guardrail"}
                </AlertTitle>
                <AlertDescription className="font-bold">
                  {triage.artifact.safety_note}
                </AlertDescription>
              </Alert>
            </div>

            <Card className="p-6 border-slate-200 shadow-sm bg-slate-50">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Workflow Rationale</h4>
              <p className="text-slate-800 font-medium">{triage.workflow.rationale}</p>
            </Card>

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
              Escalation lane active
            </div>

            <div className="w-full h-48 bg-slate-200 rounded-xl overflow-hidden relative mb-8 shadow-inner border border-slate-300">
              <ImageWithFallback src={mapImage} alt="Escalation context" className="w-full h-full object-cover scale-110 opacity-90 saturate-50 mix-blend-multiply" />
              <div className={`absolute inset-0 pointer-events-none ${isHazard ? "bg-red-600/10" : "bg-amber-500/10"}`}></div>
            </div>

            <Button asChild size="lg" variant="secondary" className="w-full h-14 text-lg font-bold uppercase tracking-widest shadow-sm rounded-xl">
              <Link href="/confirmation">Return to Asset Overview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="w-full flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-sm ${isHazard ? "bg-red-600" : "bg-amber-500"}`}></div>
          <span className="font-mono text-xs font-semibold text-slate-600">
            {isHazard ? "SAFETY ESCALATION ACTIVE" : "ORGANIZER ESCALATION ACTIVE"}
          </span>
        </div>
        <Button variant="link" asChild className="text-slate-600 hover:text-slate-900 px-0 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-800">
          <Link href="/guidance">View Branch SOP</Link>
        </Button>
      </div>
    </div>
  );
}
