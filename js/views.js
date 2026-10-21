import { DAY_FULL, DAY_SHORT, addDays, daysBetween, esc, fmtDate, fmtDayLong, fmtHours, fmtTime, fromISO, mondayOf, todayISO } from "./util.js";
import * as S from "./store.js";

const ICONS = {
  today: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  week: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  subjects: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
  stats: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
};
export const NAV = { today: "Today", week: "Week", subjects: "Subjects", stats: "Progress", settings: "Settings" };

export function navHtml(view) {
  return Object.keys(NAV)
    .map(
      (k) =>
        `<button class="tab" type="button" data-action="nav" data-view="${k}"${view === k ? ' aria-current="page"' : ""}>` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>${NAV[k]}</button>`
    )
    .join("");
}

const themeBtn = '<button class="pill-btn" type="button" data-action="theme">Light / dark</button>';
const head = (title, sub, extra = "") => `<div class="head"><div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${extra}${themeBtn}</div></div>`;

const subjectName = (id) => S.getSubject(id)?.name ?? "General";
const subjectColor = (id) => S.colorVar(S.getSubject(id)?.color);

function ring(pct) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    `<div class="ring"><svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--line)" stroke-width="11"/>` +
    `<circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--accent)" stroke-width="11" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>` +
    `<div class="num">${pct}%</div></div>`
  );
}

function taskItem(t, { showDate = false } = {}) {
  return (
    `<li class="task${t.done ? " done" : ""}">` +
    `<button class="check" type="button" data-action="toggle-task" data-id="${esc(t.id)}" aria-pressed="${t.done}" aria-label="${t.done ? "Mark not done" : "Mark done"}: ${esc(t.title)}">` +
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
    `<button class="task-main" type="button" data-action="edit-task" data-id="${esc(t.id)}"><span class="title">${esc(t.title)}</span>` +
    `<span class="meta"><span class="tag" style="background:${subjectColor(t.subjectId)}">${esc(subjectName(t.subjectId))}</span> ${showDate ? fmtDate(t.date) + " · " : ""}${fmtTime(t.time)} · ${t.mins} min</span></button></li>`
  );
}

/* ---------- Today ---------- */

function welcome() {
  return (
    head("Welcome", "Let's set up your study space") +
    '<section class="card welcome"><h2>Start with your subjects</h2>' +
    "<p>Add the subjects you are studying and their exam dates. Then plan study blocks for each day and tick them off as you go.</p>" +
    '<div class="btns"><button class="btn" type="button" data-action="add-subject">Add your first subject</button></div></section>'
  );
}

