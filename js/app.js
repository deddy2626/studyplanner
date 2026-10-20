import { addDays, mondayOf, todayISO } from "./util.js";
import * as S from "./store.js";
import * as V from "./views.js";

const $ = (sel) => document.querySelector(sel);
const main = $("#main");
const modalRoot = $("#modalRoot");

const ui = {
  view: "today",
  weekStart: mondayOf(todayISO()),
  subjectId: null, // open subject detail inside the Subjects tab
  modalOpener: null,
};

const timer = { running: false, endAt: 0, leftMs: 0, totalMs: 0, subjectId: "", handle: null };

/* ---------- theme ---------- */

function applyTheme() {
  const t = S.getState().settings.theme;
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
}

const isDark = () => {
  const t = S.getState().settings.theme;
  return t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
};

/* ---------- timer ---------- */

function resetTimer() {
  clearInterval(timer.handle);
  timer.running = false;
  timer.totalMs = S.getState().settings.focusMins * 60000;
  timer.leftMs = timer.totalMs;
}

function startTimer() {
  timer.running = true;
  timer.endAt = Date.now() + timer.leftMs;
  timer.handle = setInterval(tickTimer, 500);
}

function pauseTimer() {
  timer.leftMs = Math.max(0, timer.endAt - Date.now());
  timer.running = false;
  clearInterval(timer.handle);
}

function elapsedMs() {
  return timer.totalMs - (timer.running ? Math.max(0, timer.endAt - Date.now()) : timer.leftMs);
}

function tickTimer() {
  const left = timer.endAt - Date.now();
  if (left <= 0) {
    S.logSession({ subjectId: timer.subjectId, mins: timer.totalMs / 60000 });
    resetTimer();
    toast("Focus session complete. Take a short break!");
    return; // the store subscription re-renders
  }
  const el = $("#timeText");
  if (el) el.textContent = V.timerText(left);
}

function finishTimer() {
  const mins = Math.floor(elapsedMs() / 60000);
  resetTimer();
  if (mins >= 1) {
    S.logSession({ subjectId: timer.subjectId, mins });
    toast(`Logged ${mins} minute${mins === 1 ? "" : "s"} of focus`);
  } else {
    toast("Under a minute, so nothing was logged");
    render();
  }
}

/* ---------- rendering ---------- */

function render() {
  let html;
  if (ui.view === "today") html = V.todayView(timer);
  else if (ui.view === "week") html = V.weekView(ui.weekStart);
  else if (ui.view === "subjects") html = ui.subjectId ? V.subjectDetail(ui.subjectId) : V.subjectsView();
  else if (ui.view === "stats") html = V.statsView();
  else html = V.settingsView(false);
  main.innerHTML = html;
  const nav = V.navHtml(ui.view);
  $("#sideTabs").innerHTML = nav;
  $("#bottomTabs").innerHTML = nav;
}

function openModal(html) {
  ui.modalOpener = document.activeElement;
  modalRoot.innerHTML = html;
  modalRoot.querySelector("input:not([type=hidden]), select")?.focus();
}

