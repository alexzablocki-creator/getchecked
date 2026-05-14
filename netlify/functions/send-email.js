// netlify/functions/send-email.js
// Handles check-in confirmation, pickup reminder, and review request emails
// Uses Resend API for delivery

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_KEY;
const BASE_URL       = 'https://getchecked.co';

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function supabaseFetch(table, params) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function supabaseUpdate(table, match, data) {
  const params = new URLSearchParams(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`])
  );
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Claim code generator ──────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateClaimCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

// ── Payment label helper ──────────────────────────────────────────────────────
function formatPayment(methods) {
  const labels = { cash: 'Cash', venmo: 'Venmo', paypal: 'PayPal', stripe: 'Card', zelle: 'Zelle' };
  return methods.map(m => labels[m] || m).join(' / ');
}

// ── Perk HTML block ───────────────────────────────────────────────────────────
function perkBlock(perk) {
  if (!perk) return '';
  return `
  <div style="background:#141400;border:1px solid #2a2800;border-radius:6px;padding:16px;margin:0 32px 24px;">
    <div style="color:#FFD700;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">🎁 GetChecked Perk</div>
    <div style="color:#888888;font-size:13px;line-height:1.5;">Show your stub at checkout: <strong style="color:#ffffff;">${perk}</strong></div>
  </div>`;
}

// ── Send email via Resend ─────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'GetChecked <hello@getchecked.co>',
      reply_to: 'alex.zablocki@gmail.com',
      to,
      subject,
      html,
    }),
  });
  return res.json();
}

// ── Email template builder — Check-in ────────────────────────────────────────
function buildCheckinEmail(data) {
  const {
    name, claimCode, stationId, stationName, stationAddress,
    stationHours, stationPayment, itemType, itemCount, feeMin, feeMax,
    perk, cause, timeIn,
  } = data;

  const stationIdShort = parseInt(stationId).toString();
  const feeDisplay = feeMin === feeMax ? `$${feeMin}` : `$${feeMin}–$${feeMax}`;
  const totalMin = itemCount * feeMin;
  const totalMax = itemCount * feeMax;
  const totalDisplay = feeMin === feeMax ? `$${totalMin}` : `$${totalMin}–$${totalMax}`;
  const itemSummary = `${itemCount} × ${itemType}`;
  const pickupUrl = `${BASE_URL}/pickup?code=${claimCode}&station=${stationId}`;
  const causeText = cause || 'a local neighborhood cause';
  const greeting = name ? `Hi ${name},` : 'Hi there,';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your GetChecked Stub</title></head>
<body style="margin:0;padding:0;background:#f5f2ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#f5f2ea;">

  <div style="background:#111111;padding:24px 32px;">
    <span style="background:#1e1e1e;border-radius:5px;padding:8px 12px;display:inline-block;">
      <span style="color:#ffffff;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.2;letter-spacing:0.04em;">GET<br>CHECKED</span>
    </span>
    <span style="color:#ffffff;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;margin-left:12px;vertical-align:middle;">Get Checked</span>
  </div>

  <div style="background:#FFD700;padding:8px 32px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#111111;">
    Secure storage. So you can enjoy New York.
  </div>

  <div style="background:#111111;padding:32px;">
    <div style="color:#555555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;">Your check-in confirmation</div>
    <div style="color:#ffffff;font-size:36px;font-weight:900;text-transform:uppercase;line-height:0.92;margin-bottom:8px;">You're <span style="color:#FFD700;">checked.</span></div>
    <div style="color:#888888;font-size:14px;line-height:1.6;">${greeting} Show this stub to ${stationName} when you arrive. Your items are covered by GetChecked item protection.</div>
  </div>

  <!-- Stub -->
  <div style="background:#111111;padding:0 32px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ea;border-radius:6px;overflow:hidden;">
      <tr>
        <td width="100" style="background:#111111;padding:20px 14px;text-align:center;vertical-align:middle;border-right:3px dashed #f5f2ea;">
          <div style="color:#ffffff;font-size:10px;font-weight:700;text-transform:uppercase;line-height:1.2;margin-bottom:4px;">GET<br>CHECKED</div>
          <div style="color:#555555;font-size:7px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">NEW YORK, NY</div>
          <div style="color:#FFD700;font-size:36px;font-weight:900;line-height:1;">${stationIdShort}</div>
        </td>
        <td style="padding:16px 20px;vertical-align:top;">
          <div style="color:#888888;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px;">Claim check</div>
          <div style="color:#111111;font-size:32px;font-weight:900;letter-spacing:0.04em;margin-bottom:12px;">${claimCode}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding:3px 0;vertical-align:top;">
                <div style="color:#888888;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;">Station</div>
                <div style="color:#222222;font-size:12px;font-weight:700;">${stationName}</div>
              </td>
              <td width="50%" style="padding:3px 0;vertical-align:top;">
                <div style="color:#888888;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;">Time in</div>
                <div style="color:#222222;font-size:12px;font-weight:700;">${timeIn}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:3px 0;vertical-align:top;">
                <div style="color:#888888;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;">Items</div>
                <div style="color:#222222;font-size:12px;font-weight:700;">${itemSummary}</div>
              </td>
              <td style="padding:3px 0;vertical-align:top;">
                <div style="color:#888888;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;">Pay at station</div>
                <div style="color:#222222;font-size:12px;font-weight:700;">${totalDisplay}</div>
              </td>
            </tr>
          </table>
          <div style="color:#888888;font-size:10px;font-style:italic;border-top:1px solid #e2dfd6;padding-top:8px;margin-top:10px;">Keep this email. Payment handled directly with the station. GetChecked item protection applies.</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Screenshot note -->
  <div style="background:#1a1700;border:1px solid #2a2800;border-radius:6px;padding:14px 16px;margin:0 32px 24px;">
    <div style="color:#FFD700;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">📱 Save your stub</div>
    <div style="color:#888888;font-size:12px;line-height:1.5;">Screenshot the stub above as a backup. Show it to the shop owner when you arrive — no printing needed.</div>
  </div>

  ${perkBlock(perk)}

  <!-- Station details -->
  <div style="padding:20px 32px;border-top:1px solid #e2dfd6;">
    <div style="color:#111111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Station details</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;border-bottom:1px solid #e8e5dc;width:40%;">Address</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #e8e5dc;">${stationAddress}</td></tr>
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;border-bottom:1px solid #e8e5dc;">Hours</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #e8e5dc;">${stationHours}</td></tr>
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;border-bottom:1px solid #e8e5dc;">Payment</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #e8e5dc;">${stationPayment}</td></tr>
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;">Cancellations</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;">Station closed only</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      <tr>
        <td style="color:#111111;font-size:14px;font-weight:700;text-transform:uppercase;">Total due at station</td>
        <td style="color:#111111;font-size:20px;font-weight:900;text-align:right;">${totalDisplay}</td>
      </tr>
    </table>
    <div style="color:#888888;font-size:11px;margin-top:4px;">${itemCount} × ${itemType} × ${feeDisplay} per item. Pay directly to the shop.</div>
  </div>

  <!-- 5% Stub -->
  <div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:6px;padding:16px;margin:0 32px 24px;">
    <div style="color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">♥ Your check-in gives back</div>
    <div style="color:#4a8a4a;font-size:13px;line-height:1.6;">${stationName} pledges <strong style="color:#4ade80;">5% of every storage fee</strong> to ${causeText}. By checking in today, you're supporting your neighborhood. Thank you.</div>
  </div>

  <!-- Pickup button -->
  <a href="${pickupUrl}" style="display:block;background:#FFD700;color:#111111;text-decoration:none;text-align:center;padding:14px 24px;border-radius:4px;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;margin:0 32px 24px;">Ready to pick up? Tap here →</a>

  <div style="background:#111111;padding:20px 32px;text-align:center;">
    <div style="color:#444444;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;line-height:1.8;">
      getchecked.co · New York, NY<br>
      Secure storage. So you can enjoy New York.<br>
      <a href="https://getchecked.co/faq" style="color:#FFD700;text-decoration:none;">FAQ</a> · <a href="https://getchecked.co" style="color:#FFD700;text-decoration:none;">getchecked.co</a>
    </div>
  </div>
</div>
</body></html>`;
}

// ── Email template builder — Pickup ──────────────────────────────────────────
function buildPickupEmail(data) {
  const { claimCode, stationName, stationAddress, itemSummary, perk, timeIn } = data;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ready to pick up</title></head>
<body style="margin:0;padding:0;background:#f5f2ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#f5f2ea;">
  <div style="background:#111111;padding:24px 32px;">
    <span style="color:#ffffff;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;">Get Checked</span>
  </div>
  <div style="background:#FFD700;padding:8px 32px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#111111;">Ready to pick up your items</div>
  <div style="background:#111111;padding:32px;">
    <div style="color:#555555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;">Pick-up confirmation</div>
    <div style="color:#ffffff;font-size:36px;font-weight:900;text-transform:uppercase;line-height:0.92;margin-bottom:8px;">Show this to<br><span style="color:#FFD700;">${stationName}</span></div>
    <div style="color:#888888;font-size:14px;line-height:1.6;">Walk in and show your claim code below. The shop owner will release your items from their dashboard.</div>
  </div>
  <div style="background:#111;border:2px solid #FFD700;border-radius:8px;padding:24px 32px;margin:24px 32px;text-align:center;">
    <div style="color:#555555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;">Your claim code</div>
    <div style="color:#FFD700;font-size:52px;font-weight:900;letter-spacing:0.06em;line-height:1;margin-bottom:8px;">${claimCode}</div>
    <div style="color:#888888;font-size:12px;">Show this screen to the shop owner</div>
  </div>
  <div style="background:#FFD700;border-radius:6px;padding:16px 24px;margin:0 32px 24px;text-align:center;">
    <div style="color:#111111;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">👆 Show this to the owner to release your items</div>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #e2dfd6;">
    <div style="color:#111111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Your check-in details</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;border-bottom:1px solid #e8e5dc;width:40%;">Station</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #e8e5dc;">${stationName}</td></tr>
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;border-bottom:1px solid #e8e5dc;">Address</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #e8e5dc;">${stationAddress}</td></tr>
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;border-bottom:1px solid #e8e5dc;">Items</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #e8e5dc;">${itemSummary}</td></tr>
      <tr><td style="color:#888888;font-size:12px;padding:7px 0;">Checked in</td><td style="color:#111111;font-size:12px;font-weight:600;text-align:right;padding:7px 0;">${timeIn}</td></tr>
    </table>
  </div>
  ${perkBlock(perk)}
  <div style="background:#111111;padding:20px 32px;text-align:center;">
    <div style="color:#444444;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;line-height:1.8;">
      getchecked.co · New York, NY<br>
      <a href="https://getchecked.co" style="color:#FFD700;text-decoration:none;">getchecked.co</a>
    </div>
  </div>
</div>
</body></html>`;
}

// ── Email template builder — Review ──────────────────────────────────────────
function buildReviewEmail(data) {
  const { claimCode, stationName, perk, cause } = data;
  const reviewUrl = `${BASE_URL}/review?code=${claimCode}`;
  const causeText = cause || 'a local neighborhood cause';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>How was your experience?</title></head>
<body style="margin:0;padding:0;background:#f5f2ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#f5f2ea;">
  <div style="background:#111111;padding:24px 32px;">
    <span style="color:#ffffff;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;">Get Checked</span>
  </div>
  <div style="background:#4ade80;padding:8px 32px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#0a2010;">✓ Items released — you're all set</div>
  <div style="background:#111111;padding:32px;">
    <div style="color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;">Check-in complete</div>
    <div style="color:#ffffff;font-size:36px;font-weight:900;text-transform:uppercase;line-height:0.92;margin-bottom:8px;">How was<br><span style="color:#4ade80;">${stationName}?</span></div>
    <div style="color:#888888;font-size:14px;line-height:1.6;">Your items have been released. It takes 30 seconds to leave a review — and it helps other travelers find great stations.</div>
  </div>
  <div style="background:#0a2010;border:1px solid #1a4020;border-radius:8px;padding:20px 24px;margin:24px 32px;text-align:center;">
    <div style="font-size:36px;margin-bottom:8px;">✓</div>
    <div style="color:#4ade80;font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Items released</div>
    <div style="color:#4a8a4a;font-size:13px;">Claim code ${claimCode} · ${stationName}</div>
  </div>
  <div style="text-align:center;color:#888888;font-size:20px;margin-bottom:4px;letter-spacing:4px;">★★★★★</div>
  <div style="text-align:center;color:#888888;font-size:12px;margin-bottom:24px;">Tap below to leave your rating</div>
  <a href="${reviewUrl}" style="display:block;background:#FFD700;color:#111111;text-decoration:none;text-align:center;padding:16px 24px;border-radius:4px;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;margin:0 32px 24px;">Leave a review →</a>
  ${perkBlock(perk)}
  <div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:6px;padding:16px;margin:0 32px 24px;">
    <div style="color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">♥ Your check-in made an impact</div>
    <div style="color:#4a8a4a;font-size:13px;line-height:1.6;">${stationName} pledged <strong style="color:#4ade80;">5% of today's storage fee</strong> to ${causeText}. Every GetChecked check-in supports the neighborhood. Thank you for being part of it.</div>
  </div>
  <div style="background:#111111;padding:20px 32px;text-align:center;">
    <div style="color:#444444;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;line-height:1.8;">
      getchecked.co · New York, NY<br>
      <a href="https://getchecked.co" style="color:#FFD700;text-decoration:none;">getchecked.co</a>
    </div>
  </div>
</div>
</body></html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const { type } = body;

  try {
    // ── CHECK-IN EMAIL ──────────────────────────────────────────────────────
    if (type === 'checkin') {
      const {
        name, email, stationId, stationName, stationAddress,
        stationHours, stationPayment, itemType, itemCount,
        feeMin, feeMax, perk, cause,
      } = body;

      if (!email || !stationId) {
        return new Response(JSON.stringify({ error: 'email and stationId required' }), { status: 400 });
      }

      const claimCode = generateClaimCode();
      const timeIn = new Date().toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });

      // Save to Supabase
      await supabaseInsert('reservations', {
        claim_code: claimCode,
        station_id: stationId,
        station_name: stationName,
        item: `${itemCount} × ${itemType}`,
        status: 'checked_in',
        fee_min: feeMin,
        checked_in_at: new Date().toISOString(),
        customer_email: email,
        customer_name: name || null,
      });

      // Send email
      const html = buildCheckinEmail({
        name, claimCode, stationId, stationName, stationAddress,
        stationHours, stationPayment: formatPayment(stationPayment || []),
        itemType, itemCount, feeMin, feeMax,
        perk, cause, timeIn,
      });

      await sendEmail({
        to: email,
        subject: `Your GetChecked stub — ${claimCode}`,
        html,
      });

      return new Response(JSON.stringify({ ok: true, claimCode }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── PICKUP EMAIL ────────────────────────────────────────────────────────
    if (type === 'pickup') {
      const { claimCode, stationId } = body;
      if (!claimCode || !stationId) {
        return new Response(JSON.stringify({ error: 'claimCode and stationId required' }), { status: 400 });
      }

      // Fetch reservation
      const rows = await supabaseFetch('reservations', {
        claim_code: `eq.${claimCode}`,
        station_id: `eq.${stationId}`,
        select: '*',
      });

      if (!rows || rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Reservation not found' }), { status: 404 });
      }

      const r = rows[0];
      if (!r.customer_email) {
        return new Response(JSON.stringify({ error: 'No email on record' }), { status: 400 });
      }

      const html = buildPickupEmail({
        claimCode,
        stationName: r.station_name,
        stationAddress: body.stationAddress || '',
        itemSummary: r.item,
        perk: body.perk || null,
        timeIn: new Date(r.checked_in_at).toLocaleString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }),
      });

      await sendEmail({
        to: r.customer_email,
        subject: `Pick up your items — ${claimCode}`,
        html,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── RELEASE + REVIEW EMAIL ──────────────────────────────────────────────
    if (type === 'release') {
      const { claimCode, stationId } = body;
      if (!claimCode || !stationId) {
        return new Response(JSON.stringify({ error: 'claimCode and stationId required' }), { status: 400 });
      }

      // Fetch and update reservation
      const rows = await supabaseFetch('reservations', {
        claim_code: `eq.${claimCode}`,
        station_id: `eq.${stationId}`,
        select: '*',
      });

      if (!rows || rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Reservation not found' }), { status: 404 });
      }

      const r = rows[0];

      // Update status
      await supabaseUpdate('reservations', { claim_code: claimCode }, {
        status: 'released',
        released_at: new Date().toISOString(),
      });

      // Send review email if we have their email
      if (r.customer_email) {
        const html = buildReviewEmail({
          claimCode,
          stationName: r.station_name,
          perk: body.perk || null,
          cause: body.cause || null,
        });

        await sendEmail({
          to: r.customer_email,
          subject: `How was ${r.station_name}? Leave a quick review`,
          html,
        });
      }

      return new Response(JSON.stringify({ ok: true, claimCode, status: 'released' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400 });

  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: 'Server error', detail: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
