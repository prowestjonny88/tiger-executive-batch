import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../../_lib/backend-proxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const payload = await request.json();
  return proxyBackendJson(`/api/v1/tickets/${encodeURIComponent(ticketId)}/status`, {
    init: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    missingBackendMessage: "Live backend is required for ticket status updates.",
    unavailableMessage: "Live backend is unavailable. Ticket status updates require the FastAPI service.",
  });
}
