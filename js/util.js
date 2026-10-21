export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n) => String(n).padStart(2, "0");

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday (as ISO date) of the week containing the given date. */
export function mondayOf(iso) {
  const idx = (fromISO(iso).getDay() + 6) % 7;
  return addDays(iso, -idx);
}

export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);

export function fmtDate(iso) {
  const d = fromISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDayLong(iso) {
  const d = fromISO(iso);
  return `${DAY_FULL[(d.getDay() + 6) % 7]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "am" : "pm"}`;
}

/** 90 -> "1.5", 120 -> "2", 0 -> "0" */
export function fmtHours(mins) {
  return String(Math.round(mins / 6) / 10);
}

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
