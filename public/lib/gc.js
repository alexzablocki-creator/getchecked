// ─── Station registry ─────────────────────────────────────────────────────────
export const STATIONS = {
  "001": {
    id: "001", name: "Rudy's Barber Shop",
    neighborhood: "Lower East Side",
    address: "147 Orchard St, New York, NY 10002",
    lat: 40.7213, lng: -73.9888,
    fee: "$5–$7", feeMin: 5, feeMax: 7,
    payment: ["cash", "venmo"],
    hours: "Mon–Sat 9AM–7PM", capacity: 8,
    cause: "LES Youth Arts Coalition", perk: "10% off any service with your stub", active: true,
  },
  "002": {
    id: "002", name: "La Paloma Bodega",
    neighborhood: "Lower East Side",
    address: "203 Ludlow St, New York, NY 10002",
    lat: 40.7221, lng: -73.9862,
    fee: "$5", feeMin: 5, feeMax: 5,
    payment: ["cash", "venmo", "paypal"],
    hours: "Daily 7AM–11PM", capacity: 6,
    cause: "Bowery Mission", perk: "Free coffee with any bag drop", active: true,
  },
  "003": {
    id: "003", name: "Essex Coffee Co.",
    neighborhood: "Lower East Side",
    address: "91 Essex St, New York, NY 10002",
    lat: 40.7196, lng: -73.9877,
    fee: "$6", feeMin: 6, feeMax: 6,
    payment: ["venmo", "paypal"],
    hours: "Mon–Fri 7AM–4PM, Sat–Sun 8AM–5PM", capacity: 5,
    cause: "Lower East Side Girls Club", perk: null, active: true,
  },
  "004": {
    id: "004", name: "Grand St. Laundry",
    neighborhood: "Lower East Side",
    address: "318 Grand St, New York, NY 10002",
    lat: 40.7184, lng: -73.9872,
    fee: "$4", feeMin: 4, feeMax: 4,
    payment: ["cash"],
    hours: "Daily 8AM–9PM", capacity: 10,
    cause: "Henry Street Settlement", perk: null, active: true,
  },
  "005": {
    id: "005", name: "Delancey Print Shop",
    neighborhood: "Lower East Side",
    address: "27 Delancey St, New York, NY 10002",
    lat: 40.7189, lng: -73.9905,
    fee: "$5", feeMin: 5, feeMax: 5,
    payment: ["venmo", "stripe"],
    hours: "Mon–Fri 9AM–6PM", capacity: 4,
    cause: "Educational Alliance", perk: "Free print with any bag drop", active: true,
  },
  "006": {
    id: "006", name: "Barber Shop Levi",
    neighborhood: "Financial District",
    address: "11 Broadway at Battery Place, New York, NY 10004",
    lat: 40.7066, lng: -74.0138,
    fee: "$5–$7", feeMin: 5, feeMax: 7,
    payment: ["cash", "venmo"],
    hours: "Mon–Sat 9AM–7PM", capacity: 8,
    cause: null, perk: "20% off your next cut with your stub", active: true,
  },
};

// ─── Claim code ───────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateClaimCode() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

// ─── Payment badges ───────────────────────────────────────────────────────────
const PAY_LABELS = {
  cash:   { label: "Cash",   cls: "badge-green" },
  venmo:  { label: "Venmo",  cls: "badge-blue"  },
  paypal: { label: "PayPal", cls: "badge-gray"  },
  stripe: { label: "Stripe", cls: "badge-yellow"},
  zelle:  { label: "Zelle",  cls: "badge-gray"  },
};
export function paymentBadges(methods) {
  return methods.map(m => {
    const p = PAY_LABELS[m] || { label: m, cls: "badge-gray" };
    return `<span class="badge ${p.cls}">${p.label}</span>`;
  }).join(" ");
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
export function nowDisplay() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
export function dateDisplay() {
  return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Local storage helpers ────────────────────────────────────────────────────
export function saveReservation(r) {
  const all = getReservations(); all.push(r);
  localStorage.setItem("gc_reservations", JSON.stringify(all)); return r;
}
export function getReservations() {
  try { return JSON.parse(localStorage.getItem("gc_reservations") || "[]"); } catch { return []; }
}
export function getActiveChecks(stationId) {
  return getReservations().filter(r => r.stationId === stationId && r.status === "checked_in");
}
export function updateReservationStatus(claimCode, status) {
  const all = getReservations().map(r =>
    r.claimCode === claimCode ? { ...r, status, updatedAt: new Date().toISOString() } : r
  );
  localStorage.setItem("gc_reservations", JSON.stringify(all));
}

// ─── Nav component ────────────────────────────────────────────────────────────
export function renderNav(activePage = "") {
  return `
  <nav class="nav">
    <a href="/" class="stub-logo" aria-label="GetChecked home">
      <div class="stub-icon">
        <div class="stub-icon-left">
          <span>GET<br>CHECKED</span>
          <small>New York, NY</small>
        </div>
        <div class="stub-icon-perf">
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </div>
        <div class="stub-icon-right"><span>01</span></div>
      </div>
      <span class="stub-wordmark">Get Checked</span>
    </a>
    <div class="nav-links">
      <a href="/nyc" class="nav-link ${activePage === "map" ? "active" : ""}">Find a station</a>
      <a href="/partner" class="nav-link ${activePage === "partner" ? "active" : ""}">For businesses</a>
      <a href="/perks" class="nav-link ${activePage === "perks" ? "active" : ""}" style="color:var(--yellow)">🎁 Perks</a>
      <a href="/faq" class="nav-link ${activePage === "faq" ? "active" : ""}">FAQ</a>
      <a href="/cities/miami" class="nav-link" style="color:#008F9A" title="Miami — Coming Soon">MIA</a>
      <a href="/cities/la" class="nav-link" style="color:#FFB400" title="Los Angeles — Coming Soon">LA</a>
      <a href="/" class="btn btn-primary" style="padding:8px 16px;font-size:12px">Check in</a>
    </div>
  </nav>`;
}

// ─── Footer component ─────────────────────────────────────────────────────────
export function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="footer-left">
      <div class="footer-brand">getchecked.co — New York, NY</div>
      <div class="footer-tag">Secure storage. So you can enjoy New York.</div>
    </div>
    <div class="footer-links">
      <a href="/nyc" class="footer-link">Find a station</a>
      <a href="/partner" class="footer-link">For businesses</a>
      <a href="/faq" class="footer-link">FAQ</a>
    </div>
    <div class="brand-seal" aria-label="Check in. Confidence out.">
      <div class="brand-seal-text">CHECK IN</div>
      <div class="brand-seal-icon">🔒</div>
      <div class="brand-seal-text">CONFIDENCE OUT</div>
    </div>
  </footer>`;
}

// ─── Ticker component ─────────────────────────────────────────────────────────
export function renderTicker() {
  const items = [
    "Coat check done right",
    "Drop your bags — own the city",
    "5% of every check goes to your neighborhood",
    "No app download required",
    "Pay direct to the shop",
    "LES + FiDi pilot — 6 stations open",
    "Check in. Confidence out.",
  ];
  const doubled = [...items, ...items];
  const html = doubled.map(i =>
    `<span class="ticker-item"><span class="ticker-dot"></span>${i}</span>`
  ).join("");
  return `<div class="ticker" aria-hidden="true"><div class="ticker-inner">${html}</div></div>`;
}
