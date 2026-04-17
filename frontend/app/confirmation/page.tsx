"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import svgPaths from "../../imports/8Confirmation/svg-sylya79o1n";
import { clearSession, readSession } from "../../lib/triage-session";
import { formatIssueType, formatResolverTier } from "../../lib/api";

export default function Confirmation() {
  const router = useRouter();
  const [incidentId, setIncidentId] = useState<number | undefined>();
  const [outcome, setOutcome] = useState<string | undefined>();
  const [issueType, setIssueType] = useState<string | undefined>();
  const [fault, setFault] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    setIncidentId(session.triage?.incident_id);
    setOutcome(session.triage?.routing?.resolver_tier);
    setIssueType(session.triage?.diagnosis?.issue_family);
    setFault(session.triage?.diagnosis?.likely_fault);
    setLoaded(true);
  }, []);

  const handleReturnHome = () => {
    clearSession();
    router.push("/");
  };

  const handleStartNew = () => {
    clearSession();
    router.push("/upload");
  };

  const outcomeLabel =
    outcome ? `${formatResolverTier(outcome)} Route Logged` : "Triage Complete";

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-6 py-16">
      <div className="bg-white border border-slate-200 shadow-xl rounded-3xl w-full flex flex-col items-center overflow-hidden mb-6 relative z-10 p-12 md:p-16 text-center">
        <div className="bg-green-400 w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg mb-10 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
          <svg className="w-12 h-12 text-green-950" fill="none" viewBox="0 0 40 40">
            <path d={svgPaths.pf059c0} fill="currentColor" />
          </svg>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight uppercase leading-none whitespace-pre-line">
          {incidentId ? "Report Successfully\nSubmitted" : "Diagnosis\nComplete"}
        </h1>

        <div className="bg-green-50 border border-green-200 text-green-800 font-bold text-sm tracking-wide px-5 py-2.5 rounded-lg shadow-sm mb-4">
          {outcomeLabel}
        </div>

        {incidentId && (
          <div className="bg-slate-100 border border-slate-200 text-slate-800 font-mono text-sm font-bold tracking-[0.1em] px-5 py-2.5 rounded-lg shadow-sm mb-4">
            INCIDENT ID: INC-{incidentId}
          </div>
        )}

        {fault && (
          <p className="text-slate-500 text-sm font-medium mb-3">
            Identified issue: <span className="text-slate-800 font-bold">{fault}</span>
          </p>
        )}

        {issueType && (
          <p className="text-slate-500 text-sm font-medium mb-8">
            Issue family: <span className="text-slate-800 font-bold">{formatIssueType(issueType)}</span>
          </p>
        )}

        <p className="text-slate-600 text-lg max-w-md mx-auto mb-14 leading-relaxed font-medium">
          {outcome === "driver" || outcome === "local_site"
            ? "The case has been routed with a lower resolver tier and is ready for guided follow-up."
            : "The case has been logged for higher-tier review. Preserve the current charger state until follow-up is complete."}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-16">
          <button
            id="confirmation-new-triage-btn"
            onClick={handleStartNew}
            className="bg-gradient-to-r from-green-700 to-green-500 text-white font-bold text-sm uppercase tracking-widest py-5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg w-full sm:w-auto text-center"
          >
            New Triage
          </button>
          <button
            id="confirmation-home-btn"
            onClick={handleReturnHome}
            className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-sm uppercase tracking-widest py-5 px-8 rounded-xl transition-all shadow-sm w-full sm:w-auto text-center"
          >
            Return to Home
          </button>
        </div>

        <div className="flex items-center justify-between w-full border-t border-slate-200 pt-8 opacity-60">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs uppercase tracking-widest">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 9.33333 11.6667">
              <path d={svgPaths.p3acbc280} fill="currentColor" />
            </svg>
            Secure Submission
          </div>
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs uppercase tracking-widest">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 11.6667 11.6667">
              <path d={svgPaths.p29478120} fill="currentColor" />
            </svg>
            Data Logged
          </div>
        </div>
      </div>
    </div>
  );
}
