import { NextRequest, NextResponse } from "next/server";

type GoogleGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: GoogleGeocodeResult[];
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) {
    return NextResponse.json({ detail: "Google Maps server key is not configured." }, { status: 503 });
  }

  let payload: { lat?: unknown; lng?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid reverse geocode request." }, { status: 400 });
  }

  const lat = typeof payload.lat === "number" ? payload.lat : Number(payload.lat);
  const lng = typeof payload.lng === "number" ? payload.lng : Number(payload.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ detail: "Latitude and longitude are required." }, { status: 400 });
  }

  const search = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: apiKey,
    language: "en",
    region: "my",
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${search.toString()}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as GoogleGeocodeResponse;
    if (!response.ok || data.status !== "OK") {
      return NextResponse.json(
        { detail: data.error_message || `Google reverse geocoding failed: ${data.status}` },
        { status: response.ok ? 502 : response.status }
      );
    }

    const result = data.results?.find((item) => item.formatted_address && item.place_id) ?? null;
    if (!result?.formatted_address || !result.place_id) {
      return NextResponse.json({ detail: "No address found for this GPS location." }, { status: 404 });
    }

    return NextResponse.json({
      formatted_address: result.formatted_address,
      google_place_id: result.place_id,
      location_lat: result.geometry?.location?.lat ?? lat,
      location_lng: result.geometry?.location?.lng ?? lng,
    });
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    return NextResponse.json({ detail: "Reverse geocoding service is unavailable." }, { status: 503 });
  }
}
