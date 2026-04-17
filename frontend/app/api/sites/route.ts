import { NextResponse } from "next/server";

import { getBackendBaseUrl, proxyBackendJson } from "../_lib/backend-proxy";
import { sites } from "../../../lib/demo-data";

export async function GET() {
  if (!getBackendBaseUrl()) {
    return NextResponse.json(sites);
  }

  return proxyBackendJson("/api/v1/sites", {
    unavailableMessage: "Live backend is unavailable. Site data could not be refreshed.",
  });
}
