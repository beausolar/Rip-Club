import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET" },
        { status: 500 }
      );
    }

    const tokenUrl = "https://api.ebay.com/identity/v1/oauth2/token";
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const scope = [
      "https://api.ebay.com/oauth/api_scope",
      "https://api.ebay.com/oauth/api_scope/buy.browse"
    ].join(" ");

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope
    });

    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: "eBay token request failed", details: data },
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
