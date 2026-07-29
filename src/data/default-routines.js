function defaultOffToday() {
      return { outing: true };
    }

function routinesForDisplay() {
      const byId = new Map(state.routines.map((routine) => [routine.id, routine]));
      const ordered = DISPLAY_ROUTINE_ORDER.map((id) => byId.get(id)).filter(Boolean);
      state.routines.forEach((routine) => {
        if (!DISPLAY_ROUTINE_ORDER.includes(routine.id)) ordered.push(routine);
      });
      return ordered;
    }

const PRIVATE_DEFAULTS_BOOTSTRAP_STEP_ID = "private-defaults-pending";

function privateDefaultsBootstrapRoutine({ id, icon, name, color, soft }) {
      return {
        id,
        icon,
        name,
        color,
        soft,
        doneText: "루틴 완료.",
        steps: [{
          id: `${id}-${PRIVATE_DEFAULTS_BOOTSTRAP_STEP_ID}`,
          icon: "…",
          title: "계정 기본값 불러오는 중",
          note: "로그인 후 비공개 기본값을 불러옵니다.",
          minutes: 1
        }]
      };
    }

const DEFAULT_ROUTINES = [
      privateDefaultsBootstrapRoutine({
        id: "morning",
        icon: "↗",
        name: "아침 루틴",
        color: "#C85A4A",
        soft: "#F3DDD9"
      }),
      privateDefaultsBootstrapRoutine({
        id: "lunch",
        icon: "☀️",
        name: "점심 루틴",
        color: "#A6A43A",
        soft: "#EEF0CF"
      }),
      privateDefaultsBootstrapRoutine({
        id: "dinner",
        icon: "🌆",
        name: "저녁 루틴",
        color: "#2389C7",
        soft: "#DCEFFA"
      }),
      privateDefaultsBootstrapRoutine({
        id: "outing",
        icon: "🧭",
        name: "외출 루틴",
        color: "#D88A2A",
        soft: "#F4E5CC"
      }),
      privateDefaultsBootstrapRoutine({
        id: "night",
        icon: "↓",
        name: "밤 루틴",
        color: "#934B8F",
        soft: "#F2E0EC"
      })
    ];

function isPrivateDefaultsBootstrapRoutines(routines) {
      if (!Array.isArray(routines) || routines.length !== DEFAULT_ROUTINES.length) return false;
      return routines.every((routine) => (
        routine &&
        Array.isArray(routine.steps) &&
        routine.steps.length === 1 &&
        String(routine.steps[0]?.id || "").endsWith(`-${PRIVATE_DEFAULTS_BOOTSTRAP_STEP_ID}`)
      ));
    }
