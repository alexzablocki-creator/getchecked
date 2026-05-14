// netlify/functions/release-item.js
// Updates reservation status to 'released' in Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabaseUpdate(table, match, data) {
  const params = new URLSearchParams(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`])
  );
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

  const { claimCode, stationId } = body;
  if (!claimCode || !stationId) {
    return new Response(JSON.stringify({ error: "claimCode and stationId required" }), { status: 400 });
  }

  try {
    const result = await supabaseUpdate(
      "reservations",
      { claim_code: claimCode, station_id: stationId },
      { status: "released", released_at: new Date().toISOString() }
    );
    return new Response(JSON.stringify({ ok: true, claimCode, status: "released" }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Database error", detail: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
