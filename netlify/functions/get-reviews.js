// netlify/functions/get-reviews.js
// Returns reviews and average rating for a station

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const stationId = url.searchParams.get("stationId");

  if (!stationId) {
    return new Response(JSON.stringify({ error: "stationId required" }), { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?station_id=eq.${stationId}&order=created_at.desc&limit=20&select=rating,comment,created_at`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const reviews = await res.json();

    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    return new Response(JSON.stringify({ ok: true, reviews, average: avg, count: reviews.length }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=60",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Database error", detail: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
