import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../_lib/backend-proxy";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  return proxyBackendJson("/api/v1/charger-identity/scan", {
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    missingBackendMessage: "Live backend is required for charger label scanning.",
    unavailableMessage: "Live backend is unavailable. Charger label scanning requires the FastAPI service.",
  });
}
