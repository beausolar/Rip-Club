"use client";

import { useState } from "react";

type Summary = {
  count: number;
  low: number | null;
  high: number | null;
  average: number | null;
  median: number | null;
  lastSold: { price: number; date: string; title?: string; url?: string } | null;
};

export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<Summary | null>(null);
  const [sold, setSold] = useState<Summary | null>(null);

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [soldListings, setSoldListings] = useState<any[]>([]);

  const fmtMoney = (v: number | null | undefined) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "—";
    return `$${v.toLocaleString()}`;
  };

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

  async function getPrice() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || data?.error || "Server error");
        setActive(null);
        setSold(null);
        setActiveListings([]);
        setSoldListings([]);
        return;
      }

      setActive(data?.active ?? null);
      setSold(data?.sold ?? null);
      setActiveListings(data?.activeListings ?? []);
      setSoldListings(data?.soldListings ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
      setActive(null);
      setSold(null);
      setActiveListings([]);
      setSoldListings([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <h1>Rip Club — Price Check</h1>

      <p style={{ color: "#666" }}>
        Type a card search like: <b>2018 Luka Doncic Prizm PSA 10</b>
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="2018 Luka Doncic Prizm PSA 10"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={getPrice}
          disabled={loading || !query.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Get Price"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fee",
            border: "1px solid #fbb",
          }}
        >
          <b>Error:</b> {error}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Summary (Active + Sold)</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 10, border: "1px solid #eee", background: "white" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Active listings</div>
            <div><b>Count:</b> {active?.count ?? 0}</div>
            <div><b>Median:</b> {fmtMoney(active?.median)}</div>
            <div><b>Low / High:</b> {fmtMoney(active?.low)} / {fmtMoney(active?.high)}</div>
            <div><b>Average:</b> {fmtMoney(active?.average)}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 10, border: "1px solid #eee", background: "white" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Sold (completed)</div>
            <div><b>Count:</b> {sold?.count ?? 0}</div>
            <div><b>Median:</b> {fmtMoney(sold?.median)}</div>
            <div><b>Low / High:</b> {fmtMoney(sold?.low)} / {fmtMoney(sold?.high)}</div>
            <div><b>Average:</b> {fmtMoney(sold?.average)}</div>

            <div style={{ marginTop: 10 }}>
              <b>Last sold:</b>{" "}
              {sold?.lastSold ? (
                <>
                  {fmtMoney(sold.lastSold.price)}{" "}
                  <span style={{ color: "#666" }}>({fmtDate(sold.lastSold.date)})</span>
                </>
              ) : (
                <span style={{ color: "#666" }}>No completed sales found for that query.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Active Results</h3>
        {!activeListings?.length ? (
          <div style={{ color: "#666" }}>No active results yet — try a search.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {activeListings.map((r, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #eee",
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 700 }}>{r?.title ?? "Untitled"}</div>
                <div style={{ color: "#666", marginTop: 4 }}>
                  Price: {fmtMoney(r?.price?.value !== undefined ? Number(r.price.value) : null)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
