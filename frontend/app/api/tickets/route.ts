import { NextRequest } from "next/server";

import { proxyBackendJson } from "../_lib/backend-proxy";

export async function GET(request: NextRequest) {
  return proxyBackendJson(`/api/v1/tickets${request.nextUrl.search}`, {
    missingBackendMessage: "Live backend is required for support tickets.",
    unavailableMessage: "Live backend is unavailable. Ticket history requires the FastAPI service.",
  });
}
