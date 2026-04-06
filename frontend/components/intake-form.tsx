"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchIncidents,
  fetchPreview,
  fetchScenarios,
  fetchSites,
  fetchTriage,
  type ApiTriageResponse,
  type IncidentHistoryItem,
  type PreviewResponse,
  type ScenarioOption,
  type SiteOption,
  type UploadedPhotoEvidence,
  uploadIncidentPhoto,
} from "../lib/api";
import { scenarios as fallbackScenarios, sites as fallbackSites } from "../lib/demo-data";
import {
  EvidenceUploadCard,
  IncidentHistoryPanel,
  IntakeIntro,
  ResultsPanel,
  SiteSummary,
  TechnicalChecklist,
} from "./intake-panels";

type Props = {
  demoMode?: boolean;
};

type IntakeFormState = {
  incidentId?: number;
  siteId: string;
  chargerId?: string;
  photoEvidence?: UploadedPhotoEvidence;
  photoHint: string;
  symptomText: string;
  errorCode: string;
  followUpAnswers: Record<string, string>;
  demoScenarioId?: string;
};

const initialFallbackSite = fallbackSites[0];
const initialState: IntakeFormState = {
  siteId: initialFallbackSite.site_id,
  chargerId: initialFallbackSite.charger_id,
  photoHint: "",
  symptomText: "",
  errorCode: "",
  followUpAnswers: {},
};

function buildPayload(
  form: IntakeFormState,
  overrides: Partial<{
    incident_id: number | undefined;
    follow_up_answers: Record<string, string>;
  }> = {},
) {
  return {
    incident_id: overrides.incident_id ?? form.incidentId,
    site_id: form.siteId,
    charger_id: form.chargerId,
    photo_evidence: form.photoEvidence,
    photo_hint: form.photoHint,
    symptom_text: form.symptomText,
    error_code: form.errorCode,
    follow_up_answers: overrides.follow_up_answers ?? form.followUpAnswers,
    demo_scenario_id: form.demoScenarioId,
  };
}

function scenarioToForm(scenario: ScenarioOption, siteOptions: readonly SiteOption[]): IntakeFormState {
  const matchingSite = siteOptions.find((site) => site.site_id === scenario.site_id);
  return {
    incidentId: undefined,
    siteId: scenario.site_id,
    chargerId: matchingSite?.charger_id,
    photoEvidence: undefined,
    photoHint: scenario.photo_hint,
    symptomText: scenario.symptom_text,
    errorCode: scenario.error_code,
    followUpAnswers: { ...scenario.follow_up_answers },
    demoScenarioId: scenario.scenario_id,
  };
}

