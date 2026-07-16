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
      return {
        id: fixed.id,
        icon: fixed.icon,
        name: fixed.name,
        color: fixed.color,
        soft: fixed.soft,
        doneText: fixed.doneText,
        steps: steps.length ? steps : fixed.steps.map((step, idx) => normalizeStep(step, idx, step))
      };
    }

const COPY_MIGRATIONS = {
      morning: {
        m1: { oldNotes: ["물 한 모금"], newNote: "", oldMinutes: [2], newMinutes: 3 },
        m2: { oldMinutes: [12], newMinutes: 15 },
        m3: { oldNotes: ["세수, 샤워 필요하면 샤워", "세수, 머리, 샤워"], newNote: "", oldMinutes: [8], newMinutes: 10 },
        m4: { oldNotes: [""], newNote: "양말까지", oldMinutes: [3], newMinutes: 4 },
        m5: { oldMinutes: [3], newMinutes: 4 },
        m6: { oldMinutes: [1], newMinutes: 2 },
        m7: { oldNotes: ["충전기, 자료, 필기구"], newNote: "물, 충전기, 자료, 필기구" }
      },
      lunch: {
        l1: { oldMinutes: [0.5], newMinutes: 1 },
        l2: { oldNotes: ["필요 없으면 넘기기"], newNote: "" },
        l3: { oldNotes: [""], newNote: "자리 정리", oldMinutes: [0.5], newMinutes: 1 },
        l5: { oldMinutes: [1], newMinutes: 2 }
      },
      dinner: {
        d1: { oldMinutes: [0.5], newMinutes: 1 },
        d2: { oldNotes: ["필요 없으면 넘기기"], newNote: "" },
        d3: { oldNotes: [""], newNote: "자리 정리", oldMinutes: [0.5], newMinutes: 1 },
        d5: { oldNotes: ["오늘 남은 것 하나"], newNote: "남은 것 하나", oldMinutes: [1], newMinutes: 2 }
      },
      outing: {
        o1: {
          oldNotes: ["도착 시간 기준"],
          newNote: "도착 시간 보기",
          oldMinutes: [2],
          newMinutes: 3
        },
        o2: { oldMinutes: [0.75], newMinutes: 1 },
        o3: {
          oldNotes: ["양말까지", "상의, 하의, 양말", "바지, (신발), 아우터, 상의, 속옷, 양말"],
          newNote: "바지 - (신발) - 아우터 - 상의\n+속옷, 양말",
          oldMinutes: [3],
          newMinutes: 5
        },
        o4: { oldMinutes: [1], newMinutes: 2 },
        o9: {
          oldNotes: ["지갑, 키, 학생증, 충전기", "어제 안 챙긴 음식, 전자기기"],
          newNote: "어제 안 챙긴 음식, 전자기기\n\n지갑, 충전기, 우양산, 칫솔, 파우치",
          oldMinutes: [3],
          newMinutes: 4
        },
        o10: {
          oldNotes: ["어제 안 챙긴 음식, 전자기기\n\n지갑, 충전기, 우양산, 칫솔, 파우치"],
          newNote: "어제 안 챙긴 음식, 전자기기\n\n물, 지갑, 충전기, 우양산, 칫솔, 파우치",
          oldMinutes: [1],
          newMinutes: 2
        },
        o11: { oldMinutes: [1], newMinutes: 2 },
        o12: {
          oldNotes: [""],
          newNote: "시간 확인",
          oldMinutes: [0.5],
          newMinutes: 1
        }
      },
      night: {
        n1: {
          oldNotes: LEGACY_NIGHT_DAYLOG_NOTES,
          newNote: NIGHT_DAYLOG_NOTE,
          oldMinutes: [5, 10],
          newMinutes: 12
        },
        n3: {
          oldTitles: ["연락 정리하기"],
          newTitle: "연락하기",
          oldNotes: ["썸원, 필요한 답장", "필요한 답장만"],
          newNote: "썸원도 쓰기",
          oldMinutes: [3],
          newMinutes: 15
        },
        n5: {
          oldNotes: ["하나만"],
          newNote: "내일 할 일 시작부분 하나만 정하기",
          oldMinutes: [2, 3],
          newMinutes: 4
        },
        n6: {
          oldTitles: ["들고 갈 것 적기"],
          newTitle: "준비물 챙기기",
          oldNotes: ["가방 메모", "가방에 넣을 것", "음식, 전자기기 제외, 지갑, 충전기, 우양산, 칫솔, 파우치", "음식, 전자기기 제외\n지갑, 충전기, 우양산, 칫솔, 파우치"],
          newNote: "음식, 전자기기 제외\n물, 지갑, 충전기, 우양산, 칫솔, 파우치",
          oldMinutes: [2, 4],
          newMinutes: 5
        },
        n7: {
          oldNotes: ["침대 밖, 손 안 닿게"],
          newNote: "침대 밖",
          oldMinutes: [0.5],
          newMinutes: 1
        },
        n12: { oldMinutes: [0.25], newMinutes: 0.5 }
      }
    };

function applyStepMigration(step, migration) {
      if (!migration) return;
      const note = String(step.note || "");
      const minutes = Number(step.minutes);
      if (migration.newTitle && (!migration.oldTitles || migration.oldTitles.includes(step.title))) {
        step.title = migration.newTitle;
      }
      if (migration.newNote !== undefined && (!migration.oldNotes || migration.oldNotes.includes(note))) {
        step.note = migration.newNote;
      }
      if (migration.newMinutes !== undefined && (!migration.oldMinutes || migration.oldMinutes.some((value) => Math.abs(minutes - Number(value)) < 0.001))) {
        step.minutes = migration.newMinutes;
      }
    }

function removeLegacyNightCalendarStep(routine) {
      if (routine.id !== "night" || !Array.isArray(routine.steps)) return;
      routine.steps = routine.steps.filter((step) => {
        if (step.id !== "n4") return true;
        const isDefaultCalendar = step.title === "캘린더 열기" && ["내일 일정", "내일 일정 있는지 체크"].includes(String(step.note || ""));
        return !isDefaultCalendar;
      });
    }

function applyCopyMigrations(routines) {
      routines.forEach((routine) => {
        const routineMigrations = COPY_MIGRATIONS[routine.id];
        if (routineMigrations && Array.isArray(routine.steps)) {
          routine.steps.forEach((step) => applyStepMigration(step, routineMigrations[step.id]));
        }
        removeLegacyNightCalendarStep(routine);
      });
    }

function findExistingRoutineForFixed(oldRoutines, fixed) {
      const direct = oldRoutines.find((routine) => routine.id === fixed.id);
      if (direct) return direct;
      const oldReturn = oldRoutines.find((routine) => routine.id === "return");
      return (fixed.id === "lunch" || fixed.id === "dinner") ? oldReturn : null;
    }

function normalizeRoutinesForState(parsed, resetToDefault) {
      const oldRoutines = Array.isArray(parsed?.routines) ? parsed.routines : [];
      const routines = DEFAULT_ROUTINES.map((fixed) => {
        return normalizeRoutineFromFixed(findExistingRoutineForFixed(oldRoutines, fixed), fixed, resetToDefault);
      });
      applyCopyMigrations(routines);
      return routines;
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
