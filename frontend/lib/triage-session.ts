/**
 * triage-session.ts
 *
 * Lightweight sessionStorage wrapper that carries the active triage draft
 * across the multi-page flow:
 *   /upload -> /questions -> /result -> /guidance -> /confirmation
 *
 * No external libraries required.
 */

import type { ApiTriageResponse, PreviewResponse, UploadedPhotoEvidence } from "./api";

const SESSION_KEY = "omnitriage_session";

export type TriageSession = {
  incidentId?: number;
  siteId?: string;
  chargerId?: string;
  symptomText?: string;
  errorCode?: string;
  photoHint?: string;
  photoEvidence?: UploadedPhotoEvidence;
  followUpAnswers?: Record<string, string>;
  demoScenarioId?: string;
  preview?: PreviewResponse;
  triage?: ApiTriageResponse;
};

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function readSession(): TriageSession {
  const store = safeStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as TriageSession) : {};
  } catch {
    return {};
  }
}

export function writeSession(patch: Partial<TriageSession>): TriageSession {
  const store = safeStorage();
  const current = readSession();
  const next = { ...current, ...patch };
  if (store) {
    try {
      store.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      // Storage quota exceeded; keep the in-memory flow moving.
    }
  }
  return next;
}

export function clearSession(): void {
  const store = safeStorage();
  if (store) {
    store.removeItem(SESSION_KEY);
  }
}
