import { NextResponse } from "next/server";

const MISSING_BACKEND_MESSAGE =
  "Live backend is not configured. Set NEXT_PUBLIC_API_BASE_URL or API_BASE_URL.";
const UNAVAILABLE_BACKEND_MESSAGE =
  "Live backend is unavailable. Start the FastAPI backend and retry.";

export function getBackendBaseUrl(): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  return baseUrl ? baseUrl.replace(/\/$/, "") : null;
}

export function backendConfigError(message: string = MISSING_BACKEND_MESSAGE) {
  return NextResponse.json({ detail: message }, { status: 503 });
}

export function backendUnavailableError(message: string = UNAVAILABLE_BACKEND_MESSAGE) {
  return NextResponse.json({ detail: message }, { status: 503 });
}

type ProxyOptions = {
  init?: RequestInit;
  missingBackendMessage?: string;
  unavailableMessage?: string;
};

export async function proxyBackendJson(path: string, options: ProxyOptions = {}) {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return backendConfigError(options.missingBackendMessage);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      ...options.init,
    });
    const raw = await response.text();
    let payload: unknown = {};

    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { detail: raw };
      }
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error(`Backend proxy failed for ${path}`, error);
    return backendUnavailableError(options.unavailableMessage);
  }
}
