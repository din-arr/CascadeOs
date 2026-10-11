
import { NextResponse } from "next/server";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Sha256 } from "@aws-crypto/sha256-js";

export const runtime = "nodejs";

const endpoint =
  "https://4k7rqzf8rd.execute-api.ap-south-1.amazonaws.com/scenarios";

export async function POST(request: Request) {
  try {
    const input = await request.json();

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      !["save", "get"].includes(input.action)
    ) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const body = JSON.stringify(input);
    const url = new URL(endpoint);

    const signer = new SignatureV4({
      credentials: fromNodeProviderChain(),
      region: "ap-south-1",
      service: "execute-api",
      sha256: Sha256,
    });

    const signed = await signer.sign({
        method: "POST",
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname,
        headers: {
            host: url.hostname,
            "content-type": "application/json",
        },
        body,
    });

    const headers = new Headers();

    for (const [key, value] of Object.entries(signed.headers)) {
        if (key.toLowerCase() === "host") continue;

        const v = value.replace(/[\r\n]+/g, " ").trim();
        headers.set(key, v);
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
    });
    const result = await response.json();

    return NextResponse.json(result, {
      status: response.status,
    });
  } catch (error) {
    console.error("CascadeOS AWS API error:", error);

    return NextResponse.json(
      { error: "AWS request failed" },
      { status: 500 }
    );
  }
}
