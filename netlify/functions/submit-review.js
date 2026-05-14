// netlify/functions/submit-review.js
// Saves a verified review to Supabase after item is released

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabaseFetch(table, params) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
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
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 }); }

  const { claimCode, stationId, rating, comment } = body;
  if (!claimCode || !stationId || !rating) {
    return new Response(JSON.stringify({ error: "claimCode, stationId, and rating required" }), { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: "Rating must be 1–5" }), { status: 400 });
  }

  try {
    // Verify the reservation exists and is released
    const reservations = await supabaseFetch("reservations", {
      claim_code: `eq.${claimCode}`,
      station_id: `eq.${stationId}`,
      status: `eq.released`,
      select: "id",
    });

    if (!reservations || reservations.length === 0) {
      return new Response(JSON.stringify({ error: "No released reservation found for this claim code" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Check no duplicate review
    const existing = await supabaseFetch("reviews", {
      claim_code: `eq.${claimCode}`,
      select: "id",
    });
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Review already submitted for this check-in" }), {
        status: 409,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const review = {
      station_id: stationId,
      claim_code: claimCode,
      rating: parseInt(rating),
      comment: comment?.trim() || null,
    };

    const result = await supabaseInsert("reviews", review);
    return new Response(JSON.stringify({ ok: true, review: result[0] }), {
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
