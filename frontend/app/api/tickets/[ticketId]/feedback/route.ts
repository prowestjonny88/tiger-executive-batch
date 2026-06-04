import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../../_lib/backend-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const payload = await request.json();
  return proxyBackendJson(`/api/v1/tickets/${encodeURIComponent(ticketId)}/feedback`, {
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    missingBackendMessage: "Live backend is required for feedback.",
    unavailableMessage: "Live backend is unavailable. Ticket feedback requires the FastAPI service.",
  });
}
