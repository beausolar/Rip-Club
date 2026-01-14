import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime (Buffer works)
export const dynamic = "force-dynamic";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";

const EBAY_MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";

async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  // TEMP DEBUG (safe): confirms env vars are loading
  console.log("EBAY_CLIENT_ID starts:", clientId?.slice(0, 8));
  console.log("EBAY_CLIENT_SECRET length:", clientSecret?.length);

  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64"
  );

  const resp = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      // IMPORTANT: scope for Browse API
      scope: "https://api.ebay.com/oauth/api_scope/buy.browse",
    }),
    cache: "no-store",
  });

  // DEBUG: show the real eBay OAuth error payload (or token response)
  const raw = await resp.text();
  console.log("OAuth status:", resp.status, resp.statusText);
  console.log("OAuth raw body:", raw);

  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!resp.ok || !data?.access_token) {
    console.error("❌ OAuth failure parsed:", data);
    throw new Error("OAuth token fetch failed");
  }

  return data.access_token as string;
}

function summarize(prices: number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  const count = sorted.length;

  const low = count ? sorted[0] : null;
  const high = count ? sorted[count - 1] : null;

  const average = count
    ? Number((sorted.reduce((a, b) => a + b, 0) / count).toFixed(2))
    : null;

  const median = count
    ? count % 2 === 1
      ? sorted[Math.floor(count / 2)]
      : Number(((sorted[count / 2 - 1] + sorted[count / 2]) / 2).toFixed(2))
    : null;

  return { count, low, high, average, median };
}

export async function POST(req: Request) {
  console.log("=== /api/price START ===");

  try {
    const body = await req.json().catch(() => ({}));
    const query = body?.query;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Bad request", message: "Missing `query` string" },
        { status: 400 }
      );
    }

    console.log("Query:", query);

    const token = await getEbayAccessToken();

    const url =
      `${EBAY_BROWSE_URL}?` +
      new URLSearchParams({
        q: query,
        limit: "50",
        category_ids: "183454", // Trading Card Singles
      }).toString();

    const browseResp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        // IMPORTANT: required by Browse API
        "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
      },
      cache: "no-store",
    });

    const browseRaw = await browseResp.text();
    let browseData: any = {};
    try {
      browseData = browseRaw ? JSON.parse(browseRaw) : {};
    } catch {
      browseData = { raw: browseRaw };
    }

    if (!browseResp.ok) {
      console.error("❌ Browse API error:", {
        status: browseResp.status,
        statusText: browseResp.statusText,
        data: browseData,
      });
      throw new Error("Browse API failed");
    }

    const prices =
      browseData?.itemSummaries
        ?.map((i: any) => Number(i?.price?.value))
        .filter((n: number) => Number.isFinite(n)) ?? [];

    const active = summarize(prices);

    console.log("✅ Active summary:", active);

    return NextResponse.json({
      active,
      sold: {
        count: 0,
        low: null,
        high: null,
        average: null,
        median: null,
        lastSold: null,
        note:
          "Sold/completed requires eBay Marketplace Insights access. Active listings only for now.",
      },
    });
  } catch (err: any) {
    console.error("🔥 SERVER ERROR:", err);
    return NextResponse.json(
      {
        error: "Server error",
        message: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    console.log("=== /api/price END ===");
  }
}
