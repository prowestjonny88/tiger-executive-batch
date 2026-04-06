import type {
  ApiTriageResponse,
  IncidentHistoryItem,
  PreviewResponse,
  ScenarioOption,
  UploadedPhotoEvidence,
} from "../lib/api";

type ActiveSite = {
  site_name: string;
  charger_label: string;
  charger_id: string;
  has_local_resolver: boolean;
  has_remote_ops: boolean;
};

export function IntakeIntro({
  demoMode,
  selectedScenario,
}: {
  demoMode: boolean;
  selectedScenario?: ScenarioOption;
}) {
  return (
    <div className="section-header">
      <span className="section-subheading">{demoMode ? "Guided replay mode" : "Diagnostic module 04"}</span>
      <h2 className="section-heading">{demoMode ? "Replay a seeded field scenario" : "Upload Charger Photo"}</h2>
      <p className="muted">
        {demoMode
          ? `Use "${selectedScenario?.name ?? "the active scenario"}" to rehearse the full premium intake flow before dataset-driven backend work arrives.`
          : "Capture the visible charger state, add optional telemetry, and preserve the current API-powered preview and triage flow."}
      </p>
    </div>
  );
}

export function EvidenceUploadCard({
  demoMode,
  uploadedPhoto,
  uploadStatus,
  uploadError,
  isUploading,
  onFileChange,
  onClear,
}: {
  demoMode: boolean;
  uploadedPhoto?: UploadedPhotoEvidence;
  uploadStatus: string;
  uploadError: string;
  isUploading: boolean;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="form-card upload-card stack">
      <div className="upload-card__icon" aria-hidden="true">
        {demoMode ? "DM" : "CAM"}
      </div>
      <div className="stack stack-tight stack-centered">
        <h3>{demoMode ? "Load a precision replay" : "Capture or drop image"}</h3>
        <p className="muted copy-narrow">
          {demoMode
            ? "Seeded evidence keeps the experience demo-ready even before real upload and dataset wiring lands."
            : "Upload a real charger photo now. Stored file metadata feeds preview quality checks while deeper image understanding stays heuristic pre-dataset."}
        </p>
      </div>
      {!demoMode ? (
        <>
          <label className="button-secondary" htmlFor="incident-photo-upload">
            {isUploading ? "Uploading..." : uploadedPhoto ? "Replace uploaded photo" : "Capture or choose image"}
          </label>
          <input
            id="incident-photo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </>
      ) : null}
      {uploadStatus ? <p className="muted">{uploadStatus}</p> : null}
      {uploadedPhoto ? (
        <div className="soft-panel stack stack-tight">
          <strong>{uploadedPhoto.filename}</strong>
          <p className="caption">
            {uploadedPhoto.media_type} · {(uploadedPhoto.byte_size / 1024).toFixed(1)} KB
          </p>
          <p className="caption">{uploadedPhoto.storage_path}</p>
          {!demoMode ? (
            <button type="button" className="button-secondary" onClick={onClear}>
              Remove upload
            </button>
          ) : null}
        </div>
      ) : null}
      {uploadError ? <p className="caption">{uploadError}</p> : null}
    </div>
  );
}

export function TechnicalChecklist() {
  return (
    <div className="panel-grid">
      <section className="panel">
        <span className="micro-label">Technical checklist</span>
        <ul className="checklist">
          <li>
            <span className="checkmark">OK</span>
            <span>Include the charger display or indicator lights.</span>
          </li>
          <li>
            <span className="checkmark">OK</span>
            <span>Capture the connector or cable area when physical wear is visible.</span>
          </li>
          <li>
            <span className="danger-mark">!</span>
            <span>Avoid glare, motion blur, or cropped fault zones.</span>
          </li>
        </ul>
      </section>
      <section className="panel">
        <span className="micro-label">What this retrofit preserves</span>
        <p className="muted">
          Current payloads remain stable while the UI takes on the trust-first, editorial structure from the prototype.
        </p>
        <div className="split-callout">
          <div>
            <strong>Pre-dataset safe</strong>
            <p className="caption">Live contracts now stay aligned even while image understanding remains heuristic.</p>
          </div>
          <span className="status-badge status-high">API stable</span>
        </div>
      </section>
    </div>
  );
}