export function IntakeFormCard({ demoMode = false }: Props) {
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([...fallbackSites]);
  const [scenarioOptions, setScenarioOptions] = useState<ScenarioOption[]>([...fallbackScenarios]);
  const [selectedScenario, setSelectedScenario] = useState<string>(fallbackScenarios[0]?.scenario_id ?? "");
  const [form, setForm] = useState<IntakeFormState>(() =>
    demoMode && fallbackScenarios[0] ? scenarioToForm(fallbackScenarios[0], fallbackSites) : initialState,
  );
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ApiTriageResponse | null>(null);
  const [incidentHistory, setIncidentHistory] = useState<IncidentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<string>(demoMode ? "Demo mode ready." : "");
  const [error, setError] = useState<string>("");

  const loadIncidentHistory = async () => {
    setHistoryError("");
    setHistoryLoading(true);
    try {
      setIncidentHistory(await fetchIncidents());
    } catch {
      setHistoryError("Incident history is unavailable until the live backend is connected.");
      setIncidentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs() {
      try {
        const [loadedSites, loadedScenarios] = await Promise.all([fetchSites(), fetchScenarios()]);
        if (cancelled) return;

        setSiteOptions(loadedSites);
        setScenarioOptions(loadedScenarios);

        const firstScenario = loadedScenarios[0];
        setSelectedScenario(firstScenario?.scenario_id ?? "");
        setForm((current) => {
          if (demoMode && firstScenario) {
            return scenarioToForm(firstScenario, loadedSites);
          }

          const matchingSite = loadedSites.find((site) => site.site_id === current.siteId) ?? loadedSites[0];
          return {
            ...current,
            siteId: matchingSite?.site_id ?? current.siteId,
            chargerId: matchingSite?.charger_id ?? current.chargerId,
          };
        });
      } catch {
        if (!cancelled) {
          setStatus((current) => current || "Using local seeded catalogs.");
        }
      }
    }

    void loadCatalogs();
    void loadIncidentHistory();

    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const activeSite = useMemo(
    () => siteOptions.find((site) => site.site_id === form.siteId),
    [form.siteId, siteOptions],
  );
  const activeScenario = useMemo(
    () => scenarioOptions.find((scenario) => scenario.scenario_id === selectedScenario),
    [scenarioOptions, selectedScenario],
  );

  const payload = buildPayload(form);

  const runRequest = async (message: string, action: () => Promise<void>) => {
    setError("");
    setStatus(message);
    try {
      await action();
      setStatus("Assessment complete.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown request error");
      setStatus("");
    }
  };

  const syncIncidentId = (incidentId: number) => {
    setForm((current) => ({ ...current, incidentId }));
  };

  const handlePhotoSelection = async (file: File | null) => {
    if (!file) return;

    setUploadError("");
    setUploadStatus("Uploading charger photo...");
    setIsUploading(true);
    try {
      const uploadedPhoto = await uploadIncidentPhoto(file);
      setForm((current) => ({ ...current, photoEvidence: uploadedPhoto }));
      setUploadStatus(`Stored ${uploadedPhoto.filename} for the active workflow.`);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Unable to upload the selected photo.");
      setUploadStatus("");
    } finally {
      setIsUploading(false);
    }
  };

  const clearUploadedPhoto = () => {
    setForm((current) => ({ ...current, photoEvidence: undefined }));
    setUploadStatus("");
    setUploadError("");
  };

  const loadScenario = async (scenarioId: string) => {
    const scenario = scenarioOptions.find((item) => item.scenario_id === scenarioId);
    if (!scenario) return;

    setSelectedScenario(scenarioId);
    const nextForm = scenarioToForm(scenario, siteOptions);
    setForm(nextForm);
    setUploadStatus("");
    setUploadError("");

    await runRequest("Loading scenario...", async () => {
      const previewResponse = await fetchPreview(buildPayload(nextForm, { follow_up_answers: {} }));
      syncIncidentId(previewResponse.incident_id);
      setPreview(previewResponse);
      await loadIncidentHistory();

      const triageResponse = await fetchTriage(
        buildPayload(nextForm, { incident_id: previewResponse.incident_id }),
      );
      syncIncidentId(triageResponse.incident_id);
      setResult(triageResponse);
      await loadIncidentHistory();
    });
  };

  const handlePreview = async () => {
    await runRequest("Reviewing intake evidence...", async () => {
      const previewResponse = await fetchPreview(payload);
      syncIncidentId(previewResponse.incident_id);
      setPreview(previewResponse);
      setResult(null);
      await loadIncidentHistory();
    });
  };

  const handleTriage = async () => {
    await runRequest("Running structured triage...", async () => {
      const triageResponse = await fetchTriage(payload);
      syncIncidentId(triageResponse.incident_id);
      setResult(triageResponse);
      await loadIncidentHistory();
    });
  };

  return (
    <section className="two-column-grid">
      <div className="page-stack">
        <IntakeIntro demoMode={demoMode} selectedScenario={activeScenario} />
        <EvidenceUploadCard
          demoMode={demoMode}
          uploadedPhoto={form.photoEvidence}
          uploadStatus={uploadStatus}
          uploadError={uploadError}
          isUploading={isUploading}
          onFileChange={(file) => void handlePhotoSelection(file)}
          onClear={clearUploadedPhoto}
        />
        <TechnicalChecklist />

        <div className="form-card stack">
          {demoMode ? (
            <div className="field">
              <label htmlFor="scenario">Demo scenario</label>
              <select
                className="select"
                id="scenario"
                value={selectedScenario}
                onChange={(event) => void loadScenario(event.target.value)}
              >
                {scenarioOptions.map((scenario) => (
                  <option key={scenario.scenario_id} value={scenario.scenario_id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
              {activeScenario ? <p className="caption">{activeScenario.headline}</p> : null}
            </div>
          ) : null}

          <div className="field-grid">
            <div className="field">
              <label htmlFor="siteId">Site</label>
              <select
                className="select"
                id="siteId"
                value={form.siteId}
                onChange={(event) =>
                  setForm((current) => {
                    const nextSite = siteOptions.find((site) => site.site_id === event.target.value);
                    return {
                      ...current,
                      siteId: event.target.value,
                      chargerId: nextSite?.charger_id,
                    };
                  })
                }
              >
                {siteOptions.map((site) => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.site_name} - {site.charger_label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="photoHint">Operator visual notes</label>
              <input
                className="input"
                id="photoHint"
                value={form.photoHint}
                onChange={(event) => setForm((current) => ({ ...current, photoHint: event.target.value }))}
                placeholder="Optional notes: dim screen, glare, partial view, cable wear..."
              />
            </div>

            <div className="field">
              <label htmlFor="errorCode">Visible error code</label>
              <input
                className="input"
                id="errorCode"
                value={form.errorCode}
                onChange={(event) => setForm((current) => ({ ...current, errorCode: event.target.value }))}
                placeholder="Optional fault code"
              />
            </div>

            <div className="field">
              <label htmlFor="symptomText">Symptoms</label>
              <textarea
                className="textarea"
                id="symptomText"
                value={form.symptomText}
                onChange={(event) => setForm((current) => ({ ...current, symptomText: event.target.value }))}
                placeholder="Describe what the driver or site operator is seeing."
              />
            </div>
          </div>

          {preview?.follow_up_questions.length ? (
            <div className="panel stack">
              <span className="micro-label">Adaptive follow-up</span>
              {preview.follow_up_questions.map((question) => (
                <div className="field" key={question.question_id}>
                  <label htmlFor={question.question_id}>{question.prompt}</label>
                  <input
                    className="input"
                    id={question.question_id}
                    value={form.followUpAnswers[question.question_id] ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        followUpAnswers: {
                          ...current.followUpAnswers,
                          [question.question_id]: event.target.value,
                        },
                      }))
                    }
                    placeholder="Add the observed answer"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="action-row">
            <button type="button" className="button-primary" onClick={() => void handlePreview()}>
              Preview intake
            </button>
            <button type="button" className="button-secondary" onClick={() => void handleTriage()}>
              Run triage
            </button>
          </div>

          <SiteSummary activeSite={activeSite} incidentId={form.incidentId} />
          <IncidentHistoryPanel incidents={incidentHistory} isLoading={historyLoading} error={historyError} />
        </div>
      </div>

      <ResultsPanel preview={preview} result={result} status={status} error={error} />
    </section>
  );
}
