"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import svgPaths from "../../imports/6SafeGuidance/svg-onv6w9xh1f";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { formatIssueType, formatResolverTier, type ApiTriageResponse } from "../../lib/api";
import { readSession } from "../../lib/triage-session";

const bgImage = "/demo.png";

export default function SafeGuidance() {
  const router = useRouter();
  const [triage, setTriage] = useState<ApiTriageResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session.triage) {
      setTriage(session.triage);
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading guidance...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">No triage guidance available.</p>
      </div>
    );
  }

  const steps = triage.artifact.steps;
  const safetyNote = triage.artifact.safety_note;
  const title = triage.artifact.title;
  const summary = triage.artifact.summary;
  const incidentId = triage.incident_id;
  const issueTypeLabel = formatIssueType(triage.routing.issue_family);
  const resolverLabel = formatResolverTier(triage.routing.resolver_tier);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto px-6 py-16">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full flex flex-col overflow-hidden mb-8 relative z-10">
        <div className="relative h-48 w-full bg-slate-50 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <ImageWithFallback src={bgImage} alt="Background graphic" className="w-full h-full object-cover scale-150" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md bg-green-400">
              <svg className="w-6 h-6 text-green-950" fill="none" viewBox="0 0 20 25">
                <path d={svgPaths.p2256d300} fill="currentColor" />
              </svg>
            </div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] drop-shadow-sm text-green-800">
              {resolverLabel} Guidance
            </h3>
          </div>
        </div>

        <div className="p-10 md:p-14 flex flex-col items-center">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight text-center">
            {title}
          </h1>

          {summary ? (
            <p className="text-slate-600 text-base mb-8 text-center max-w-lg">{summary}</p>
          ) : null}

          <div className="w-full mb-6 px-5 py-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
            <span className="font-extrabold uppercase tracking-widest text-[10px] block mb-1">Resolver Guidance Ready</span>
            Follow these steps in order. The assigned resolver tier is {resolverLabel.toLowerCase()} for the {issueTypeLabel.toLowerCase()} case family.
          </div>

          <div className="flex flex-col gap-4 w-full mb-10">
            {steps.map((step, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-5 flex items-start gap-5 shadow-sm border border-slate-100">
                <div className="text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm text-sm bg-green-700">
                  {index + 1}
                </div>
                <p className="text-slate-800 font-medium text-lg leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-100 border-l-4 border-slate-400 rounded-r-xl p-8 mb-10 shadow-inner w-full flex items-start gap-5">
            <svg className="w-6 h-6 text-slate-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 22 21">
              <path d={svgPaths.p1458c600} fill="currentColor" />
            </svg>
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Caution</h4>
              <p className="text-slate-700 font-medium leading-relaxed">{safetyNote}</p>
            </div>
          </div>

          {incidentId ? (
            <p className="text-xs text-slate-400 mb-6 font-mono">Incident ID: INC-{incidentId}</p>
          ) : null}

          <div className="flex flex-col items-center gap-6 w-full mt-2">
            <button
              id="guidance-confirm-btn"
              onClick={() => router.push("/confirmation")}
              className="text-white font-bold text-lg py-4 px-10 rounded-xl transition-all shadow-md hover:shadow-lg w-full flex justify-center items-center gap-3 bg-gradient-to-r from-green-700 to-green-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 12 12">
                <path d={svgPaths.p117df680} fill="currentColor" />
              </svg>
              Close Case and Report
            </button>

            {triage.routing.escalation_required ? (
              <a
                href="/escalation"
                className="text-slate-500 hover:text-slate-800 font-bold py-2 px-4 transition-colors flex items-center gap-2 text-sm border-b-2 border-transparent hover:border-slate-300"
              >
                Need higher-tier review?
                <svg className="w-3 h-3" fill="none" viewBox="0 0 9.33333 9.33333">
                  <path d={svgPaths.pce77c00} fill="currentColor" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
