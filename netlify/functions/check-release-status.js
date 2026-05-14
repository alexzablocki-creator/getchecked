// netlify/functions/check-release-status.js
// Called when a customer returns to the station page
// Returns whether their claim code is released and whether they've already reviewed

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

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const claimCode = url.searchParams.get("claimCode");
  const stationId = url.searchParams.get("stationId");

  if (!claimCode || !stationId) {
    return new Response(JSON.stringify({ error: "claimCode and stationId required" }), { status: 400 });
  }

  try {
    // Check if reservation is released
    const reservations = await supabaseFetch("reservations", {
      claim_code: `eq.${claimCode}`,
      station_id: `eq.${stationId}`,
      status: `eq.released`,
      select: "claim_code",
    });
    const released = reservations && reservations.length > 0;

    // Check if already reviewed
    let reviewed = false;
    if (released) {
      const reviews = await supabaseFetch("reviews", {
        claim_code: `eq.${claimCode}`,
        select: "id",
      });
      reviewed = reviews && reviews.length > 0;
    }

    return new Response(JSON.stringify({ ok: true, released, reviewed }), {
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
