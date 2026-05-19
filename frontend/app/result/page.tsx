"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  ApiTriageResponse,
  fetchIncidentById,
  fetchTriage,
  resolveEvidenceUrl,
  uploadIncidentPhoto,
} from "../../lib/api";
import { readSession, writeSession } from "../../lib/triage-session";
import { PageShell } from "../../components/layout/page-shell";
import { DecisionChain } from "../../components/triage/decision-chain";
import { EvidencePanel } from "../../components/triage/evidence-panel";
import { ProofRequiredCard } from "../../components/triage/proof-required-card";
import { ResultVerdictCard } from "../../components/triage/result-verdict-card";
import { UploadDropzone } from "../../components/triage/upload-dropzone";
import {
  buildComponentEvidenceFields,
  buildCoreOrganizerOutputFields,
  type OrganizerOutputField,
} from "../../lib/theme2-result-fields";
import { deriveResultState } from "../../lib/theme2-result-state";
import { FieldCard } from "../../components/triage/field-card";
import { RouteBadge } from "../../components/triage/route-badge";

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
  const [appScreenshotFile, setAppScreenshotFile] = useState<File | null>(null);
  const [appScreenshotStatus, setAppScreenshotStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [appScreenshotError, setAppScreenshotError] = useState("");

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
                app_screenshot_evidence:
                  incidentDetail.app_screenshot_evidence || incidentDetail.triage_payload.incident.app_screenshot_evidence,
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
                appScreenshotEvidence: reconstructedTriage.incident.app_screenshot_evidence,
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
  const resultState = deriveResultState(triage);
  const coreFields = buildCoreOrganizerOutputFields(output, triage.perception.extraction);
  const componentEvidenceFields = buildComponentEvidenceFields(output, triage.perception.extraction);
  const appScreenshotPrompt = triage.follow_up_prompts.find((prompt) => prompt.question_id === "charger_app_screenshot");
  const hasAppScreenshot = Boolean(triage.incident.app_screenshot_evidence);

  const showFallbackWarning = triage.perception.fallback_used;

  const handleAppScreenshotSubmit = async () => {
    if (!appScreenshotFile || appScreenshotStatus === "uploading") return;
    setAppScreenshotStatus("uploading");
    setAppScreenshotError("");

    try {
      const uploaded = await uploadIncidentPhoto(appScreenshotFile);
      const followUpAnswers = {
        ...(triage.incident.follow_up_answers ?? {}),
        charger_app_screenshot: `[Uploaded app screenshot: ${uploaded.filename}]`,
      };
      const nextTriage = await fetchTriage({
        incident_id: triage.incident_id,
        site_id: triage.incident.site_id,
        charger_id: triage.incident.charger_id,
        photo_evidence: triage.incident.photo_evidence,
        app_screenshot_evidence: uploaded,
        photo_hint: triage.incident.photo_hint ?? "",
        symptom_text: triage.incident.symptom_text ?? "",
        error_code: triage.incident.error_code ?? "",
        follow_up_answers: followUpAnswers,
        demo_scenario_id: triage.incident.demo_scenario_id,
      });

      setTriage(nextTriage);
      setAppScreenshotFile(null);
      setAppScreenshotStatus("idle");
      writeSession({
        incidentId: nextTriage.incident_id,
        appScreenshotEvidence: uploaded,
        followUpAnswers,
        triage: nextTriage,
      });
    } catch (error) {
      setAppScreenshotStatus("error");
      setAppScreenshotError(error instanceof Error ? error.message : "App screenshot upload failed. Please try again.");
    }
  };

  return (
    <PageShell maxWidth="5xl">
      <Card className="w-full shadow-sm border-slate-200 mb-8 rounded-2xl overflow-hidden bg-white">
        <div className="bg-white border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
              Triage Complete
            </h1>
            <p className="text-slate-500 font-medium">Evidence-based Theme 2 troubleshooting result.</p>
          </div>
        </div>

        <CardContent className="space-y-8 p-6 md:p-8">
          <ResultVerdictCard triage={triage} />

          <section className="rounded-2xl border border-green-100 bg-green-50/45 p-5 md:p-6">
            <div className="mb-5">
              <p className="text-xs font-extrabold uppercase tracking-widest text-green-700">
                Result Summary
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900">What RExharge found</h2>
                <span className="rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-bold text-green-800">
                  Theme 2 required output
                </span>
                <RouteBadge recipientType={output.recipient_type} />
              </div>
            </div>
            <FieldGrid fields={coreFields} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Component Evidence
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                Evidence details for the detected component
              </h2>
            </div>
            <FieldGrid fields={componentEvidenceFields} />
          </section>

          <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col">
              <div className="mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Evidence and Proof</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Uploaded evidence remains visible; proof prompts appear only when the system needs clarification.
                </p>
              </div>

              {showFallbackWarning && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <strong className="mb-0.5 block text-xs font-extrabold uppercase tracking-widest text-amber-800">
                      Fallback Mode
                    </strong>
                    <p className="text-sm font-medium text-amber-800">
                      Vision model unavailable; using fallback interpretation.
                    </p>
                  </div>
                </div>
              )}

              <ProofRequiredCard
                proofNext={output.required_proof_next}
                prompts={triage.follow_up_prompts}
                resultProofState={resultState.proofState}
              />

              {(appScreenshotPrompt || hasAppScreenshot) && (
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                      EV App Screenshot
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {hasAppScreenshot
                        ? "EV app screenshot included in this triage result."
                        : appScreenshotPrompt?.prompt}
                    </p>
                  </div>

                  {!hasAppScreenshot && (
                    <div className="space-y-4">
                      <UploadDropzone
                        onFileSelect={(file) => {
                          setAppScreenshotFile(file);
                          setAppScreenshotError("");
                        }}
                        fileName={appScreenshotFile?.name}
                      />
                      {appScreenshotError && (
                        <p className="text-sm font-medium text-red-700">{appScreenshotError}</p>
                      )}
                      <Button
                        type="button"
                        onClick={handleAppScreenshotSubmit}
                        disabled={!appScreenshotFile || appScreenshotStatus === "uploading"}
                        className="w-full rounded-xl bg-green-700 font-bold hover:bg-green-800"
                      >
                        {appScreenshotStatus === "uploading" ? "Parsing app screenshot..." : "Add App Screenshot"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <EvidencePanel
                imageUrl={imageUrl}
                annotations={triage.perception.extraction.bounding_boxes ?? []}
              />
            </div>

            <div className="self-start rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Next Step</h2>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {resultState.nextStep}
              </p>
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Case Status</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{resultState.status}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{resultState.recipientHelper}</p>
              </div>
              <div className="mt-6 space-y-3">
                <Button asChild size="lg" className="h-14 w-full rounded-xl bg-green-700 text-lg font-bold shadow-sm hover:bg-green-800">
                  <a href={resultState.primaryCtaHref}>{resultState.primaryCtaLabel}</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 w-full rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-white">
                  <a href="/upload">Run Triage Again</a>
                </Button>
              </div>
            </div>
          </section>

          <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-widest text-slate-500 hover:text-slate-700">
              Show routing decision trace
            </summary>
            <div className="mt-6">
              <DecisionChain
                observationResult={output.observation_result}
                faultType={output.fault_type_v2}
                recipientType={output.recipient_type}
                assignedTeamId={output.assigned_team_id}
                actionMessage={output.action_message}
              />
            </div>
          </details>

          <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-600">
              Advanced Debug Info
            </summary>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                For development and judging audit only.
              </p>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs text-slate-600">
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
        </CardContent>
      </Card>
    </PageShell>
  );
}

function FieldGrid({ fields }: { fields: OrganizerOutputField[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map(({ label, value }) => (
        <FieldCard key={label} label={label} value={value} />
      ))}
    </div>
  );
}
