import { NextResponse } from "next/server";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Sha256 } from "@aws-crypto/sha256-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const endpoint = process.env.AWS_SIMULATION_API_URL;
  if (!endpoint) return NextResponse.json({ error: "AWS simulation is not configured" }, { status: 503 });
  let url: URL;
  try {
    url = new URL(endpoint);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".execute-api.ap-south-1.amazonaws.com")) throw Error("Invalid endpoint");
  } catch { return NextResponse.json({ error: "Invalid AWS API configuration" }, { status: 500 }); }
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input) || !("scenario" in input))
    return NextResponse.json({ error: "Scenario required" }, { status: 400 });
  const body = JSON.stringify(input);
  if (body.length > 250_000) return NextResponse.json({ error: "Scenario too large" }, { status: 413 });
  try {
    const signer = new SignatureV4({
      credentials: fromNodeProviderChain(), region: "ap-south-1", service: "execute-api", sha256: Sha256,
    });
    const signed = await signer.sign({
      method: "POST", protocol: url.protocol, hostname: url.hostname, path: url.pathname + url.search,
      headers: { host: url.hostname, "content-type": "application/json" }, body,
    });
    const headers = new Headers();
    for (const [name, value] of Object.entries(signed.headers)) {
      if (name.toLowerCase() !== "host") headers.set(name, value.replace(/[\r\n]+/g, " ").trim());
    }
    const response = await fetch(url, {
      method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    const result: unknown = await response.json();
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "AWS compute unavailable; use local model" }, { status: 502 });
  }
}
