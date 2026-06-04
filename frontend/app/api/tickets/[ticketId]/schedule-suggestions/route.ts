import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../../_lib/backend-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  return proxyBackendJson(`/api/v1/tickets/${encodeURIComponent(ticketId)}/schedule-suggestions`, {
    missingBackendMessage: "Live backend is required for schedule suggestions.",
    unavailableMessage: "Live backend is unavailable. Schedule suggestions require the FastAPI service.",
  });
}
