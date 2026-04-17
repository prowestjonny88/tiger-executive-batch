import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../_lib/backend-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackendJson(`/api/v1/incidents/${id}`, {
    missingBackendMessage: "Live backend is required for incident replay.",
    unavailableMessage: "Live backend is unavailable. Incident replay requires the FastAPI service.",
  });
}
