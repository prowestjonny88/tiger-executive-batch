import { NextRequest, NextResponse } from "next/server";

import { buildFallbackPreview } from "../../../../lib/server/triage-engine";

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

export async function POST(request: NextRequest) {
  const payload = await request.json();

  if (backendUrl) {
    const response = await fetch(`${backendUrl}/api/v1/intake/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(buildFallbackPreview(payload));
}
