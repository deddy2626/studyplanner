import { addDays, clamp, todayISO, uid } from "./util.js";

const KEY = "petal.v1";

export const COLORS = ["pink", "lav", "mint", "peach", "sky"];
export const colorVar = (id) => `var(--c-${COLORS.includes(id) ? id : "pink"})`;

const defaults = () => ({
  subjects: [], // { id, name, color, exam: "YYYY-MM-DD" | "", topics: [{ id, title, done }] }
  tasks: [], //    { id, subjectId, title, mins, date, time, done }
  sessions: [], // { id, subjectId | "", date, mins }   (focus timer logs)
  settings: { weeklyGoalMins: 12 * 60, focusMins: 25, theme: "system" },
});

function normalize(data) {
  const base = defaults();
  const d = data && typeof data === "object" ? data : {};
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    subjects: arr(d.subjects).map((s) => ({
      id: String(s.id ?? uid()),
      name: String(s.name ?? "Untitled").slice(0, 40),
      color: COLORS.includes(s.color) ? s.color : "pink",
      exam: typeof s.exam === "string" ? s.exam : "",
      topics: arr(s.topics).map((t) => ({ id: String(t.id ?? uid()), title: String(t.title ?? "").slice(0, 120), done: !!t.done })),
    })),
    tasks: arr(d.tasks).map((t) => ({
      id: String(t.id ?? uid()),
      subjectId: String(t.subjectId ?? ""),
      title: String(t.title ?? "").slice(0, 120),
      mins: clamp(Number(t.mins) || 45, 5, 600),
      date: typeof t.date === "string" ? t.date : todayISO(),
      time: typeof t.time === "string" ? t.time : "17:00",
      done: !!t.done,
    })),
    sessions: arr(d.sessions).map((s) => ({
      id: String(s.id ?? uid()),
      subjectId: String(s.subjectId ?? ""),
      date: typeof s.date === "string" ? s.date : todayISO(),
      mins: clamp(Number(s.mins) || 0, 0, 600),
    })),
    settings: {
      weeklyGoalMins: clamp(Number(d.settings?.weeklyGoalMins) || base.settings.weeklyGoalMins, 60, 6000),
      focusMins: clamp(Number(d.settings?.focusMins) || base.settings.focusMins, 5, 120),
      theme: ["system", "light", "dark"].includes(d.settings?.theme) ? d.settings.theme : "system",
    },
  };
}

let state = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return defaults();
})();

const listeners = new Set();
export const getState = () => state;
export const subscribe = (fn) => listeners.add(fn);

function commit(mutate) {
  mutate(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore: app keeps working in memory */
  }
  listeners.forEach((fn) => fn());
}

/* ---------- reads ---------- */

export const getSubject = (id) => state.subjects.find((s) => s.id === id);
export const getTask = (id) => state.tasks.find((t) => t.id === id);
export const tasksOn = (date) => state.tasks.filter((t) => t.date === date).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

export function minutesOn(date) {
  const fromTasks = state.tasks.filter((t) => t.date === date && t.done).reduce((a, t) => a + t.mins, 0);
  const fromTimer = state.sessions.filter((s) => s.date === date).reduce((a, s) => a + s.mins, 0);
  return fromTasks + fromTimer;
}

/** Minutes studied per subjectId ("" = general) between two dates inclusive. */
export function minutesBySubject(from, to) {
  const out = new Map();
  const add = (id, m) => out.set(id, (out.get(id) || 0) + m);
  state.tasks.forEach((t) => t.done && t.date >= from && t.date <= to && add(t.subjectId, t.mins));
  state.sessions.forEach((s) => s.date >= from && s.date <= to && add(s.subjectId, s.mins));
  return out;
}

export function studiedDates() {
  const set = new Set();
  state.tasks.forEach((t) => t.done && set.add(t.date));
  state.sessions.forEach((s) => s.mins > 0 && set.add(s.date));
  return set;
}

/** Consecutive days studied, ending today (or yesterday, so the streak survives until tonight). */
export function streak() {
  const set = studiedDates();
  let d = todayISO();
  if (!set.has(d)) d = addDays(d, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function longestStreak() {
  const days = [...studiedDates()].sort();
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function topicProgress(subject) {
  const total = subject.topics.length;
  const done = subject.topics.filter((t) => t.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* ---------- writes ---------- */

export function addSubject({ name, color, exam }) {
  const subject = { id: uid(), name: name.trim().slice(0, 40), color: COLORS.includes(color) ? color : "pink", exam: exam || "", topics: [] };
  commit((s) => s.subjects.push(subject));
  return subject;
}

export function updateSubject(id, patch) {
  commit((s) => {
    const sub = s.subjects.find((x) => x.id === id);
    if (!sub) return;
    if (patch.name !== undefined) sub.name = patch.name.trim().slice(0, 40);
    if (patch.color !== undefined && COLORS.includes(patch.color)) sub.color = patch.color;
    if (patch.exam !== undefined) sub.exam = patch.exam || "";
  });
}

export function deleteSubject(id) {
  commit((s) => {
    s.subjects = s.subjects.filter((x) => x.id !== id);
    s.tasks = s.tasks.filter((t) => t.subjectId !== id);
    s.sessions.forEach((x) => x.subjectId === id && (x.subjectId = ""));
  });
}

export function addTopic(subjectId, title) {
  commit((s) => s.subjects.find((x) => x.id === subjectId)?.topics.push({ id: uid(), title: title.trim().slice(0, 120), done: false }));
}

export function toggleTopic(subjectId, topicId) {
  commit((s) => {
    const t = s.subjects.find((x) => x.id === subjectId)?.topics.find((x) => x.id === topicId);
    if (t) t.done = !t.done;
  });
}

export function deleteTopic(subjectId, topicId) {
  commit((s) => {
    const sub = s.subjects.find((x) => x.id === subjectId);
    if (sub) sub.topics = sub.topics.filter((t) => t.id !== topicId);
  });
}

export function addTask({ subjectId, title, mins, date, time }) {
  commit((s) =>
    s.tasks.push({ id: uid(), subjectId, title: title.trim().slice(0, 120), mins: clamp(Number(mins) || 45, 5, 600), date: date || todayISO(), time: time || "17:00", done: false })
  );
}

export function updateTask(id, patch) {
  commit((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    if (patch.subjectId !== undefined) t.subjectId = patch.subjectId;
    if (patch.title !== undefined) t.title = patch.title.trim().slice(0, 120);
    if (patch.mins !== undefined) t.mins = clamp(Number(patch.mins) || t.mins, 5, 600);
    if (patch.date !== undefined && patch.date) t.date = patch.date;
    if (patch.time !== undefined && patch.time) t.time = patch.time;
    if (patch.done !== undefined) t.done = !!patch.done;
  });
}

export const toggleTask = (id) => updateTask(id, { done: !getTask(id)?.done });
export const deleteTask = (id) => commit((s) => (s.tasks = s.tasks.filter((t) => t.id !== id)));

export function logSession({ subjectId, mins }) {
  commit((s) => s.sessions.push({ id: uid(), subjectId: subjectId || "", date: todayISO(), mins: clamp(Math.round(mins), 1, 600) }));
}

export function setSettings(patch) {
  commit((s) => {
    s.settings = normalize({ settings: { ...s.settings, ...patch } }).settings;
  });
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json) {
  const next = normalize(JSON.parse(json));
  commit((s) => Object.assign(s, next));
}

export function resetAll() {
  commit((s) => Object.assign(s, defaults()));
}