export function SiteSummary({
  activeSite,
  incidentId,
}: {
  activeSite: ActiveSite | undefined;
  incidentId?: number;
}) {
  if (!activeSite) return null;

  return (
    <section className="panel telemetry-panel">
      <span className="micro-label">Station telemetry context</span>
      <div className="site-meta">
        <div className="meta-chip">
          <strong>{activeSite.site_name}</strong>
          <span className="caption">Site reference</span>
        </div>
        <div className="meta-chip">
          <strong>{activeSite.charger_label}</strong>
          <span className="caption">Charger bay</span>
        </div>
        <div className="meta-chip">
          <strong>{activeSite.charger_id}</strong>
          <span className="caption">Device ID</span>
        </div>
        {incidentId ? (
          <div className="meta-chip">
            <strong>INC-{incidentId}</strong>
            <span className="caption">Active workflow</span>
          </div>
        ) : null}
        <div className="meta-chip">
          <strong>
            {activeSite.has_local_resolver ? "Local resolver ready" : "Remote-first resolution"} /{" "}
            {activeSite.has_remote_ops ? "Remote ops available" : "Remote ops unavailable"}
          </strong>
          <span className="caption">Capability routing</span>
        </div>
      </div>
    </section>
  );
}

function humanizeAuditValue(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.replaceAll("_", " ");
}