function closeModal() {
  modalRoot.innerHTML = "";
  ui.modalOpener?.isConnected && ui.modalOpener.focus?.();
  ui.modalOpener = null;
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("#toastRoot").appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function openTaskModal(task, defaults) {
  if (!S.getState().subjects.length) {
    toast("Add a subject first");
    openModal(V.subjectModal(null));
    return;
  }
  openModal(V.taskModal(task, defaults));
}

/* ---------- actions ---------- */

const actions = {
  nav(el) {
    ui.view = el.dataset.view;
    ui.subjectId = null;
    render();
    window.scrollTo(0, 0);
  },
  theme() {
    S.setSettings({ theme: isDark() ? "light" : "dark" });
  },
  "toggle-task": (el) => S.toggleTask(el.dataset.id),
  "edit-task": (el) => openTaskModal(S.getTask(el.dataset.id)),
  "add-task": (el) => openTaskModal(null, { date: el.dataset.date, subjectId: el.dataset.subject }),
  "move-today": (el) => S.updateTask(el.dataset.id, { date: todayISO() }),
  "delete-task"(el) {
    S.deleteTask(el.dataset.id);
    closeModal();
    toast("Block deleted");
  },
  "week-prev"() {
    ui.weekStart = addDays(ui.weekStart, -7);
    render();
  },
  "week-next"() {
    ui.weekStart = addDays(ui.weekStart, 7);
    render();
  },
  "week-today"() {
    ui.weekStart = mondayOf(todayISO());
    render();
  },
  "add-subject": () => openModal(V.subjectModal(null)),
  "edit-subject": (el) => openModal(V.subjectModal(S.getSubject(el.dataset.id))),
  "open-subject"(el) {
    ui.subjectId = el.dataset.id;
    render();
    window.scrollTo(0, 0);
  },
  "back-subjects"() {
    ui.subjectId = null;
    render();
  },
  "delete-subject"(el) {
    el.dataset.action = "delete-subject-confirm";
    el.textContent = "Tap again: delete subject and its blocks";
  },
  "delete-subject-confirm"(el) {
    S.deleteSubject(el.dataset.id);
    ui.subjectId = null;
    closeModal();
    toast("Subject deleted");
  },
  "toggle-topic": (el) => S.toggleTopic(el.dataset.id, el.dataset.topic),
  "delete-topic": (el) => S.deleteTopic(el.dataset.id, el.dataset.topic),
  "timer-toggle"() {
    if (timer.running) pauseTimer();
    else startTimer();
    render();
  },
  "timer-done": finishTimer,
  export() {
    const url = URL.createObjectURL(new Blob([S.exportData()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `petal-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  "reset-ask"(el) {
    el.dataset.action = "reset-confirm";
    el.textContent = "Tap again to erase everything";
  },
  "reset-confirm"() {
    S.resetAll();
    resetTimer();
    ui.view = "today";
    toast("All data erased");
  },
  "close-modal": closeModal,
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "close-modal-bg") {
    if (e.target === el) closeModal();
    return;
  }
  actions[el.dataset.action]?.(el);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalRoot.firstChild) closeModal();
});

document.addEventListener("change", (e) => {
  const kind = e.target.dataset?.change;
  if (kind === "timer-subject") timer.subjectId = e.target.value;
  if (kind === "import") {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        S.importData(text);
        toast("Backup imported");
      } catch {
        toast("That file is not a valid backup");
      }
    });
    e.target.value = "";
  }
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const f = Object.fromEntries(new FormData(form));
  if (form.id === "taskForm") {
    const id = form.dataset.id;
    if (id) {
      S.updateTask(id, { subjectId: f.subjectId, title: f.title, date: f.date, time: f.time, mins: f.mins, done: form.elements.done?.checked });
    } else {
      S.addTask(f);
    }
    closeModal();
    toast(id ? "Block saved" : "Block added");
  } else if (form.id === "subjectForm") {
    const id = form.dataset.id;
    if (id) S.updateSubject(id, f);
    else S.addSubject(f);
    closeModal();
    toast(id ? "Subject saved" : "Subject added");
  } else if (form.id === "topicForm") {
    S.addTopic(form.dataset.id, f.title);
    $("#topicTitle")?.focus();
  } else if (form.id === "settingsForm") {
    S.setSettings({ weeklyGoalMins: Number(f.goal) * 60, focusMins: Number(f.focus), theme: f.theme });
    toast("Settings saved");
  }
});

/* drag a study block onto another day (desktop) */
let dragId = null;
document.addEventListener("dragstart", (e) => {
  const b = e.target.closest?.(".block");
  if (!b) return;
  dragId = b.dataset.id;
  e.dataTransfer.setData("text/plain", dragId);
  e.dataTransfer.effectAllowed = "move";
});
document.addEventListener("dragover", (e) => {
  const d = e.target.closest?.(".day");
  if (d && dragId) {
    e.preventDefault();
    d.classList.add("over");
  }
});
document.addEventListener("dragleave", (e) => e.target.closest?.(".day")?.classList.remove("over"));
document.addEventListener("drop", (e) => {
  const d = e.target.closest?.(".day");
  if (!d || !dragId) return;
  e.preventDefault();
  S.updateTask(dragId, { date: d.dataset.date });
  dragId = null;
});
document.addEventListener("dragend", () => {
  dragId = null;
  document.querySelectorAll(".day.over").forEach((d) => d.classList.remove("over"));
});

$("#fab").addEventListener("click", () => openTaskModal(null, { date: ui.view === "week" ? undefined : todayISO() }));

/* ---------- boot ---------- */

S.subscribe(() => {
  applyTheme();
  if (!timer.running && timer.leftMs === timer.totalMs) {
    timer.totalMs = timer.leftMs = S.getState().settings.focusMins * 60000;
  }
  render();
});

applyTheme();
resetTimer();
render();
