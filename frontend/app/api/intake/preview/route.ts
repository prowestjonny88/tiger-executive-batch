import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../_lib/backend-proxy";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  return proxyBackendJson("/api/v1/intake/preview", {
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    missingBackendMessage: "Live backend is required for intake preview requests.",
    unavailableMessage: "Live backend is unavailable. Intake preview requests require the FastAPI service.",
  });
}
