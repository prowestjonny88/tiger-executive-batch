"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import svgPaths from "../../imports/5ResultAssessment/svg-li50nl9dl4";
import { AnnotatedImage } from "../../components/ui/annotated-image";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  ApiTriageResponse,
  fetchIncidentById,
  formatHazardLevel,
  formatIssueType,
  formatResolverTier,
  resolveEvidenceUrl,
} from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";

type OutcomeInfo = {
  label: string;
  color: "success" | "warning" | "destructive" | "secondary";
  description: string;
  nextHref: string;
  nextLabel: string;
};

function outcomeInfo(triage: ApiTriageResponse): OutcomeInfo {
  if (!triage.routing.escalation_required) {
    return {
      label: "Guidance Ready",
      color: "success",
      description: "The routing engine identified a safe resolver tier and the next proof or action to collect.",
      nextHref: "/guidance",
      nextLabel: "View Guidance",
    };
  }

  return {
    label: "Escalation Required",
    color: triage.diagnosis.hazard_level === "high" ? "destructive" : "warning",
    description: "A higher resolver tier is required before this case can proceed safely.",
    nextHref: "/escalation",
    nextLabel: "View Escalation Details",
  };
}

function confidenceBandClass(band: ApiTriageResponse["diagnosis"]["confidence_band"]) {
  return band === "high"
    ? "bg-green-100 text-green-800 border-green-200"
    : band === "medium"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
}

function formatDiagnosisMethod(method?: string | null) {
  if (!method) return "Unavailable";
  return method
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatFlagLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatGateDecision(value?: string | null) {
  if (!value) return "Unavailable";
  if (value === "contextual_only") return "Contextual Only";
  return formatDiagnosisMethod(value);
}

export default function ResultAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <p className="text-slate-500 text-sm">Loading assessment...</p>
        </div>
      }
    >
      <ResultAssessment />
    </Suspense>
  );
}

