import { NextRequest } from "next/server";

import { proxyBackendJson } from "../../../_lib/backend-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  return proxyBackendJson(`/api/v1/tickets/${encodeURIComponent(ticketId)}/whatsapp-preview`, {
    missingBackendMessage: "Live backend is required for WhatsApp preview.",
    unavailableMessage: "Live backend is unavailable. WhatsApp preview requires the FastAPI service.",
  });
}
