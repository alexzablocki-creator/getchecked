// netlify/functions/create-reservation.js
// Creates a reservation in Supabase and returns a claim code

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateClaimCode() {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
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
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

  const { stationId, stationName, item, feeMin } = body;
  if (!stationId) {
    return new Response(JSON.stringify({ error: "stationId required" }), { status: 400 });
  }

  const claimCode = generateClaimCode();
  const reservation = {
    claim_code: claimCode,
    station_id: stationId,
    station_name: stationName || "Station " + stationId,
    item: item || "Bag / Luggage",
    status: "checked_in",
    fee_min: feeMin || null,
    checked_in_at: new Date().toISOString(),
  };

  try {
    const result = await supabaseInsert("reservations", reservation);
    return new Response(JSON.stringify({ ok: true, claimCode, reservation: result[0] }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Database error", detail: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
