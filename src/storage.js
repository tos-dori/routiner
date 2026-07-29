function readStoredState() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    }

function readLocalUpdatedAt() {
      const value = Number(localStorage.getItem(LOCAL_UPDATED_AT_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    }

function writeLocalUpdatedAt(value) {
      localStorage.setItem(LOCAL_UPDATED_AT_KEY, String(value));
    }

function ensureLocalUpdatedAt() {
      let value = readLocalUpdatedAt();
      if (!value) {
        value = Date.now();
        writeLocalUpdatedAt(value);
      }
      return value;
    }

function writeStoredState(targetState, options = {}) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targetState));
      const nextCloudHash = cloudStateHash(targetState);
      const cloudChanged = options.cloud !== false && nextCloudHash !== lastLocalCloudHash;
      if (options.touch !== false && cloudChanged) writeLocalUpdatedAt(Date.now());
      if (cloudChanged) {
        lastLocalCloudHash = nextCloudHash;
        enqueueCloudSave(nextCloudHash);
      }
    }

function backupStatePayload() {
      return {
        tag: BACKUP_TAG,
        app: "routiner",
        schema: BACKUP_SCHEMA,
        storageKey: STORAGE_KEY,
        appVersion: APP_VERSION,
        dayStartHour: DAY_START_HOUR,
        exportedAt: new Date().toISOString(),
        state: prepareStateForSave(clone(state))
      };
    }

function parseBackupText(text) {
      const raw = String(text || "").trim();
      if (!raw) return null;
      try {
        const payload = JSON.parse(raw);
        if (!isPlainObject(payload)) return null;
        if (payload.tag !== BACKUP_TAG) return null;
        if (payload.app !== "routiner") return null;
        if (payload.schema !== BACKUP_SCHEMA) return null;
        if (payload.storageKey !== STORAGE_KEY) return null;
        if (!isPlainObject(payload.state)) return null;
        const nextState = normalizeLoadedState(payload.state);
        return { payload, nextState };
      } catch {
        return null;
      }
    }

function normalizeStep(step, index, fallback) {
      const source = fallback || {};
      return {
        id: step.id || source.id || `step_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
        icon: String(step.icon || source.icon || "·").slice(0, 4),
        title: String(step.title || source.title || "새 단계"),
        note: String(step.note ?? source.note ?? ""),
        minutes: Math.max(0.25, Number(step.minutes ?? source.minutes) || 1),
        capture: step.capture || source.capture || null
      };
    }

function normalizeRoutineFromFixed(existing, fixed, resetToDefault = false) {
      const oldSteps = Array.isArray(existing?.steps) ? existing.steps : [];
      const sourceSteps = resetToDefault || oldSteps.length === 0 ? fixed.steps : oldSteps;
      const steps = sourceSteps.map((step, idx) => {
        const fixedStep = fixed.steps.find((item) => item.id === step.id) || fixed.steps[idx] || {};
        return normalizeStep(step, idx, fixedStep);
      });
      const metadata = resetToDefault ? fixed : (existing || fixed);
      return {
        id: fixed.id,
        icon: String(metadata.icon || fixed.icon || "·").slice(0, 4),
        name: String(metadata.name || fixed.name || "루틴"),
        color: String(metadata.color || fixed.color || "#777777"),
        soft: String(metadata.soft || fixed.soft || "#EEEEEE"),
        doneText: String(metadata.doneText || fixed.doneText || "루틴 완료."),
        steps: steps.length ? steps : fixed.steps.map((step, idx) => normalizeStep(step, idx, step))
      };
    }

function findExistingRoutineForFixed(oldRoutines, fixed) {
      const direct = oldRoutines.find((routine) => routine.id === fixed.id);
      if (direct) return direct;
      const oldReturn = oldRoutines.find((routine) => routine.id === "return");
      return (fixed.id === "lunch" || fixed.id === "dinner") ? oldReturn : null;
    }

function normalizeRoutinesForState(parsed, resetToDefault) {
      const oldRoutines = Array.isArray(parsed?.routines) ? parsed.routines : [];
      return DEFAULT_ROUTINES.map((fixed) => {
        return normalizeRoutineFromFixed(findExistingRoutineForFixed(oldRoutines, fixed), fixed, resetToDefault);
      });
    }

function snapshotPreviousRoutineDay(parsed, calendar) {
      if (!parsed?.today || parsed.today === todayKey()) return;
      calendar[parsed.today] = snapshotFromParts(parsed.completed, parsed.offToday, parsed.sessions);
    }

function rolloverToTodayIfNeeded(targetState) {
      if (targetState.today === todayKey()) return;
      targetState.today = todayKey();
      targetState.completed = {};
      targetState.sessions = {};
      targetState.offToday = defaultOffToday();
    }

function normalizeLoadedState(parsed) {
      const base = defaultState();
      if (!parsed) return base;

      const shouldResetDefaultRoutines = parsed.routineSchema !== ROUTINE_SCHEMA_VERSION;
      const calendar = { ...safeObject(parsed.calendar) };
      const dayPlans = normalizeDayPlans(safeObject(parsed.dayPlans));
      const routines = normalizeRoutinesForState(parsed, shouldResetDefaultRoutines);
      snapshotPreviousRoutineDay(parsed, calendar);

      const next = {
        ...base,
        ...parsed,
        version: APP_VERSION,
        routineSchema: ROUTINE_SCHEMA_VERSION,
        routines,
        sessions: shouldResetDefaultRoutines ? {} : safeObject(parsed.sessions),
        completed: shouldResetDefaultRoutines ? {} : safeObject(parsed.completed),
        offToday: shouldResetDefaultRoutines ? defaultOffToday() : safeObject(parsed.offToday, defaultOffToday()),
        calendar,
        dayPlans
      };
      rolloverToTodayIfNeeded(next);
      updateTodayCalendar(next);
      normalizeAllSessions(next);
      return next;
    }

function loadState() {
      try {
        return normalizeLoadedState(readStoredState());
      } catch {
        return defaultState();
      }
    }

function normalizeAllSessions(targetState = state) {
      if (!targetState.sessions) targetState.sessions = {};
      targetState.routines.forEach((routine) => {
        const session = targetState.sessions[routine.id];
        if (!session) return;
        if (!Array.isArray(session.status) || session.status.length !== routine.steps.length) {
          session.status = routine.steps.map((_, idx) => session.status?.[idx] || "pending");
        }
        if (!Array.isArray(session.history)) session.history = [];
        if (typeof session.departureText !== "string") session.departureText = "";
        session.index = Math.min(Math.max(0, Number(session.index) || 0), routine.steps.length - 1);
        if (!Number.isFinite(session.remainingSec)) {
          session.remainingSec = minutesToSeconds(routine.steps[session.index].minutes);
        }
        if (!Number.isFinite(session.lastTick)) session.lastTick = Date.now();
      });
    }

function prepareStateForSave(targetState) {
      targetState.version = APP_VERSION;
      targetState.routineSchema = ROUTINE_SCHEMA_VERSION;
      if (!isPlainObject(targetState.dayPlans)) targetState.dayPlans = {};
      updateTodayCalendar(targetState);
      return targetState;
    }

function saveState(options = {}) {
      writeStoredState(prepareStateForSave(state), options);
    }
