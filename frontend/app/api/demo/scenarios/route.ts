import { NextResponse } from "next/server";

import { getBackendBaseUrl, proxyBackendJson } from "../../_lib/backend-proxy";
import { getScenarioOptions } from "../../../../lib/server/demo-scenarios";

export async function GET() {
  if (!getBackendBaseUrl()) {
    return NextResponse.json(getScenarioOptions());
  }

  return proxyBackendJson("/api/v1/demo/scenarios", {
    unavailableMessage: "Live backend is unavailable. Demo scenarios could not be refreshed.",
  });
}
