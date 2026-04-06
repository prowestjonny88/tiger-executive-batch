import { NextResponse } from "next/server";

import { sites } from "../../../lib/demo-data";

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

export async function GET() {
  if (backendUrl) {
    const response = await fetch(`${backendUrl}/api/v1/sites`, {
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(sites);
}
