"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  ApiTriageResponse,
  fetchIncidentById,
  resolveEvidenceUrl,
} from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { DecisionChain } from "../../components/triage/decision-chain";
import { EvidencePanel } from "../../components/triage/evidence-panel";
import { ProofRequiredCard } from "../../components/triage/proof-required-card";
import { ConfidencePill } from "../../components/triage/confidence-pill";
import { buildOrganizerOutputFields } from "../../lib/theme2-result-fields";

export default function ResultAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[70vh]">
          <p className="text-slate-500 font-medium animate-pulse">Loading assessment...</p>
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
                follow_up_answers: incidentDetail.follow_up_answers ?? incidentDetail.triage_payload.incident.follow_up_answers,
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
    if (session.triage) setTriage(session.triage);
    setLoaded(true);
  }, [searchParams]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-slate-500 font-medium animate-pulse">Loading assessment...</p>
      </div>
    );
  }

  if (!triage) {
    return (
      <PageShell maxWidth="3xl">
        <Card className="w-full shadow-sm border-slate-200 p-10 text-center rounded-2xl bg-white">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">No assessment found</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">We couldn't find a recent triage session. Please start a new upload or demo scenario.</p>
          <Button onClick={() => router.push("/upload")} size="lg" className="bg-green-700 hover:bg-green-800 h-14 px-8 rounded-xl text-lg font-bold">
            Start New Triage
          </Button>
        </Card>
      </PageShell>
    );
  }

  const output = triage.competition_output;
  const imageUrl = resolveEvidenceUrl(triage.incident.photo_evidence);
  const nextHref = output.recipient_type === "after_sales_team" ? "/escalation" : "/guidance";
  const organizerFields = buildOrganizerOutputFields(output, triage.perception.extraction);

  const showFallbackWarning = triage.perception.fallback_used;

  return (
    <PageShell maxWidth="5xl">
      <Card className="w-full shadow-sm border-slate-200 mb-8 rounded-2xl overflow-hidden bg-white">
        <div className="bg-white border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
              Triage Complete
            </h1>
            <p className="text-slate-500 font-medium">Review the assessment and proceed to guidance.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="font-bold font-mono tracking-wide">INC-{triage.incident_id}</span>
          </div>
        </div>

        <CardContent className="p-6 md:p-8">
          <div className="mb-8 rounded-2xl border border-green-100 bg-green-50/45 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-green-700">
                  Organizer Required Output
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                  Theme 2 extraction and routing fields
                </h2>
              </div>
              <ConfidencePill score={output.confidence_score} />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {organizerFields.map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-base font-bold leading-6 text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Decision Logic</h2>
              </div>
              <DecisionChain 
                observationResult={output.observation_result}
                faultType={output.fault_type_v2}
                recipientType={output.recipient_type}
                assignedTeamId={output.assigned_team_id}
                actionMessage={output.action_message}
              />

              <div className="mt-4 pt-6 border-t border-slate-100">
                <Button asChild size="lg" className="w-full h-14 rounded-xl font-bold bg-green-700 hover:bg-green-800 text-lg shadow-sm">
                  <a href={nextHref}>
                    {output.recipient_type === "after_sales_team" ? "View After-sales Routing" : "View Customer Guidance"}
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full h-14 rounded-xl font-bold mt-3 text-slate-600 border-slate-200 hover:bg-slate-50">
                  <a href="/upload">Run Triage Again</a>
                </Button>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Evidence</h2>
                <ConfidencePill score={output.confidence_score} />
              </div>

              {showFallbackWarning && (
                <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-800 text-xs uppercase tracking-widest font-extrabold block mb-0.5">
                      Fallback Mode
                    </strong>
                    <p className="text-amber-800 text-sm font-medium">
                      Vision model unavailable; using fallback interpretation.
                    </p>
                  </div>
                </div>
              )}

              <ProofRequiredCard 
                proofNext={output.required_proof_next} 
                prompts={triage.follow_up_prompts} 
              />

              <EvidencePanel
                imageUrl={imageUrl}
                annotations={triage.perception.extraction.bounding_boxes ?? []}
              />
              
              <details className="mt-8">
                <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
                  Advanced Debug Info
                </summary>
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <pre className="whitespace-pre-wrap break-words text-xs text-slate-600 font-mono">
                    {JSON.stringify(
                      {
                        perception_mode: triage.debug.perception_mode,
                        fallback_used: triage.debug.fallback_used,
                        rule_key: triage.debug.rule_key,
                        error_type: triage.perception.error_type,
                        scene_summary: triage.perception.scene_summary,
                        evidence_notes: output.evidence_notes,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