export function IncidentHistoryPanel({
  incidents,
  isLoading,
  error,
}: {
  incidents: IncidentHistoryItem[];
  isLoading: boolean;
  error: string;
}) {
  return (
    <section className="panel stack">
      <div className="action-row space-between align-center">
        <div className="stack stack-micro">
          <span className="micro-label">Audit trail</span>
          <h3 className="result-panel__title">Recent incident history</h3>
        </div>
        <span className="caption">{incidents.length} recent workflows</span>
      </div>

      {isLoading ? <p className="muted">Loading recent SQLite-backed workflows...</p> : null}
      {error ? <p className="caption">{error}</p> : null}

      {!isLoading && incidents.length === 0 ? (
        <p className="muted">
          No persisted incidents yet. Run preview or triage with the live backend enabled to populate the judge/debug
          history.
        </p>
      ) : null}

      {incidents.length > 0 ? (
        <div className="stack stack-tight">
          {incidents.map((incident) => (
            <article key={incident.id} className="soft-panel stack stack-tight">
              <div className="action-row space-between align-center">
                <strong>INC-{incident.id}</strong>
                <span className="status-badge status-neutral">
                  {humanizeAuditValue(incident.latest_resolver_tier, "Awaiting triage")}
                </span>
              </div>
              <div className="site-meta">
                <div className="meta-chip">
                  <strong>{incident.site_id}</strong>
                  <span className="caption">Site</span>
                </div>
                {incident.charger_id ? (
                  <div className="meta-chip">
                    <strong>{incident.charger_id}</strong>
                    <span className="caption">Charger</span>
                  </div>
                ) : null}
                <div className="meta-chip">
                  <strong>{humanizeAuditValue(incident.latest_stage, "Pending review")}</strong>
                  <span className="caption">Latest stage</span>
                </div>
                {incident.latest_confidence_band ? (
                  <div className="meta-chip">
                    <strong>{incident.latest_confidence_band}</strong>
                    <span className="caption">Confidence</span>
                  </div>
                ) : null}
              </div>
              {incident.latest_fault ? <p className="muted">{incident.latest_fault}</p> : null}
              <p className="caption">
                {incident.error_code ? `Error ${incident.error_code} · ` : ""}
                {incident.symptom_text || incident.photo_hint || "No symptom summary recorded yet."}
              </p>
              {incident.photo_evidence ? <p className="caption">Stored photo: {incident.photo_evidence.filename}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function qualityClass(status: PreviewResponse["quality"]["quality_status"]) {
  return `quality-badge quality-${status}`;
}

function confidenceClass(band: ApiTriageResponse["diagnosis"]["confidence_band"]) {
  return `status-badge status-${band}`;
}

export function ResultsPanel({
  preview,
  result,
  status,
  error,
}: {
  preview: PreviewResponse | null;
  result: ApiTriageResponse | null;
  status: string;
  error: string;
}) {
  return (
    <section className="result-stack">
      <div className="section-header">
        <span className="section-subheading">Assessment window</span>
        <h2 className="section-heading">Likely issue identified</h2>
        <p className="muted">
          Preview, triage, routing, and guidance remain live while the visual system catches up to the prototype.
        </p>
      </div>

      {status ? (
        <div className="soft-panel">
          <span className="micro-label">Processing state</span>
          <p className="muted">{status}</p>
        </div>
      ) : null}

      {error ? (
        <div className="danger-banner">
          <strong>Request could not complete.</strong>
          <div>{error}</div>
        </div>
      ) : null}

      {preview ? (
        <article className="result-panel surface-card">
          <div className="action-row space-between align-center">
            <div className="stack stack-micro">
              <span className="micro-label">Intake quality</span>
              <h3 className="result-panel__title">Evidence readiness</h3>
            </div>
            <span className={qualityClass(preview.quality.quality_status)}>
              {preview.quality.quality_status.replace("_", " ")}
            </span>
          </div>
          <ul className="steps">
            {preview.quality.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {preview.quality.storage_path ? (
            <p className="caption">
              Stored evidence: {preview.quality.filename || "incident photo"} · {preview.quality.storage_path}
            </p>
          ) : null}
          {preview.follow_up_questions.length > 0 ? (
            <div className="panel">
              <span className="micro-label">Follow-up questions</span>
              <ul className="steps">
                {preview.follow_up_questions.map((question) => (
                  <li key={question.question_id}>{question.prompt}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ) : null}

      {result ? (
        <>
          <article className="result-panel result-panel--primary">
            <div className="action-row space-between align-start">
              <div className="stack stack-micro">
                <span className="micro-label">Primary diagnosis</span>
                <h3 className="result-panel__title">{result.diagnosis.likely_fault}</h3>
                <p className="muted">{result.diagnosis.internal_issue_category}</p>
              </div>
              <span className={confidenceClass(result.diagnosis.confidence_band)}>
                {result.diagnosis.confidence_band} confidence / {result.diagnosis.confidence_score.toFixed(2)}
              </span>
            </div>
            <p className="muted">{result.diagnosis.evidence_summary}</p>
            {result.diagnosis.hazard_flags.length > 0 ? (
              <div className="danger-banner">Hazard flags: {result.diagnosis.hazard_flags.join(", ")}</div>
            ) : null}
          </article>

          <div className="result-grid">
            <article className="result-panel">
              <span className="micro-label">Visual evidence</span>
              <ul className="artifact-list">
                <li>Site reference: {result.incident.site_id}</li>
                <li>Stored image: {result.incident.photo_evidence?.filename || "No uploaded image supplied"}</li>
                <li>Photo hint: {result.incident.photo_hint || "No visual hint supplied"}</li>
                <li>Error code: {result.incident.error_code || "No error code supplied"}</li>
              </ul>
            </article>
            <article className="result-panel">
              <span className="micro-label">Report analysis</span>
              <ul className="artifact-list">
                <li>Resolver tier: {result.routing.resolver_tier}</li>
                <li>Priority: {result.routing.priority}</li>
                <li>Next action: {result.routing.next_action}</li>
                <li>Fallback action: {result.routing.fallback_action}</li>
              </ul>
            </article>
          </div>

          <article className="result-panel">
            <span className="micro-label">Safe guidance</span>
            <h3 className="result-panel__title">{result.artifact.title}</h3>
            {result.artifact.summary ? <p className="muted">{result.artifact.summary}</p> : null}
            <ol className="artifact-list">
              {result.artifact.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="muted">{result.artifact.safety_note}</p>
          </article>

          <article className="result-panel">
            <span className="micro-label">Confidence gate</span>
            <p className="muted">{result.confidence.rationale}</p>
            {result.confidence.requires_confirmation ? (
              <div className="soft-panel">
                <span className="micro-label">Confirmation status</span>
                <p className="muted">Additional answers were required before safe routing.</p>
              </div>
            ) : null}
          </article>

          <article className="result-panel">
            <span className="micro-label">Escalation rationale</span>
            <p className="muted">{result.routing.rationale}</p>
            {result.artifact.evidence_focus?.length ? (
              <ul className="artifact-list">
                {result.artifact.evidence_focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        </>
      ) : (
        <article className="result-panel placeholder-panel">
          <span className="micro-label">Awaiting assessment</span>
          <p className="muted">Run preview or triage to populate the redesigned assessment panels.</p>
        </article>
      )}
    </section>
  );
}
