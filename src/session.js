function getRoutine(routineId) {
      return state.routines.find((routine) => routine.id === routineId) || state.routines[0];
    }

function getRoutineIndex(routineId) {
      return state.routines.findIndex((routine) => routine.id === routineId);
    }

function getSession(routineId) {
      const routine = getRoutine(routineId);
      if (!routine) return null;
      const existing = state.sessions[routine.id];
      if (!existing) {
        state.sessions[routine.id] = makeSession(routine, true);
        saveState();
      } else {
        if (!Array.isArray(existing.status) || existing.status.length !== routine.steps.length) {
          existing.status = routine.steps.map((_, idx) => existing.status?.[idx] || "pending");
        }
        if (!Array.isArray(existing.history)) existing.history = [];
        if (typeof existing.departureText !== "string") existing.departureText = "";
        existing.index = Math.min(Math.max(0, Number(existing.index) || 0), routine.steps.length - 1);
        if (!Number.isFinite(existing.remainingSec)) {
          existing.remainingSec = minutesToSeconds(routine.steps[existing.index].minutes);
        }
        if (!Number.isFinite(existing.lastTick)) existing.lastTick = Date.now();
      }
      return state.sessions[routine.id];
    }

function makeSession(routine, autoRun) {
      return {
        routineId: routine.id,
        index: 0,
        status: routine.steps.map(() => "pending"),
        remainingSec: minutesToSeconds(routine.steps[0]?.minutes || 1),
        running: autoRun,
        lastTick: Date.now(),
        startedAt: Date.now(),
        history: [],
        departureText: ""
      };
    }

function resetSession(routineId, autoRun = true) {
      const routine = getRoutine(routineId);
      if (!routine) return;
      state.sessions[routine.id] = makeSession(routine, autoRun);
      delete state.completed[routine.id];
      saveState();
    }

function minutesToSeconds(minutes) {
      return Math.round((Number(minutes) || 0) * 60);
    }

function formatTime(sec) {
      const safe = Math.max(0, Math.ceil(sec));
      const m = Math.floor(safe / 60);
      const s = safe % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

function formatTimerTime(sec) {
      if (sec >= 0) return formatTime(sec);
      return `+${formatTime(Math.abs(sec))}`;
    }

function formatDuration(sec) {
      const safe = Math.max(0, Math.round(sec));
      const m = Math.floor(safe / 60);
      const s = safe % 60;
      if (m <= 0) return `${s}s`;
      if (s === 0) return `${m}m`;
      return `${m}m ${s}s`;
    }

function formatCardDuration(sec) {
      const minutes = Math.max(1, Math.round((Number(sec) || 0) / 60));
      return `${minutes}m`;
    }

function totalSeconds(routine) {
      return routine.steps.reduce((sum, step) => sum + minutesToSeconds(step.minutes), 0);
    }
