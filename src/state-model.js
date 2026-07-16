function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

function routineDayDate() {
      const d = new Date();
      if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
      return d;
    }

function todayKey() {
      return dateKeyFromDate(routineDayDate());
    }

function todayKo() {
      return dateLabelKo(routineDayDate(), false);
    }

function snapshotFromParts(completed = {}, offToday = {}, sessions = {}) {
      const snapshot = {};
      DISPLAY_ROUTINE_ORDER.forEach((id) => {
        if (offToday?.[id]) snapshot[id] = "off";
        else if (completed?.[id]) snapshot[id] = "done";
        else if (sessions?.[id]) snapshot[id] = "active";
        else snapshot[id] = "none";
      });
      return snapshot;
    }

function updateTodayCalendar(targetState = state) {
      if (!targetState) return;
      if (!targetState.calendar || typeof targetState.calendar !== "object") targetState.calendar = {};
      const key = todayKey();
      const effectiveOff = { ...(targetState.offToday || {}) };
      const plan = targetState.dayPlans && typeof targetState.dayPlans === "object" ? targetState.dayPlans[key] : null;
      if (plan?.off && typeof plan.off === "object") {
        Object.entries(plan.off).forEach(([routineId, off]) => {
          if (off) effectiveOff[routineId] = true;
          else delete effectiveOff[routineId];
        });
      }
      const snapshot = snapshotFromParts(targetState.completed, effectiveOff, targetState.sessions);
      if (plan?.statuses && typeof plan.statuses === "object") {
        Object.entries(plan.statuses).forEach(([routineId, status]) => {
          if (["done", "none", "off"].includes(status)) snapshot[routineId] = status;
        });
      }
      targetState.calendar[key] = snapshot;
    }

function dateKeyFromDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

function dateLabelKo(date, withParentheses = false) {
      const weekday = WEEKDAY_LABELS[date.getDay()];
      const dayText = withParentheses ? `(${weekday})` : weekday;
      return `${date.getMonth() + 1}.${date.getDate()} ${dayText}`;
    }

function normalizeDayPlans(source) {
      const result = {};
      Object.entries(source || {}).forEach(([key, raw]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !raw || typeof raw !== "object") return;
        const off = raw.off && typeof raw.off === "object" ? { ...raw.off } : {};
        const notes = {};
        if (raw.notes && typeof raw.notes === "object") {
          Object.entries(raw.notes).forEach(([routineId, value]) => {
            const text = String(value || "").slice(0, 240);
            if (text.trim()) notes[routineId] = text;
          });
        }
        const statuses = {};
        if (raw.statuses && typeof raw.statuses === "object") {
          Object.entries(raw.statuses).forEach(([routineId, value]) => {
            const status = String(value || "");
            if (["done", "none", "off"].includes(status)) statuses[routineId] = status;
          });
        }
        result[key] = { off, notes, statuses };
      });
      return result;
    }

function dateFromKey(key) {
      const [y, m, d] = String(key || "").split("-").map(Number);
      if (!y || !m || !d) return routineDayDate();
      return new Date(y, m - 1, d);
    }

function dateKeyKo(key) {
      return dateLabelKo(dateFromKey(key), false);
    }

function dateKeyPlanLabel(key) {
      return `${dateLabelKo(dateFromKey(key), true)} 루틴 수정하기`;
    }

function isPastOrTodayKey(key) {
      return String(key || "") <= todayKey();
    }

function hasOwn(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj || {}, key);
    }

function getDayPlan(key, create = false) {
      if (!state.dayPlans || typeof state.dayPlans !== "object") state.dayPlans = {};
      if (!state.dayPlans[key] && create) state.dayPlans[key] = { off: {}, notes: {}, statuses: {} };
      const plan = state.dayPlans[key];
      if (!plan) return null;
      if (!plan.off || typeof plan.off !== "object") plan.off = {};
      if (!plan.notes || typeof plan.notes !== "object") plan.notes = {};
      if (!plan.statuses || typeof plan.statuses !== "object") plan.statuses = {};
      return plan;
    }

