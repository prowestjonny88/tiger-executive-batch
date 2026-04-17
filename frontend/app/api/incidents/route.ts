import { proxyBackendJson } from "../_lib/backend-proxy";

export async function GET() {
  return proxyBackendJson("/api/v1/incidents", {
    missingBackendMessage: "Live backend is required for incident history.",
    unavailableMessage: "Live backend is unavailable. Incident history requires the FastAPI service.",
  });
}