function ResultAssessment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [triage, setTriage] = useState<ApiTriageResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const replayId = searchParams.get("replay");

    if (replayId) {
      fetchIncidentById(parseInt(replayId, 10))
        .then((incidentDetail) => {
          if (incidentDetail.triage_payload) {
            const reconstructedTriage: ApiTriageResponse = {
              ...incidentDetail.triage_payload,
              incident_id: incidentDetail.id,
              incident: {
                ...incidentDetail.triage_payload.incident,
                site_id: incidentDetail.site_id,
                charger_id: incidentDetail.charger_id,
                symptom_text: incidentDetail.symptom_text,
                error_code: incidentDetail.error_code,
                photo_hint: incidentDetail.photo_hint,
                demo_scenario_id: incidentDetail.demo_scenario_id,
                photo_evidence: incidentDetail.photo_evidence || undefined,
                follow_up_answers:
                  incidentDetail.follow_up_answers ?? incidentDetail.triage_payload.incident.follow_up_answers,
              },
            };

            setTriage(reconstructedTriage);
            writeSession({
              incidentId: reconstructedTriage.incident_id,
              siteId: reconstructedTriage.incident.site_id,
              chargerId: reconstructedTriage.incident.charger_id,
              symptomText: reconstructedTriage.incident.symptom_text,
              errorCode: reconstructedTriage.incident.error_code,
              photoHint: reconstructedTriage.incident.photo_hint,
              photoEvidence: reconstructedTriage.incident.photo_evidence,
              followUpAnswers: reconstructedTriage.incident.follow_up_answers,
              demoScenarioId: reconstructedTriage.incident.demo_scenario_id,
              triage: reconstructedTriage,
            });
          }
          setLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load replay incident", error);
          setLoaded(true);
        });
      return;
    }

    const session = readSession();
    if (session.triage) {
      setTriage(session.triage);
    }
    setLoaded(true);
  }, [searchParams]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 text-sm">Loading assessment...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
        <Card className="w-full shadow-xl border-slate-200 p-10 text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">No assessment found</h2>
          <p className="text-slate-600 mb-8">Start a new triage from the upload page to see your results.</p>
          <Button onClick={() => router.push("/upload")} size="lg">Start New Triage</Button>
        </Card>
      </div>
    );
  }

  const info = outcomeInfo(triage);
  const isHazard = triage.diagnosis.hazard_flags.length > 0;
  const imageUrl = resolveEvidenceUrl(triage.incident.photo_evidence?.storage_path);
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto px-6 py-16">
      <Card className="w-full overflow-hidden shadow-xl border-slate-200 mb-8 relative z-10 pt-4">
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 opacity-90 z-20 ${
            info.color === "success"
              ? "bg-gradient-to-r from-green-500 to-green-700"
              : info.color === "warning"
                ? "bg-gradient-to-r from-amber-400 to-amber-600"
                : info.color === "destructive"
                  ? "bg-gradient-to-r from-red-500 to-red-700"
                  : "bg-gradient-to-r from-slate-400 to-slate-600"
          }`}
        />

        <CardHeader className="p-10 md:p-14 pb-0 flex flex-col items-center text-center">
          <div className="bg-slate-100 text-slate-600 w-16 h-16 flex items-center justify-center rounded-2xl mb-10 shadow-inner relative">
            <svg className="w-8 h-8 drop-shadow-md" fill="none" viewBox="0 0 27 24">
              <path d={svgPaths.p3b120c80} fill="currentColor" />
            </svg>

            <Badge
              variant={info.color}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 shadow-sm backdrop-blur-md z-10 border flex items-center gap-1.5 whitespace-nowrap"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12.8333 12.25">
                <path d={svgPaths.p3b404880} fill="currentColor" />
              </svg>
              {Math.round(triage.diagnosis.confidence_score * 100)}% confidence
            </Badge>
          </div>

          <CardTitle className="text-3xl font-extrabold mb-3 tracking-tight leading-snug">
            {triage.diagnosis.likely_fault}
          </CardTitle>
          <p className="text-slate-500 text-base mb-2">{formatIssueType(triage.diagnosis.issue_family)}</p>
        </CardHeader>

        <CardContent className="px-10 md:px-14 pb-6 flex flex-col items-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 mb-8 shadow-sm w-full max-w-lg mx-auto text-center flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <p className="text-slate-700 text-lg leading-relaxed font-medium">
                {triage.diagnosis.evidence_summary}
              </p>
            </div>

            {imageUrl ? (
              <div className="w-full lg:w-48 flex-shrink-0">
                <AnnotatedImage
                  src={imageUrl}
                  annotations={
                    isHazard
                      ? [
                          {
                            id: "hazard-1",
                            x: 20,
                            y: 30,
                            width: 60,
                            height: 40,
                            label: "Detected Hazard",
                          },
                        ]
                      : []
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8 text-left">
            <div
              className={`rounded-xl p-5 shadow-sm border-l-4 ${
                info.color === "success"
                  ? "bg-green-50 border-green-500"
                  : info.color === "warning"
                    ? "bg-amber-50 border-amber-500"
                    : info.color === "destructive"
                      ? "bg-red-50 border-red-500"
                      : "bg-slate-50 border-slate-400"
              }`}
            >
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Workflow Outcome
              </h4>
              <p className="font-bold text-slate-900 text-base">{info.label}</p>
              <p className="text-slate-600 text-sm mt-1">{info.description}</p>
            </div>

            <div className={`rounded-xl p-5 shadow-sm border-l-4 ${confidenceBandClass(triage.diagnosis.confidence_band)} border`}>
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Confidence Band
              </h4>
              <p className="font-bold text-slate-900 text-lg capitalize">
                {triage.diagnosis.confidence_band}
              </p>
              <p className="text-slate-600 text-sm mt-1">
                Score: {Math.round(triage.diagnosis.confidence_score * 100)}%
              </p>
            </div>

            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Next Action
              </h4>
              <p className="font-bold text-slate-900 text-base">{triage.routing.recommended_next_step}</p>
            </div>

            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Routing Rationale
              </h4>
              <p className="text-slate-700 text-sm leading-relaxed">{triage.routing.routing_rationale}</p>
            </div>

            {triage.diagnosis.diagnosis_source || triage.diagnosis.branch_name ? (
              <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                  Diagnosis Method
                </h4>
                <p className="font-bold text-slate-900 text-base">
                  {formatDiagnosisMethod(triage.diagnosis.diagnosis_source || triage.diagnosis.branch_name)}
                </p>
                {triage.diagnosis.branch_name && triage.diagnosis.branch_name !== triage.diagnosis.diagnosis_source ? (
                  <p className="text-slate-600 text-sm mt-1">
                    Execution path: {formatDiagnosisMethod(triage.diagnosis.branch_name)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {triage.kb_retrieval ? (
              <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                  KB Retrieval
                </h4>
                <div className="space-y-2">
                  <p className="text-slate-700 text-sm leading-relaxed">
                    Gate: {formatGateDecision(triage.kb_retrieval.gate_decision)} | Provider:{" "}
                    {triage.kb_retrieval.provider_name} ({triage.kb_retrieval.provider_mode})
                  </p>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {triage.kb_retrieval.gate_reason}
                  </p>
                </div>
                {triage.kb_retrieval.primary_candidate ? (
                  <div className="space-y-2">
                    <p className="text-slate-700 text-sm leading-relaxed">
                      Primary candidate: {triage.kb_retrieval.primary_candidate.canonical_file_name} (
                      {Math.round(triage.kb_retrieval.primary_candidate.match_score * 100)}%) | Match:{" "}
                      {triage.kb_retrieval.primary_candidate.match_reason}
                    </p>
                    {triage.kb_retrieval.primary_candidate.visible_abnormalities.length > 0 ? (
                      <p className="text-slate-700 text-sm leading-relaxed">
                        Visible abnormalities:{" "}
                        {triage.kb_retrieval.primary_candidate.visible_abnormalities.map(formatFlagLabel).join(" | ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {triage.kb_retrieval.candidates.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-slate-700 text-sm leading-relaxed">
                      Top candidates:{" "}
                      {triage.kb_retrieval.candidates
                        .map((candidate) => `${candidate.canonical_file_name} (${Math.round(candidate.match_score * 100)}%)`)
                        .join(" | ")}
                    </p>
                    {triage.kb_retrieval.gate_decision !== "accepted" ? (
                      <p className="text-slate-700 text-sm leading-relaxed">
                        Acceptance threshold: {formatPercent(triage.kb_retrieval.rejection_threshold)}
                        {triage.kb_retrieval.weak_threshold ? ` | Weak threshold: ${formatPercent(triage.kb_retrieval.weak_threshold)}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8 text-left">
            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Perception
              </h4>
              <p className="font-bold text-slate-900 text-base">{triage.perception.scene_summary}</p>
              <p className="text-slate-600 text-sm mt-2">
                Mode: {formatDiagnosisMethod(triage.perception.mode)} | Evidence: {formatDiagnosisMethod(triage.perception.evidence_type)}
              </p>
              {triage.perception.components_visible.length > 0 ? (
                <p className="text-slate-700 text-sm mt-2">
                  Components: {triage.perception.components_visible.map(formatFlagLabel).join(" | ")}
                </p>
              ) : null}
              {triage.perception.ocr_findings.length > 0 ? (
                <p className="text-slate-700 text-sm mt-2">
                  OCR: {triage.perception.ocr_findings.join(" | ")}
                </p>
              ) : null}
            </div>

            <div className="bg-slate-50 border-l-4 border-slate-400 rounded-r-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Reasoning
              </h4>
              <p className="text-slate-700 text-sm leading-relaxed">
                {triage.diagnosis.reasoning_notes.length > 0
                  ? triage.diagnosis.reasoning_notes.join(" ")
                  : triage.confidence.rationale}
              </p>
              {triage.perception.uncertainty_notes.length > 0 ? (
                <p className="text-slate-600 text-sm mt-2">
                  Uncertainty: {triage.perception.uncertainty_notes.join(" | ")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Issue Family</h4>
              <p className="font-bold text-slate-900">{formatIssueType(triage.diagnosis.issue_family)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Hazard Level</h4>
              <p className="font-bold text-slate-900">{formatHazardLevel(triage.diagnosis.hazard_level)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Resolver Tier</h4>
              <p className="font-bold text-slate-900">{formatResolverTier(triage.routing.resolver_tier)}</p>
            </div>
          </div>

          {triage.routing.required_proof_next ? (
            <div className="w-full mb-8 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
              <strong className="text-amber-800 text-sm uppercase tracking-widest font-extrabold block mb-1">
                Required Proof Next
              </strong>
              <p className="text-amber-700 font-medium">{triage.routing.required_proof_next}</p>
            </div>
          ) : null}

          {isHazard ? (
            <div className="w-full mb-8 px-5 py-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-4">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <strong className="text-red-800 text-sm uppercase tracking-widest font-extrabold block mb-1">
                  Hazard Flags
                </strong>
                <p className="text-red-700 font-medium">
                  {triage.diagnosis.hazard_flags.map(formatFlagLabel).join(" | ")}
                </p>
              </div>
            </div>
          ) : null}

          {triage.incident_id ? (
            <p className="text-xs text-slate-400 mb-8 font-mono">
              Incident ID: INC-{triage.incident_id} | Site: {triage.incident.site_id}
            </p>
          ) : null}

          <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
            <Button
              id="result-next-steps-btn"
              asChild
              size="lg"
              className="w-full text-lg h-14 rounded-xl font-bold shadow-md"
            >
              <a href={info.nextHref}>{info.nextLabel}</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full h-14 rounded-xl font-bold text-slate-600 flex items-center justify-center gap-3"
            >
              <a href="/upload">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 9.33333 9.33333">
                  <path d={svgPaths.p2db3a360} fill="currentColor" />
                </svg>
                Run Triage Again
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-6 w-full text-slate-500 text-sm font-medium">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 15 15">
            <path d={svgPaths.p15221b80} fill="currentColor" />
          </svg>
          Routing assessment logged
        </div>
        <div className="w-px h-4 bg-slate-300"></div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16.5 12">
            <path d={svgPaths.p32b04540} fill="currentColor" />
          </svg>
          Data Logged Securely
        </div>
      </div>
    </div>
  );
}