function cleanDayPlan(key) {
      const plan = getDayPlan(key, false);
      if (!plan) return;
      Object.keys(plan.notes || {}).forEach((routineId) => {
        if (!String(plan.notes[routineId] || "").trim()) delete plan.notes[routineId];
      });
      Object.keys(plan.statuses || {}).forEach((routineId) => {
        if (!["done", "none", "off"].includes(String(plan.statuses[routineId]))) delete plan.statuses[routineId];
      });
      const hasNotes = Object.keys(plan.notes || {}).length > 0;
      const hasOff = Object.keys(plan.off || {}).length > 0;
      const hasStatuses = Object.keys(plan.statuses || {}).length > 0;
      if (!hasNotes && !hasOff && !hasStatuses) delete state.dayPlans[key];
    }

function defaultOffForRoutine(routineId) {
      return Boolean(defaultOffToday()[routineId]);
    }

function effectiveOffForDate(key, routineId) {
      const plan = getDayPlan(key, false);
      if (plan && hasOwn(plan.off, routineId)) return Boolean(plan.off[routineId]);
      if (key === todayKey()) return Boolean(state.offToday?.[routineId]);
      return defaultOffForRoutine(routineId);
    }

function dayNoteFor(key, routineId) {
      const plan = getDayPlan(key, false);
      return String(plan?.notes?.[routineId] || "").trim();
    }

function setDayNote(key, routineId, value) {
      const plan = getDayPlan(key, true);
      const text = String(value || "").slice(0, 240);
      if (text.trim()) plan.notes[routineId] = text;
      else delete plan.notes[routineId];
      cleanDayPlan(key);
      saveState();
    }

function setPlanOff(key, routineId, off) {
      const plan = getDayPlan(key, true);
      plan.off[routineId] = Boolean(off);
      if (key === todayKey()) {
        if (off) state.offToday[routineId] = true;
        else delete state.offToday[routineId];
      }
      cleanDayPlan(key);
      saveState();
    }

function explicitDayStatus(key, routineId) {
      const plan = getDayPlan(key, false);
      const manual = plan?.statuses?.[routineId];
      if (["done", "none", "off"].includes(manual)) return manual;
      const entry = key === todayKey() ? snapshotFromParts(state.completed, state.offToday, state.sessions) : state.calendar?.[key];
      const status = entry?.[routineId];
      if (["done", "active", "off", "none"].includes(status)) return status === "active" ? "none" : status;
      return effectiveOffForDate(key, routineId) ? "off" : "none";
    }

function setExplicitDayStatus(key, routineId, status) {
      if (!["done", "none", "off"].includes(status)) return;
      const plan = getDayPlan(key, true);
      plan.statuses[routineId] = status;
      if (!state.calendar || typeof state.calendar !== "object") state.calendar = {};
      if (!state.calendar[key]) state.calendar[key] = {};
      state.calendar[key][routineId] = status;
      if (status === "off") {
        plan.off[routineId] = true;
        if (key === todayKey()) {
          delete state.completed[routineId];
          delete state.sessions[routineId];
          state.offToday[routineId] = true;
        }
      } else {
        if (defaultOffForRoutine(routineId)) plan.off[routineId] = false;
        else delete plan.off[routineId];
        if (key === todayKey()) {
          delete state.offToday[routineId];
          delete state.sessions[routineId];
          if (status === "done") state.completed[routineId] = new Date().toISOString();
          else delete state.completed[routineId];
        }
      }
      cleanDayPlan(key);
      saveState();
    }

function defaultState() {
      return {
        version: APP_VERSION,
        routineSchema: ROUTINE_SCHEMA_VERSION,
        today: todayKey(),
        routines: clone(DEFAULT_ROUTINES),
        sessions: {},
        completed: {},
        offToday: defaultOffToday(),
        calendar: {},
        dayPlans: {}
      };
    }

function defaultById(id) {
      return DEFAULT_ROUTINES.find((routine) => routine.id === id) || DEFAULT_ROUTINES[0];
    }

function isPlainObject(value) {
      return Boolean(value && typeof value === "object" && !Array.isArray(value));
    }

function safeObject(value, fallback = {}) {
      return isPlainObject(value) ? value : fallback;
    }
