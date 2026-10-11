import { NextRequest, NextResponse } from "next/server";
import type { LiveFloodSignals } from "@/lib/live-signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoordinate(raw: string | null, low: number, high: number): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= low && value <= high ? value : null;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Data provider returned HTTP ${response.status}`);
  return response.json();
}

export async function GET(request: NextRequest) {
  const latitude = parseCoordinate(request.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = parseCoordinate(request.nextUrl.searchParams.get("lon"), -180, 180);
  const siteId = request.nextUrl.searchParams.get("site")?.trim() ?? "";
  if (latitude === null || longitude === null || (siteId && !/^\d{8,15}$/.test(siteId))) {
    return NextResponse.json({ error: "Valid coordinates and an optional numeric USGS station ID are required." }, { status: 400 });
  }
  const signals: LiveFloodSignals = { fetchedAt: new Date().toISOString(), rain: null, river: null, warnings: [] };
  const tasks: Promise<void>[] = [];
  tasks.push((async () => {
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));
      url.searchParams.set("current", "precipitation,rain");
      url.searchParams.set("timezone", "GMT");
      const data = await fetchJson(url.toString()) as { current?: { time?: string; precipitation?: number; rain?: number } };
      const current = data.current;
      if (!current || typeof current.precipitation !== "number" || !Number.isFinite(current.precipitation)) throw new Error("No current precipitation value");
      signals.rain = { mmPerHour: Math.max(0, current.precipitation), observedAt: current.time ? `${current.time}Z` : signals.fetchedAt, source: "Open-Meteo current precipitation (weather-model/observation blend, not a rain gauge)" };
    } catch {
      signals.warnings.push("Current rainfall unavailable from Open-Meteo; retry later.");
    }
  })());
  if (siteId) tasks.push((async () => {
    try {
      const url = new URL("https://waterservices.usgs.gov/nwis/iv/");
      url.searchParams.set("format", "json");
      url.searchParams.set("sites", siteId);
      url.searchParams.set("parameterCd", "00065");
      url.searchParams.set("period", "PT6H");
      const data = await fetchJson(url.toString()) as { value?: { timeSeries?: Array<{ values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }> }> } };
      const series = data.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
      const points = series.map(item => ({ stage: Number(item.value), time: item.dateTime ?? "" })).filter(item => Number.isFinite(item.stage) && item.time);
      if (!points.length) throw new Error("No gauge readings");
      const latest = points[points.length - 1];
      const previous = points.length > 1 ? points[points.length - 2] : latest;
      const feetToMeters = 0.3048;
      signals.river = { siteId, stageMeters: latest.stage * feetToMeters, recentRiseMeters: Math.max(0, latest.stage - previous.stage) * feetToMeters, observedAt: latest.time, source: "USGS NWIS observed gauge height (US stations only)" };
    } catch {
      signals.warnings.push("No current USGS gauge reading found for that station. River rise remains a manual scenario input.");
    }
  })());
  await Promise.all(tasks);
  return NextResponse.json(signals, { headers: { "Cache-Control": "no-store" } });
}
