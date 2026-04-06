import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:8001";
  try {
    const res = await fetch(`${baseUrl}/api/v1/incidents/${id}`);
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Incident proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch from upstream API" }, { status: 502 });
  }
}