export function todayView(timer) {
  const st = S.getState();
  if (!st.subjects.length) return welcome();
  const today = todayISO();
  const list = S.tasksOn(today);
  const done = list.filter((t) => t.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const left = list.filter((t) => !t.done).reduce((a, t) => a + t.mins, 0);
  const weekStart = mondayOf(today);
  let weekMins = 0;
  for (let i = 0; i < 7; i++) weekMins += S.minutesOn(addDays(weekStart, i));
  const missed = st.tasks.filter((t) => !t.done && t.date < today && t.date >= addDays(today, -7)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const exams = st.subjects
    .filter((s) => s.exam && s.exam >= today)
    .sort((a, b) => (a.exam < b.exam ? -1 : 1))
    .slice(0, 3);

  const subline = !list.length ? "Nothing planned yet" : done === list.length ? "Everything done. Time to rest." : `${done} of ${list.length} blocks done, ${fmtHours(left)} h to go`;
  const headline = !list.length ? "A fresh day" : pct >= 100 ? "All done today!" : pct >= 50 ? "More than halfway there" : "Let's get started";

  return (
    head(fmtDayLong(today), esc(subline)) +
    `<section class="card hero">${ring(pct)}<div><h2>${headline}</h2><p>Small steps, every day.</p>` +
    `<div class="chips"><span class="chip">${S.streak()} day streak</span><span class="chip">${fmtHours(weekMins)} / ${fmtHours(st.settings.weeklyGoalMins)} h this week</span></div></div></section>` +
    '<div class="grid-2"><div class="stack">' +
    `<section class="card"><div class="card-head"><h2>Today's plan</h2><button class="pill-btn" type="button" data-action="add-task" data-date="${today}">+ Block</button></div>` +
    (list.length ? `<ul class="tasks">${list.map((t) => taskItem(t)).join("")}</ul>` : '<div class="empty">No blocks yet. Add one to plan your day.</div>') +
    "</section>" +
    (missed.length
      ? `<section class="card"><h2>Missed this week</h2><ul class="tasks">${missed
          .map((t) => taskItem(t, { showDate: true }).replace("</li>", `<button class="pill-btn" type="button" data-action="move-today" data-id="${esc(t.id)}">Move to today</button></li>`))
          .join("")}</ul></section>`
      : "") +
    '</div><div class="stack">' +
    timerCard(timer, st) +
    `<section class="card"><h2>Upcoming exams</h2>${
      exams.length
        ? `<div class="exams">${exams
            .map((s) => {
              const n = daysBetween(today, s.exam);
              return `<div class="exam"><div class="days" style="background:${S.colorVar(s.color)}"><div>${n}<small>${n === 1 ? "day" : "days"}</small></div></div><div><b>${esc(s.name)}</b><span>${fmtDate(s.exam)} · ${S.topicProgress(s).done}/${S.topicProgress(s).total} topics</span></div></div>`;
            })
            .join("")}</div>`
        : '<div class="empty">Add exam dates to your subjects to see a countdown.</div>'
    }</section></div></div>`
  );
}

export function timerText(left) {
  const s = Math.max(0, Math.ceil(left / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function timerCard(timer, st) {
  const opts = ['<option value="">General</option>']
    .concat(st.subjects.map((s) => `<option value="${esc(s.id)}"${timer.subjectId === s.id ? " selected" : ""}>${esc(s.name)}</option>`))
    .join("");
  return (
    '<section class="card timer"><h2>Focus timer</h2>' +
    `<div class="time" id="timeText">${timerText(timer.running ? timer.endAt - Date.now() : timer.leftMs)}</div>` +
    `<label class="field inline" for="timerSubject">Studying<select id="timerSubject" data-change="timer-subject">${opts}</select></label>` +
    `<div class="btns"><button class="btn" type="button" data-action="timer-toggle">${timer.running ? "Pause" : timer.leftMs < timer.totalMs ? "Resume" : "Start"}</button>` +
    '<button class="btn ghost" type="button" data-action="timer-done">Finish</button></div>' +
    '<p class="hint">Finished sessions count towards your daily streak and weekly goal.</p></section>'
  );
}

/* ---------- Week ---------- */

export function weekView(weekStart) {
  const today = todayISO();
  const end = addDays(weekStart, 6);
  const label = `${fmtDate(weekStart)} to ${fmtDate(end)}`;
  const cols = DAY_SHORT.map((name, i) => {
    const date = addDays(weekStart, i);
    const list = S.tasksOn(date);
    const mins = list.reduce((a, t) => a + t.mins, 0);
    return (
      `<div class="day${date === today ? " today" : ""}" data-date="${date}"><h3>${name} ${fromISO(date).getDate()}<span>${mins ? fmtHours(mins) + " h" : ""}</span></h3>` +
      list
        .map(
          (t) =>
            `<div class="block${t.done ? " done" : ""}" draggable="true" data-id="${esc(t.id)}" style="background:${subjectColor(t.subjectId)}">` +
            `<button class="block-check" type="button" data-action="toggle-task" data-id="${esc(t.id)}" aria-pressed="${t.done}" aria-label="${t.done ? "Mark not done" : "Mark done"}: ${esc(t.title)}"></button>` +
            `<button class="block-main" type="button" data-action="edit-task" data-id="${esc(t.id)}">${esc(t.title)}<small>${fmtTime(t.time)} · ${t.mins} min</small></button></div>`
        )
        .join("") +
      `<button class="add-slot" type="button" data-action="add-task" data-date="${date}" aria-label="Add a block on ${DAY_FULL[i]}">+</button></div>`
    );
  }).join("");
  const nav =
    '<div class="wk-nav"><button class="pill-btn" type="button" data-action="week-prev" aria-label="Previous week">&larr;</button>' +
    '<button class="pill-btn" type="button" data-action="week-today">This week</button>' +
    '<button class="pill-btn" type="button" data-action="week-next" aria-label="Next week">&rarr;</button></div>';
  return head(label, "Drag a block to another day, or tap it to edit.", nav) + `<div class="week">${cols}</div>`;
}

/* ---------- Subjects ---------- */

export function subjectsView() {
  const today = todayISO();
  const subs = S.getState().subjects.slice().sort((a, b) => (a.exam || "9999") < (b.exam || "9999") ? -1 : 1);
  if (!subs.length) {
    return head("Subjects", "Nothing here yet", '<button class="btn" type="button" data-action="add-subject">+ Subject</button>') + '<section class="card"><div class="empty">Add your first subject to start planning.</div></section>';
  }
  return (
    head("Subjects", `${subs.length} subject${subs.length === 1 ? "" : "s"}, nearest exam first`, '<button class="btn" type="button" data-action="add-subject">+ Subject</button>') +
    '<div class="subjects">' +
    subs
      .map((s) => {
        const p = S.topicProgress(s);
        const exam = s.exam ? `Exam ${fmtDate(s.exam)}${s.exam >= today ? ` · in ${daysBetween(today, s.exam)} days` : " · passed"}` : "No exam date";
        return (
          `<button class="card subj" type="button" data-action="open-subject" data-id="${esc(s.id)}"><div class="top"><div class="dot" style="background:${S.colorVar(s.color)}"></div>` +
          `<div class="grow"><h2>${esc(s.name)}</h2><span class="hint">${exam}</span></div></div>` +
          `<div class="bar" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(s.name)} topics done"><i style="width:${p.pct}%;background:${S.colorVar(s.color)}"></i></div>` +
          `<div class="row"><span>${p.total ? `${p.done} of ${p.total} topics` : "No topics yet"}</span><span>${p.total ? p.pct + "%" : ""}</span></div></button>`
        );
      })
      .join("") +
    "</div>"
  );
}

export function subjectDetail(id) {
  const s = S.getSubject(id);
  if (!s) return subjectsView();
  const today = todayISO();
  const p = S.topicProgress(s);
  const upcoming = S.getState().tasks.filter((t) => t.subjectId === id && !t.done && t.date >= today).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)).slice(0, 5);
  const exam = s.exam ? `Exam ${fmtDate(s.exam)}${s.exam >= today ? ` · in ${daysBetween(today, s.exam)} days` : " · passed"}` : "No exam date";
  return (
    head(esc(s.name), exam, '<button class="pill-btn" type="button" data-action="back-subjects">&larr; All subjects</button><button class="pill-btn" type="button" data-action="edit-subject" data-id="' + esc(s.id) + '">Edit</button>') +
    '<div class="grid-2"><section class="card"><h2>Topics</h2>' +
    `<div class="bar"><i style="width:${p.pct}%;background:${S.colorVar(s.color)}"></i></div><div class="row spaced"><span>${p.done} of ${p.total} done</span><span>${p.pct}%</span></div>` +
    (s.topics.length
      ? `<ul class="tasks">${s.topics
          .map(
            (t) =>
              `<li class="task${t.done ? " done" : ""}"><button class="check" type="button" data-action="toggle-topic" data-id="${esc(s.id)}" data-topic="${esc(t.id)}" aria-pressed="${t.done}" aria-label="${t.done ? "Mark not done" : "Mark done"}: ${esc(t.title)}">` +
              '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
              `<div class="task-main static"><span class="title">${esc(t.title)}</span></div>` +
              `<button class="icon-btn" type="button" data-action="delete-topic" data-id="${esc(s.id)}" data-topic="${esc(t.id)}" aria-label="Remove ${esc(t.title)}">&times;</button></li>`
          )
          .join("")}</ul>`
      : '<div class="empty">Break the subject into topics, like chapters or lectures.</div>') +
    '<form class="inline-form" id="topicForm" data-id="' + esc(s.id) + '"><label class="sr" for="topicTitle">New topic</label><input id="topicTitle" name="title" maxlength="120" placeholder="Add a topic, e.g. Chapter 3" required><button class="btn" type="submit">Add</button></form></section>' +
    `<section class="card"><div class="card-head"><h2>Coming up</h2><button class="pill-btn" type="button" data-action="add-task" data-subject="${esc(s.id)}" data-date="${today}">+ Block</button></div>` +
    (upcoming.length ? `<ul class="tasks">${upcoming.map((t) => taskItem(t, { showDate: true })).join("")}</ul>` : '<div class="empty">No study blocks planned for this subject.</div>') +
    "</section></div>"
  );
}

/* ---------- Progress ---------- */

export function statsView() {
  const st = S.getState();
  const today = todayISO();
  const ws = mondayOf(today);
  const per = DAY_SHORT.map((_, i) => S.minutesOn(addDays(ws, i)));
  const total = per.reduce((a, b) => a + b, 0);
  const goal = st.settings.weeklyGoalMins;
  const pct = Math.min(100, Math.round((total / goal) * 100));
  const max = Math.max(...per, 60);
  const by = [...S.minutesBySubject(ws, addDays(ws, 6)).entries()].filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  const sum = by.reduce((a, [, m]) => a + m, 0) || 1;
  const todayIdx = (fromISO(today).getDay() + 6) % 7;
  return (
    head("Progress", "This week at a glance") +
    `<section class="card goal"><h2>Weekly goal</h2><div class="bar big"><i style="width:${pct}%;background:var(--accent)"></i></div><div class="row"><span>${fmtHours(total)} h studied</span><span>Goal ${fmtHours(goal)} h</span></div></section>` +
    '<div class="grid-2"><section class="card"><h2>Hours per day</h2><div class="bars">' +
    per.map((m, i) => `<div class="col${i === todayIdx ? " today" : ""}"><b>${fmtHours(m)}</b><i style="height:${Math.max(3, Math.round((m / max) * 120))}px"></i>${DAY_SHORT[i]}</div>`).join("") +
    '</div></section><section class="card"><h2>By subject</h2>' +
    (by.length
      ? `<div class="share">${by
          .map(([id, m]) => `<div><div class="row dark"><span>${esc(subjectName(id))}</span><span>${fmtHours(m)} h</span></div><div class="bar"><i style="width:${Math.round((m / sum) * 100)}%;background:${subjectColor(id)}"></i></div></div>`)
          .join("")}</div>`
      : '<div class="empty">Tick off a block or finish a focus session to see this.</div>') +
    `</section></div><div class="chips"><span class="chip">${S.streak()} day streak</span><span class="chip">Longest: ${S.longestStreak()} days</span></div>`
  );
}

/* ---------- Settings ---------- */

export function settingsView(resetArmed) {
  const { settings } = S.getState();
  return (
    head("Settings", "Everything is saved in this browser") +
    '<section class="card form-card"><h2>Study goals</h2>' +
    `<form id="settingsForm"><div class="two"><label class="field" for="sGoal">Weekly goal (hours)<input id="sGoal" name="goal" type="number" min="1" max="100" step="0.5" value="${settings.weeklyGoalMins / 60}"></label>` +
    `<label class="field" for="sFocus">Focus session (minutes)<input id="sFocus" name="focus" type="number" min="5" max="120" step="5" value="${settings.focusMins}"></label></div>` +
    '<label class="field" for="sTheme">Appearance<select id="sTheme" name="theme">' +
    ["system", "light", "dark"].map((t) => `<option value="${t}"${settings.theme === t ? " selected" : ""}>${t[0].toUpperCase() + t.slice(1)}</option>`).join("") +
    '</select></label><div class="btns"><button class="btn" type="submit">Save</button></div></form></section>' +
    '<section class="card"><h2>Your data</h2><p class="hint">Download a backup file, or move your plan to another device by importing it there.</p>' +
    '<div class="btns wrap"><button class="btn ghost" type="button" data-action="export">Download backup</button>' +
    '<label class="btn ghost file" for="importFile">Import backup<input id="importFile" type="file" accept="application/json,.json" data-change="import"></label>' +
    `<button class="btn danger" type="button" data-action="${resetArmed ? "reset-confirm" : "reset-ask"}">${resetArmed ? "Tap again to erase everything" : "Erase all data"}</button></div></section>`
  );
}

/* ---------- Modals ---------- */

const modal = (title, body) =>
  `<div class="scrim" data-action="close-modal-bg"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">${title}</h2>${body}</div></div>`;

export function taskModal(task, defaults = {}) {
  const subs = S.getState().subjects;
  const sel = task?.subjectId ?? defaults.subjectId ?? subs[0]?.id;
  const t = task ?? { title: "", mins: 45, date: defaults.date ?? todayISO(), time: "17:00", done: false };
  return modal(
    task ? "Edit study block" : "New study block",
    `<form id="taskForm" data-id="${esc(task?.id ?? "")}">` +
      `<label class="field" for="fSubject">Subject<select id="fSubject" name="subjectId">${subs.map((s) => `<option value="${esc(s.id)}"${s.id === sel ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>` +
      `<label class="field" for="fTitle">What will you study?<input id="fTitle" name="title" maxlength="120" placeholder="e.g. Chapter 7 practice problems" value="${esc(t.title)}" required></label>` +
      `<div class="two"><label class="field" for="fDate">Day<input id="fDate" name="date" type="date" value="${esc(t.date)}" required></label>` +
      `<label class="field" for="fTime">Start time<input id="fTime" name="time" type="time" value="${esc(t.time)}" required></label></div>` +
      `<label class="field" for="fMins">Minutes<input id="fMins" name="mins" type="number" min="5" max="600" step="5" value="${t.mins}" required></label>` +
      (task ? `<label class="check-row" for="fDone"><input id="fDone" name="done" type="checkbox"${t.done ? " checked" : ""}> Done</label>` : "") +
      '<div class="btns end">' +
      (task ? `<button class="btn danger left" type="button" data-action="delete-task" data-id="${esc(task.id)}">Delete</button>` : "") +
      '<button class="btn ghost" type="button" data-action="close-modal">Cancel</button><button class="btn" type="submit">Save</button></div></form>'
  );
}

export function subjectModal(subject, deleteArmed) {
  const s = subject ?? { name: "", color: "pink", exam: "" };
  return modal(
    subject ? "Edit subject" : "New subject",
    `<form id="subjectForm" data-id="${esc(subject?.id ?? "")}">` +
      `<label class="field" for="sName">Name<input id="sName" name="name" maxlength="40" placeholder="e.g. Organic Chemistry" value="${esc(s.name)}" required></label>` +
      `<label class="field" for="sExam">Exam date (optional)<input id="sExam" name="exam" type="date" value="${esc(s.exam)}"></label>` +
      '<fieldset class="field"><legend>Colour</legend><div class="swatches">' +
      S.COLORS.map((c) => `<label class="swatch" style="background:var(--c-${c})"><input type="radio" name="color" value="${c}"${s.color === c ? " checked" : ""}><span class="sr">${c}</span></label>`).join("") +
      "</div></fieldset>" +
      '<div class="btns end">' +
      (subject ? `<button class="btn danger left" type="button" data-action="${deleteArmed ? "delete-subject-confirm" : "delete-subject"}" data-id="${esc(subject.id)}">${deleteArmed ? "Tap again: delete subject and its blocks" : "Delete"}</button>` : "") +
      '<button class="btn ghost" type="button" data-action="close-modal">Cancel</button><button class="btn" type="submit">Save</button></div></form>'
  );
}
