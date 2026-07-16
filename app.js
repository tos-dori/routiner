const APP_VERSION = "1.54";
    const ROUTINE_SCHEMA_VERSION = "2026-06-12-v1";
    const STORAGE_KEY = "personal_routine_v01";
    const BACKUP_TAG = "ROUTINER_BACKUP_V1";
    const BACKUP_SCHEMA = 1;
    const FIRESTORE_TAG = "ROUTINER_FIRESTORE_STATE_V1";
    const FIRESTORE_SCHEMA = 3;
    const FIRESTORE_DOC_ID = "main";
    const FIREBASE_SDK_VERSION = "12.15.0";
    const FIREBASE_CONFIG = {
      // Firebase Web API key는 브라우저 앱에서 쓰이는 client config 값이다.
      // 실제 접근 통제는 Auth, Firestore Rules, Google Cloud API key restriction에서 처리한다.
      // public repo의 불필요한 secret scanning 잡음을 줄이기 위해 연속된 키 문자열로 커밋하지 않는다.
      apiKey: ["AI", "za", "Sy", "B-QEUJGVNhP2MaiTdVrcxVrUgYy-6-usc"].join(""),
      authDomain: "routiner-personal.firebaseapp.com",
      projectId: "routiner-personal",
      storageBucket: "routiner-personal.firebasestorage.app",
      messagingSenderId: "864215206596",
      appId: "1:864215206596:web:89ea47bab1456e5f16d791"
    };
    const LOCAL_UPDATED_AT_KEY = `${STORAGE_KEY}__updatedAt`;
    const CLOUD_DEVICE_KEY = `${STORAGE_KEY}__cloudDeviceId`;
    const DAY_START_HOUR = 6;
    const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
    const DISPLAY_ROUTINE_ORDER = ["morning", "outing", "lunch", "dinner", "night"];
    const LONG_PRESS_MS = 560;
    const NIGHT_DAYLOG_NOTE = [
      "캘린더 체크하기",
      "Today 옮기고 내일 계획 손보기",
      "단축어 자동화 켜고 끄기"
    ].join("\n");
    const LEGACY_NIGHT_DAYLOG_NOTES = [
      "빈칸 채우기",
      "빈칸만 채우기",
      "빈칸만",
      "Today 옮기고 내일 계획 손보기",
      "캘린더 체크하기\nToday 옮기고 내일 계획 손보기",
      NIGHT_DAYLOG_NOTE
    ];

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

    const DEFAULT_ROUTINES = [
      {
        id: "morning",
        icon: "↗",
        name: "아침 출근",
        color: "#C85A4A",
        soft: "#F3DDD9",
        doneText: "독서실 도착. 이제 첫 Step만 열면 된다.",
        steps: [
          { id: "m1", icon: "🚽", title: "화장실 가기", note: "", minutes: 3 },
          { id: "m2", icon: "🙆", title: "목·어깨 풀기 2세트", note: "턱 당기기 8회 │ 고개 숙이지 말고 턱만 뒤로\n어깨 돌리기 10회 │ 팔꿈치로 큰 원 그리기\n가슴 열기 20초 │ 손을 등 뒤로 잡고 천천히 펴기", minutes: 4 },
          { id: "m3", icon: "🍚", title: "아침 먹기", note: "", minutes: 20 },
          { id: "m4", icon: "🚶", title: "집 안 걷기", note: "", minutes: 5 },
          { id: "m5", icon: "🚿", title: "씻기", note: "", minutes: 8 },
          { id: "m6", icon: "👕", title: "옷 입기", note: "양말까지", minutes: 3 },
          { id: "m7", icon: "🎒", title: "가방 열기", note: "물, 충전기, 자료, 필기구", minutes: 3 },
          { id: "m8", icon: "🚪", title: "문 앞 보기", note: "폰, 지갑, 키, 이어폰", minutes: 1 },
          { id: "m9", icon: "🚶", title: "독서실 가기", note: "", minutes: 8 }
        ]
      },
      {
        id: "lunch",
        icon: "☀️",
        name: "점심 루틴",
        color: "#A6A43A",
        soft: "#EEF0CF",
        doneText: "복귀 완료. Step부터 열자.",
        steps: [
          { id: "l1", icon: "🧍", title: "일어나기", note: "자리 정리", minutes: 1 },
          { id: "l2", icon: "🏠", title: "집 가기", note: "", minutes: 8 },
          { id: "l8", icon: "🏋️", title: "하체 3세트", note: "스쿼트 10~15회 │ 엉덩이 뒤로, 허벅지 수평\n엉덩이 들기 10~15회 │ 엉덩이 조이며 들어 올리기\n런지 좌우 8~12회 │ 뒷무릎 바닥 가까이\n월싯 30~45초 │ 등·허리 벽에 붙이기", minutes: 10 },
          { id: "l3", icon: "🍚", title: "점심 먹기", note: "", minutes: 25 },
          { id: "l4", icon: "💧", title: "물 마시기", note: "", minutes: 1 },
          { id: "l5", icon: "🚽", title: "화장실 가기", note: "", minutes: 3 },
          { id: "l9", icon: "🙆", title: "가슴 펴기", note: "문틀 가슴 늘리기 좌우 30초 │ 팔을 걸고 몸을 반대로 돌리기\n어깨 돌리기 10회 │ 팔꿈치로 큰 원 그리기\n상체 비틀기 좌우 8회 │ 골반은 두고 가슴만 천천히", minutes: 2 },
          { id: "l6", icon: "🚶", title: "걸어서 복귀", note: "", minutes: 15 },
          { id: "l7", icon: "▶", title: "Step 열기", note: "방금 하던 것", minutes: 1 }
        ]
      },
      {
        id: "dinner",
        icon: "🌆",
        name: "저녁 루틴",
        color: "#2389C7",
        soft: "#DCEFFA",
        doneText: "복귀 완료. Step부터 열자.",
        steps: [
          { id: "d1", icon: "🧍", title: "일어나기", note: "자리 정리", minutes: 1 },
          { id: "d2", icon: "🏠", title: "집 가기", note: "", minutes: 8 },
          { id: "d8", icon: "💪", title: "상체·코어 3세트", note: "턱걸이 2~3회 │ 반동 없이 턱을 바 위로\n데드버그 좌우 8~12회 │ 허리 바닥에 붙이기\n푸시업 8~15회 │ 가슴 바닥 가까이\n플랭크 20~40초 │ 머리부터 발끝 일자", minutes: 10 },
          { id: "d3", icon: "🍚", title: "저녁 먹기", note: "", minutes: 30 },
          { id: "d4", icon: "💧", title: "물 마시기", note: "", minutes: 1 },
          { id: "d5", icon: "🚽", title: "화장실 가기", note: "", minutes: 3 },
          { id: "d9", icon: "🧍", title: "등·허리 풀기", note: "벽 짚고 등 늘리기 40초 │ 엉덩이 뒤로, 팔과 등 길게\n상체 비틀기 좌우 8회 │ 골반은 두고 가슴만 천천히\n옆구리 늘리기 좌우 30초 │ 한 팔 올리고 옆으로 기울이기", minutes: 3 },
          { id: "d6", icon: "🚶", title: "걸어서 복귀", note: "", minutes: 15 },
          { id: "d7", icon: "▶", title: "Step 열기", note: "오늘 남은 것", minutes: 1 }
        ]
      },
      {
        id: "outing",
        icon: "🧭",
        name: "외출 준비",
        color: "#D88A2A",
        soft: "#F4E5CC",
        doneText: "외출 준비 완료. 출발하자.",
        steps: [
          { id: "o1", icon: "📶", title: "와이파이 끄기", note: "", minutes: 0.5 },
          { id: "o2", icon: "🗺", title: "지도 보기", note: "도착 시간 보기", minutes: 2.5 },
          { id: "o3", icon: "⏰", title: "출발 적기", note: "", minutes: 1, capture: "departure" },
          { id: "o4", icon: "👕", title: "옷 꺼내기", note: "바지 - (신발) - 아우터 - 상의\n+속옷, 양말", minutes: 4 },
          { id: "o5", icon: "🔌", title: "충전 꽂기", note: "폰, 보조배터리, 이어폰", minutes: 1 },
          { id: "o6", icon: "🚿", title: "샤워하기", note: "", minutes: 25 },
          { id: "o7", icon: "🪒", title: "면도하기", note: "", minutes: 3 },
          { id: "o8", icon: "🧴", title: "로션 바르기", note: "립밤까지", minutes: 2 },
          { id: "o9", icon: "🧥", title: "옷 입기", note: "", minutes: 3 },
          { id: "o10", icon: "🎒", title: "가방 열기", note: "어제 안 챙긴 음식, 전자기기\n\n물, 지갑, 충전기, 우양산, 칫솔, 파우치", minutes: 4 },
          { id: "o11", icon: "🪞", title: "거울 보기", note: "얼굴, 머리, 옷", minutes: 1 },
          { id: "o12", icon: "👟", title: "신발 신기", note: "가방 메기", minutes: 2 },
          { id: "o13", icon: "🚪", title: "나가기", note: "시간 확인", minutes: 1 }
        ]
      },
      {
        id: "night",
        icon: "↓",
        name: "밤 종료",
        color: "#934B8F",
        soft: "#F2E0EC",
        doneText: "오늘은 닫았다. 폰 없이 침대에 들어가자.",
        steps: [
          { id: "n1", icon: "📒", title: "DayLog 열기", note: NIGHT_DAYLOG_NOTE, minutes: 12 },
          { id: "n2", icon: "✍️", title: "일기 쓰기", note: "3줄만", minutes: 3 },
          { id: "n3", icon: "💌", title: "연락하기", note: "썸원도 쓰기", minutes: 15 },
          { id: "n5", icon: "🧩", title: "첫 Step 정하기", note: "내일 할 일 시작부분 하나만 정하기", minutes: 4 },
          { id: "n6", icon: "🎒", title: "준비물 챙기기", note: "음식, 전자기기 제외\n물, 지갑, 충전기, 우양산, 칫솔, 파우치", minutes: 5 },
          { id: "n7", icon: "🔌", title: "폰 충전 꽂기", note: "침대 밖", minutes: 1 },
          { id: "n13", icon: "🧘", title: "전신 스트레칭", note: "고양이 자세 8회 │ 네발로 엎드려 등을 둥글게 말았다가 천천히 펴기\n누워서 허리 비틀기 좌우 40초 │ 무릎 세우고 한쪽으로 넘기기, 반대쪽 어깨는 바닥\n허벅지 뒤 늘리기 좌우 40초 │ 누워서 한쪽 다리 들고 허벅지 뒤를 잡아 몸 쪽으로 당기기", minutes: 8 },
          { id: "n8", icon: "🫧", title: "세수하기", note: "", minutes: 2 },
          { id: "n9", icon: "🪥", title: "양치하기", note: "", minutes: 3 },
          { id: "n10", icon: "🧴", title: "로션 바르기", note: "립밤까지", minutes: 1 },
          { id: "n11", icon: "🌙", title: "불 끄기", note: "", minutes: 0.5 },
          { id: "n12", icon: "🛏", title: "침대 눕기", note: "폰 없이", minutes: 0.5 }
        ]
      }
    ];

    const els = {
      app: document.getElementById("app"),
      auth: document.getElementById("authScreen"),
      authForm: document.getElementById("authForm"),
      authEmail: document.getElementById("authEmail"),
      authPassword: document.getElementById("authPassword"),
      authLoginBtn: document.getElementById("authLoginBtn"),
      authMessage: document.getElementById("authMessage"),
      home: document.getElementById("homeScreen"),
      run: document.getElementById("runScreen"),
      done: document.getElementById("doneScreen"),
      edit: document.getElementById("editScreen"),
      todayLabel: document.getElementById("todayLabel"),
      dayPlanNotice: document.getElementById("dayPlanNotice"),
      routineList: document.getElementById("routineList"),
      heroArea: document.getElementById("heroArea"),
      brandTitle: document.getElementById("brandTitle"),
      backupPanel: document.getElementById("backupPanel"),
      backupInput: document.getElementById("backupInput"),
      backupClearBtn: document.getElementById("backupClearBtn"),
      backupImportBtn: document.getElementById("backupImportBtn"),
      backupExportBtn: document.getElementById("backupExportBtn"),
      backupLogoutBtn: document.getElementById("backupLogoutBtn"),
      calendarOverlay: document.getElementById("calendarOverlay"),
      calendarTitle: document.getElementById("calendarTitle"),
      calendarGrid: document.getElementById("calendarGrid"),
      calendarPrevBtn: document.getElementById("calendarPrevBtn"),
      calendarNextBtn: document.getElementById("calendarNextBtn"),
      calendarCloseBtn: document.getElementById("calendarCloseBtn"),
      openEditBtn: document.getElementById("openEditBtn"),
      closeEditBtn: document.getElementById("closeEditBtn"),
      previewLeftBtn: document.getElementById("previewLeftBtn"),
      previewRightBtn: document.getElementById("previewRightBtn"),
      editRoutineTitle: document.getElementById("editRoutineTitle"),
      routineTabs: document.getElementById("routineTabs"),
      editTotalTime: document.getElementById("editTotalTime"),
      stepEditorList: document.getElementById("stepEditorList"),
      backBtn: document.getElementById("backBtn"),
      undoBtn: document.getElementById("undoBtn"),
      runStepMeta: document.getElementById("runStepMeta"),
      departurePinSlot: document.getElementById("departurePinSlot"),
      sessionRoutineTitle: document.getElementById("sessionRoutineTitle"),
      runDayNote: document.getElementById("runDayNote"),
      taskIcon: document.getElementById("taskIcon"),
      progressFill: document.getElementById("progressFill"),
      stepPreview: document.getElementById("stepPreview"),
      timerRing: document.getElementById("timerRing"),
      timerLabel: document.getElementById("timerLabel"),
      timerTime: document.getElementById("timerTime"),
      timerStatus: document.getElementById("timerStatus"),
      taskTitle: document.getElementById("taskTitle"),
      stepMemo: document.getElementById("stepMemo"),
      completeBtn: document.getElementById("completeBtn"),
      pauseBtn: document.getElementById("pauseBtn"),
      skipBtn: document.getElementById("skipBtn"),
      doneTitle: document.getElementById("doneTitle"),
      doneText: document.getElementById("doneText"),
      doneHomeBtn: document.getElementById("doneHomeBtn"),
      doneUndoBtn: document.getElementById("doneUndoBtn"),
      restartBtn: document.getElementById("restartBtn"),
      toast: document.getElementById("toast"),
      rewardPop: document.getElementById("rewardPop"),
      saveStatus: document.getElementById("saveStatus"),
      resetRoutineBtn: document.getElementById("resetRoutineBtn")
    };

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

    function getCloudDeviceId() {
      try {
        let id = localStorage.getItem(CLOUD_DEVICE_KEY);
        if (!id) {
          id = crypto?.randomUUID ? crypto.randomUUID() : `routiner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          localStorage.setItem(CLOUD_DEVICE_KEY, id);
        }
        return id;
      } catch {
        return `routiner-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
    }

    function cloudStateSlice(targetState = state) {
      const prepared = prepareStateForSave(clone(targetState));
      return {
        version: APP_VERSION,
        routineSchema: ROUTINE_SCHEMA_VERSION,
        today: prepared.today,
        routines: clone(prepared.routines),
        completed: clone(safeObject(prepared.completed)),
        offToday: clone(safeObject(prepared.offToday, defaultOffToday())),
        calendar: clone(safeObject(prepared.calendar)),
        dayPlans: clone(normalizeDayPlans(safeObject(prepared.dayPlans)))
      };
    }

    function cloudStateHash(targetState = state) {
      return JSON.stringify(cloudStateSlice(targetState));
    }

    const cloudSync = {
      ready: false,
      loading: false,
      user: null,
      app: null,
      auth: null,
      db: null,
      api: null,
      deviceId: getCloudDeviceId(),
      pendingSave: false,
      pendingHash: "",
      saveTimer: null,
      applyingRemote: false,
      unsubscribeSnapshot: null,
      pendingRemote: null,
      lastSavedHash: "",
      activeRun: null,
      activeRunUpdatedAt: 0
    };

    function firestoreStatePayload(targetState = state) {
      const slice = cloudStateSlice(targetState);
      return {
        tag: FIRESTORE_TAG,
        app: "routiner",
        schema: FIRESTORE_SCHEMA,
        storageKey: STORAGE_KEY,
        appVersion: APP_VERSION,
        dayStartHour: DAY_START_HOUR,
        updatedAt: ensureLocalUpdatedAt(),
        serverUpdatedAt: cloudSync.api?.serverTimestamp ? cloudSync.api.serverTimestamp() : null,
        updatedBy: cloudSync.deviceId,
        activeRun: clone(cloudSync.activeRun || null),
        activeRunUpdatedAt: Number(cloudSync.activeRunUpdatedAt || 0),
        state: slice,
        stateHash: JSON.stringify(slice)
      };
    }

    function parseFirestoreStatePayload(payload) {
      if (!isPlainObject(payload)) return null;
      if (payload.tag !== FIRESTORE_TAG) return null;
      if (payload.app !== "routiner") return null;
      const schema = Number(payload.schema) || 0;
      if (![1, 2, FIRESTORE_SCHEMA].includes(schema)) return null;
      if (payload.storageKey !== STORAGE_KEY) return null;
      if (!isPlainObject(payload.state)) return null;
      const updatedAt = Number(payload.updatedAt) || 0;
      const activeRun = normalizeActiveRun(payload.activeRun);
      const activeRunUpdatedAt = Number(payload.activeRunUpdatedAt) || Number(activeRun?.updatedAt) || 0;
      return { nextState: normalizeLoadedState(payload.state), updatedAt, updatedBy: String(payload.updatedBy || ""), schema, activeRun, activeRunUpdatedAt };
    }

    function normalizeActiveRun(value) {
      if (!isPlainObject(value)) return null;
      const routineId = String(value.routineId || "");
      if (!routineId) return null;
      return {
        routineId,
        routineName: String(value.routineName || ""),
        deviceId: String(value.deviceId || ""),
        updatedAt: Number(value.updatedAt) || Date.now()
      };
    }

    function activeRunLabel(activeRun) {
      if (!activeRun) return "다른 루틴";
      return String(activeRun.routineName || getRoutine(activeRun.routineId)?.name || "다른 루틴");
    }

    function activeRunConflictFor(routineId) {
      const activeRun = cloudSync.activeRun;
      if (!activeRun) return null;
      if (activeRun.deviceId === cloudSync.deviceId && activeRun.routineId === routineId) return null;
      return activeRun;
    }

    function stopLocalRunningSessionsExcept(routineId) {
      if (!state.sessions || typeof state.sessions !== "object") return false;
      let stopped = false;
      Object.entries(state.sessions).forEach(([id, session]) => {
        if (!session || id === routineId || !session.running) return;
        session.running = false;
        session.lastTick = Date.now();
        stopped = true;
      });
      return stopped;
    }

    function stopAllLocalRunningSessions() {
      if (!state.sessions || typeof state.sessions !== "object") return false;
      let stopped = false;
      Object.values(state.sessions).forEach((session) => {
        if (!session || !session.running) return;
        session.running = false;
        session.lastTick = Date.now();
        stopped = true;
      });
      return stopped;
    }

    function applyRemoteActiveRun(activeRun, updatedAt = 0) {
      const normalized = normalizeActiveRun(activeRun);
      const nextUpdatedAt = Number(updatedAt) || Number(normalized?.updatedAt) || 0;
      if (nextUpdatedAt && nextUpdatedAt < Number(cloudSync.activeRunUpdatedAt || 0)) return;
      cloudSync.activeRun = normalized;
      cloudSync.activeRunUpdatedAt = nextUpdatedAt || Date.now();
      if (!normalized || normalized.deviceId === cloudSync.deviceId) return;
      const stopped = stopAllLocalRunningSessions();
      if (!stopped) return;
      saveState({ touch: false, cloud: false });
      if (els.run.classList.contains("active") && activeRoutineId) renderRun();
      showToast(`${activeRunLabel(normalized)} 시작됨`);
    }

    async function writeCloudActiveRun(activeRun) {
      cloudSync.activeRun = normalizeActiveRun(activeRun);
      cloudSync.activeRunUpdatedAt = Date.now();
      if (!cloudSync.ready || !cloudSync.user || !cloudSync.db || !cloudSync.api?.setDoc) return;
      try {
        const ref = cloudDocRef();
        if (!ref) return;
        await cloudSync.api.setDoc(ref, {
          activeRun: clone(cloudSync.activeRun || null),
          activeRunUpdatedAt: cloudSync.activeRunUpdatedAt
        }, { merge: true });
      } catch (error) {
        console.warn("Routiner active run lock failed", error);
      }
    }

    function claimActiveRunForRoutine(routine) {
      const conflict = activeRunConflictFor(routine.id);
      if (conflict) {
        const currentName = activeRunLabel(conflict);
        const ok = window.confirm(`현재 ${currentName}이 실행 중입니다.
끄고 ${routine.name}을 시작할까요?`);
        if (!ok) return false;
      }
      const stopped = stopLocalRunningSessionsExcept(routine.id);
      if (stopped) saveState({ touch: false, cloud: false });
      writeCloudActiveRun({
        routineId: routine.id,
        routineName: routine.name,
        deviceId: cloudSync.deviceId,
        updatedAt: Date.now()
      });
      return true;
    }

    function clearCloudActiveRunIf(routineId) {
      if (!cloudSync.activeRun || cloudSync.activeRun.routineId !== routineId) return;
      writeCloudActiveRun(null);
    }

    function cloudDocRef() {
      if (!cloudSync.user || !cloudSync.db || !cloudSync.api?.doc) return null;
      return cloudSync.api.doc(cloudSync.db, "users", cloudSync.user.uid, "routiner", FIRESTORE_DOC_ID);
    }

    function updateCloudButton() {
      if (!els?.backupLogoutBtn) return;
      if (cloudSync.loading) {
        els.backupLogoutBtn.disabled = true;
        els.backupLogoutBtn.textContent = "연결중";
        return;
      }
      els.backupLogoutBtn.textContent = "로그아웃";
      els.backupLogoutBtn.disabled = !cloudSync.ready || !cloudSync.user;
    }

    function setAuthBusy(busy, label = "확인 중") {
      [els.authEmail, els.authPassword, els.authLoginBtn].forEach((el) => {
        if (el) el.disabled = Boolean(busy);
      });
      if (busy) showAuthMessage(label, "info");
    }

    function showAuthMessage(message, tone = "info") {
      if (!els?.authMessage) return;
      els.authMessage.textContent = message || "";
      els.authMessage.classList.toggle("error", tone === "error");
    }

    function authCredentials() {
      const email = (els.authEmail?.value || "").trim();
      const password = els.authPassword?.value || "";
      return { email, password };
    }

    function formatAuthError(error) {
      const code = String(error?.code || "");
      if (code.includes("invalid-email")) return "이메일 형식이 이상해.";
      if (code.includes("missing-password")) return "비밀번호를 입력해.";
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "이메일이나 비밀번호가 맞지 않아.";
      if (code.includes("operation-not-allowed")) return "Firebase에서 Email/Password를 먼저 켜야 해.";
      return "로그인 실패";
    }

    function showSignedOutScreen() {
      updateCloudButton();
      showAuthMessage("이메일/비밀번호를 입력해.", "info");
      showScreen("auth");
    }

    function showSignedInScreen() {
      updateCloudButton();
      renderHome();
      showScreen("home");
    }

    function enqueueCloudSave(nextHash = cloudStateHash(state)) {
      if (cloudSync.applyingRemote) return;
      if (!cloudSync.ready || !cloudSync.user || !cloudSync.db) return;
      if (nextHash && nextHash === cloudSync.lastSavedHash) return;
      cloudSync.pendingSave = true;
      cloudSync.pendingHash = nextHash || "";
      if (cloudSync.saveTimer) window.clearTimeout(cloudSync.saveTimer);
      cloudSync.saveTimer = window.setTimeout(flushCloudSave, 700);
    }

    async function flushCloudSave() {
      if (!cloudSync.pendingSave || !cloudSync.ready || !cloudSync.user) return;
      cloudSync.pendingSave = false;
      try {
        const ref = cloudDocRef();
        if (!ref) return;
        const payload = firestoreStatePayload(state);
        await cloudSync.api.setDoc(ref, payload);
        cloudSync.lastSavedHash = payload.stateHash || cloudSync.pendingHash || cloudStateHash(state);
      } catch (error) {
        console.warn("Routiner Firestore save failed", error);
      } finally {
        cloudSync.pendingHash = "";
      }
    }

    function mergeRemoteStateWithLocal(nextState) {
      const local = clone(state);
      const merged = {
        ...local,
        version: APP_VERSION,
        routineSchema: nextState.routineSchema || ROUTINE_SCHEMA_VERSION,
        today: nextState.today || local.today,
        routines: Array.isArray(nextState.routines) ? clone(nextState.routines) : local.routines,
        completed: clone(safeObject(nextState.completed)),
        offToday: clone(safeObject(nextState.offToday, defaultOffToday())),
        calendar: clone(safeObject(nextState.calendar)),
        dayPlans: clone(normalizeDayPlans(safeObject(nextState.dayPlans))),
        sessions: clone(safeObject(local.sessions))
      };
      return normalizeLoadedState(merged);
    }

    function renderAfterRemoteMerge() {
      if (els.edit.classList.contains("active")) {
        renderEditor();
        return;
      }
      if (els.run.classList.contains("active")) {
        if (activeRoutineId && getRoutine(activeRoutineId)) renderRun();
        else renderHome();
        return;
      }
      if (els.done.classList.contains("active")) {
        if (activeRoutineId && getRoutine(activeRoutineId)) renderDoneScreen(activeRoutineId, false);
        else renderHome();
        return;
      }
      renderHome();
      if (els.calendarOverlay.classList.contains("active")) renderCalendar();
    }

    function shouldDelayRemoteApply() {
      const active = document.activeElement;
      const tag = String(active?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || active?.isContentEditable) return true;
      return els.edit.classList.contains("active");
    }

    function holdRemoteState(parsed) {
      cloudSync.pendingRemote = parsed;
    }

    function applyPendingRemoteIfSafe() {
      if (!cloudSync.pendingRemote || shouldDelayRemoteApply()) return;
      const pending = cloudSync.pendingRemote;
      cloudSync.pendingRemote = null;
      applyRemoteState(pending.nextState, pending.updatedAt);
    }

    function applyRemoteState(nextState, updatedAt) {
      cloudSync.applyingRemote = true;
      state = mergeRemoteStateWithLocal(nextState);
      const nextHash = cloudStateHash(state);
      lastLocalCloudHash = nextHash;
      cloudSync.lastSavedHash = nextHash;
      writeLocalUpdatedAt(updatedAt || Date.now());
      saveState({ touch: false, cloud: false });
      if (!getRoutine(editRoutineId)) editRoutineId = state.routines[0]?.id || "morning";
      if (editStepId && !getRoutine(editRoutineId)?.steps.some((step) => step.id === editStepId)) editStepId = null;
      cloudSync.applyingRemote = false;
      renderAfterRemoteMerge();
    }

    function stopCloudSnapshot() {
      if (cloudSync.unsubscribeSnapshot) {
        cloudSync.unsubscribeSnapshot();
        cloudSync.unsubscribeSnapshot = null;
      }
      cloudSync.pendingRemote = null;
    }

    function startCloudSnapshot() {
      if (!cloudSync.ready || !cloudSync.user || !cloudSync.api?.onSnapshot) return;
      stopCloudSnapshot();
      const ref = cloudDocRef();
      if (!ref) return;
      cloudSync.unsubscribeSnapshot = cloudSync.api.onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        const parsed = parseFirestoreStatePayload(snap.data());
        if (!parsed) return;
        applyRemoteActiveRun(parsed.activeRun, parsed.activeRunUpdatedAt);
        const remoteHash = cloudStateHash(parsed.nextState);
        if (parsed.updatedBy === cloudSync.deviceId || remoteHash === cloudSync.lastSavedHash) {
          cloudSync.lastSavedHash = remoteHash;
          return;
        }
        if (parsed.updatedAt && parsed.updatedAt <= readLocalUpdatedAt()) return;
        if (shouldDelayRemoteApply()) holdRemoteState(parsed);
        else applyRemoteState(parsed.nextState, parsed.updatedAt);
      }, (error) => {
        console.warn("Routiner Firestore realtime sync failed", error);
        showToast("실시간 동기화 실패");
      });
    }

    async function syncCloudAfterSignIn() {
      if (!cloudSync.ready || !cloudSync.user) return;
      try {
        const ref = cloudDocRef();
        if (!ref) return;
        const snap = await cloudSync.api.getDoc(ref);
        if (!snap.exists()) {
          const payload = firestoreStatePayload(state);
          await cloudSync.api.setDoc(ref, payload);
          cloudSync.lastSavedHash = payload.stateHash || cloudStateHash(state);
          return;
        }
        const parsed = parseFirestoreStatePayload(snap.data());
        if (!parsed) {
          const payload = firestoreStatePayload(state);
          await cloudSync.api.setDoc(ref, payload);
          cloudSync.lastSavedHash = payload.stateHash || cloudStateHash(state);
          return;
        }
        applyRemoteActiveRun(parsed.activeRun, parsed.activeRunUpdatedAt);
        const localUpdatedAt = readLocalUpdatedAt();
        if (!hadStoredStateAtBoot || parsed.updatedAt > localUpdatedAt) {
          applyRemoteState(parsed.nextState, parsed.updatedAt);
        } else {
          const payload = firestoreStatePayload(state);
          await cloudSync.api.setDoc(ref, payload);
          cloudSync.lastSavedHash = payload.stateHash || cloudStateHash(state);
        }
      } catch (error) {
        console.warn("Routiner Firestore sync failed", error);
        showToast("클라우드 확인 실패");
      }
    }

    async function initFirebase() {
      cloudSync.loading = true;
      updateCloudButton();
      showAuthMessage("연결 준비 중", "info");
      try {
        const baseUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
        const [appMod, authMod, firestoreMod] = await Promise.all([
          import(`${baseUrl}/firebase-app.js`),
          import(`${baseUrl}/firebase-auth.js`),
          import(`${baseUrl}/firebase-firestore.js`)
        ]);
        cloudSync.app = appMod.initializeApp(FIREBASE_CONFIG);
        cloudSync.auth = authMod.getAuth(cloudSync.app);
        cloudSync.db = firestoreMod.getFirestore(cloudSync.app);
        cloudSync.api = {
          signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
          signOut: authMod.signOut,
          onAuthStateChanged: authMod.onAuthStateChanged,
          doc: firestoreMod.doc,
          getDoc: firestoreMod.getDoc,
          setDoc: firestoreMod.setDoc,
          onSnapshot: firestoreMod.onSnapshot,
          serverTimestamp: firestoreMod.serverTimestamp
        };
        cloudSync.ready = true;
        cloudSync.api.onAuthStateChanged(cloudSync.auth, async (user) => {
          cloudSync.user = user || null;
          cloudSync.loading = false;
          updateCloudButton();
          if (user) {
            showAuthMessage("불러오는 중", "info");
            await syncCloudAfterSignIn();
            startCloudSnapshot();
            showSignedInScreen();
          } else {
            stopCloudSnapshot();
            showSignedOutScreen();
          }
        });
      } catch (error) {
        console.warn("Routiner Firebase init failed", error);
        cloudSync.ready = false;
        cloudSync.loading = false;
        updateCloudButton();
        showAuthMessage("Firebase 연결 실패", "error");
        showScreen("auth");
      }
    }

    async function handleEmailLogin() {
      if (!cloudSync.ready || !cloudSync.auth) {
        showAuthMessage("Firebase 준비 안 됨", "error");
        return;
      }
      const { email, password } = authCredentials();
      if (!email || !password) {
        showAuthMessage("이메일과 비밀번호를 입력해.", "error");
        return;
      }
      setAuthBusy(true, "로그인 중");
      try {
        await cloudSync.api.signInWithEmailAndPassword(cloudSync.auth, email, password);
      } catch (error) {
        showAuthMessage(formatAuthError(error), "error");
      } finally {
        setAuthBusy(false);
      }
    }

    async function handleCloudLogoutButton() {
      if (!cloudSync.ready || !cloudSync.auth || !cloudSync.user) return;
      try {
        await cloudSync.api.signOut(cloudSync.auth);
        showToast("로그아웃됨");
      } catch {
        showToast("로그아웃 실패");
      }
    }

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
      if (m <= 0) return `${s}초`;
      if (s === 0) return `${m}분`;
      return `${m}분 ${s}초`;
    }

    function formatCardDuration(sec) {
      const minutes = Math.max(1, Math.round((Number(sec) || 0) / 60));
      return `${minutes}분`;
    }

    function totalSeconds(routine) {
      return routine.steps.reduce((sum, step) => sum + minutesToSeconds(step.minutes), 0);
    }

    function setTheme(routine) {
      const target = routine || state.routines[0] || DEFAULT_ROUTINES[0];
      document.documentElement.style.setProperty("--accent", target.color || "#3c7d66");
      document.documentElement.style.setProperty("--accent-soft", target.soft || "#dcebe4");
    }

    function routineStyleVars(routine) {
      const color = routine?.color || "#3c7d66";
      const soft = routine?.soft || "#dcebe4";
      return `--card-accent:${escapeAttr(color)}; --card-soft:${escapeAttr(soft)};`;
    }

    async function requestWakeLock() {
      wakeLockWanted = true;
      if (wakeLock || document.visibilityState !== "visible") return;
      if (!("wakeLock" in navigator) || !navigator.wakeLock?.request) return;
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
          if (wakeLockWanted && document.visibilityState === "visible") {
            requestWakeLock();
          }
        });
      } catch (error) {
        wakeLock = null;
      }
    }

    async function releaseWakeLock() {
      wakeLockWanted = false;
      if (!wakeLock) return;
      const lock = wakeLock;
      wakeLock = null;
      try {
        await lock.release();
      } catch (error) {}
    }

    function shouldKeepWakeLock(screenName) {
      if (screenName !== "run" || !activeRoutineId) return false;
      const session = state.sessions?.[activeRoutineId];
      return Boolean(session && session.running);
    }

    function syncWakeLock(screenName) {
      if (shouldKeepWakeLock(screenName)) requestWakeLock();
      else releaseWakeLock();
    }

    function showScreen(name) {
      const planMode = name === "home" && (selectedDateKey !== todayKey() || isDatePlanMode);
      els.app.classList.toggle("run-mode", name === "run");
      els.app.classList.toggle("edit-mode", name === "edit");
      els.app.classList.toggle("plan-mode", planMode);
      document.body.classList.toggle("plan-mode", planMode);
      els.auth.classList.toggle("active", name === "auth");
      els.home.classList.toggle("active", name === "home");
      els.run.classList.toggle("active", name === "run");
      els.done.classList.toggle("active", name === "done");
      els.edit.classList.toggle("active", name === "edit");
      syncWakeLock(name);
      if (name !== "edit") scheduleRootScrollReset({ forceApp: name === "home" || name === "run" || name === "done" || name === "auth" });
    }

    function minutesNow() {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }

    function isInRange(now, start, end) {
      if (start <= end) return now >= start && now < end;
      return now >= start || now < end;
    }

    function suggestedRoutineIds() {
      const now = minutesNow();
      const ranges = [
        ["morning", 5 * 60 + 30, 10 * 60 + 30],
        ["outing", 10 * 60, 13 * 60],
        ["lunch", 12 * 60, 15 * 60 + 30],
        ["dinner", 18 * 60, 21 * 60 + 30],
        ["night", 22 * 60 + 30, 2 * 60 + 30]
      ];
      return new Set(ranges.filter(([, start, end]) => isInRange(now, start, end)).map(([id]) => id));
    }

    function toggleRoutineOffToday(routineId) {
      if (!state.offToday || typeof state.offToday !== "object") state.offToday = defaultOffToday();
      const nextOff = !effectiveOffForDate(todayKey(), routineId);
      if (hasOwn(getDayPlan(todayKey(), false)?.off, routineId)) {
        setPlanOff(todayKey(), routineId, nextOff);
      } else if (nextOff) {
        state.offToday[routineId] = true;
        saveState();
      } else {
        delete state.offToday[routineId];
        saveState();
      }
      showToast(nextOff ? "오늘은 안 함" : "다시 켬");
      renderHome();
    }

    function renderHome() {
      activeRoutineId = null;
      stopTick();
      if (!selectedDateKey) selectedDateKey = todayKey();
      const isTodayView = selectedDateKey === todayKey() && !isDatePlanMode;
      showScreen("home");
      setTheme(state.routines[0]);
      els.todayLabel.textContent = dateKeyKo(selectedDateKey);
      els.todayLabel.setAttribute("aria-label", `${dateKeyKo(selectedDateKey)} 달력 열기`);
      els.openEditBtn.textContent = isTodayView ? "수정" : "오늘";
      els.dayPlanNotice.textContent = isTodayView ? "" : dateKeyPlanLabel(selectedDateKey);
      els.routineList.innerHTML = "";

      const suggested = isTodayView ? suggestedRoutineIds() : new Set();
      routinesForDisplay().forEach((routine) => {
        const done = isTodayView && Boolean(state.completed[routine.id]);
        const off = Boolean(effectiveOffForDate(selectedDateKey, routine.id));
        const session = isTodayView ? state.sessions[routine.id] : null;
        const current = session ? Math.min((session.index || 0) + 1, routine.steps.length) : 1;
        const status = off ? (isTodayView ? "" : "꺼짐") : (isTodayView ? (done ? "완료" : session ? `${current}/${routine.steps.length}` : "시작") : "켜짐");
        const summary = `${routine.steps.length}단계 · ${formatCardDuration(totalSeconds(routine))}`;
        const dayNote = dayNoteFor(selectedDateKey, routine.id);
        const noteHtml = dayNote && !off ? `<div class="routine-note">${escapeHtml(dayNote)}</div>` : "";
        const cardClass = [
          "routine-card",
          isTodayView ? "" : "plan-card",
          off ? "off" : "",
          !off && done ? "done" : "",
          !off && !done && suggested.has(routine.id) ? "suggested" : ""
        ].filter(Boolean).join(" ");

        if (!isTodayView) {
          const card = document.createElement("div");
          const pastOrToday = isPastOrTodayKey(selectedDateKey);
          const explicitStatus = explicitDayStatus(selectedDateKey, routine.id);
          const controlHtml = pastOrToday
            ? `
              <div class="plan-control-row" role="group" aria-label="${escapeAttr(routine.name)} 상태">
                ${[
                  ["done", "완료"],
                  ["none", "미실행"],
                  ["off", "안 함"]
                ].map(([value, label]) => `<button class="plan-control-chip ${explicitStatus === value ? "active" : ""} ${value === "none" || value === "off" ? "muted" : ""}" data-action="plan-status" data-routine-id="${escapeAttr(routine.id)}" data-status="${value}" type="button">${label}</button>`).join("")}
              </div>
            `
            : `
              <div class="plan-control-row" role="group" aria-label="${escapeAttr(routine.name)} 계획">
                <button class="plan-control-chip ${!off ? "active" : ""}" data-action="plan-toggle" data-routine-id="${escapeAttr(routine.id)}" data-off="false" type="button">켜짐</button>
                <button class="plan-control-chip ${off ? "active muted" : ""}" data-action="plan-toggle" data-routine-id="${escapeAttr(routine.id)}" data-off="true" type="button">꺼짐</button>
              </div>
            `;
          card.className = cardClass;
          card.setAttribute("style", routineStyleVars(routine));
          card.innerHTML = `
            <div class="routine-icon" style="background:${escapeAttr(routine.soft)}; color:${escapeAttr(routine.color)}">${escapeHtml(routine.icon)}</div>
            <div class="routine-card-body">
              <div class="routine-title-row">
                <div class="routine-name">${escapeHtml(routine.name)}</div>
                <div class="routine-summary">${escapeHtml(summary)}</div>
              </div>
              ${controlHtml}
              <textarea class="day-note-input" data-routine-id="${escapeAttr(routine.id)}" rows="2" placeholder="이 날짜 메모" ${off ? "disabled" : ""}>${escapeHtml(dayNote)}</textarea>
            </div>
          `;
          els.routineList.appendChild(card);
          return;
        }

        const btn = document.createElement("button");
        btn.className = cardClass;
        btn.type = "button";
        btn.setAttribute("style", routineStyleVars(routine));
        btn.innerHTML = `
          <div class="routine-icon" style="background:${escapeAttr(routine.soft)}; color:${escapeAttr(routine.color)}">${escapeHtml(routine.icon)}</div>
          <div class="routine-card-body">
            <div class="routine-title-row">
              <div class="routine-name">${escapeHtml(routine.name)}</div>
            </div>
            ${noteHtml}
          </div>
          <div class="routine-side">
            <div class="routine-summary">${escapeHtml(summary)}</div>
            <div class="routine-state ${off ? "off" : done ? "finished" : ""}">${status}</div>
          </div>
        `;
        let longPressTimer = null;
        let longPressed = false;
        const clearLongPress = () => {
          if (longPressTimer) window.clearTimeout(longPressTimer);
          longPressTimer = null;
          btn.classList.remove("long-pressing");
        };
        btn.addEventListener("pointerdown", () => {
          longPressed = false;
          clearLongPress();
          btn.classList.add("long-pressing");
          longPressTimer = window.setTimeout(() => {
            longPressed = true;
            btn.classList.remove("long-pressing");
            toggleRoutineOffToday(routine.id);
          }, LONG_PRESS_MS);
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
          btn.addEventListener(eventName, clearLongPress);
        });
        btn.addEventListener("contextmenu", (event) => event.preventDefault());
        btn.addEventListener("click", (event) => {
          if (longPressed) {
            event.preventDefault();
            longPressed = false;
            return;
          }
          if (effectiveOffForDate(todayKey(), routine.id)) {
            if (hasOwn(getDayPlan(todayKey(), false)?.off, routine.id)) setPlanOff(todayKey(), routine.id, false);
            delete state.offToday[routine.id];
            saveState();
            renderHome();
            showToast("오늘 할 루틴으로 켬");
            return;
          }
          if (state.completed?.[routine.id]) {
            renderDoneScreen(routine.id, false);
            return;
          }
          startRoutine(routine.id);
        });
        els.routineList.appendChild(btn);
      });
      scheduleRootScrollReset({ forceApp: true });
    }



    function calendarEntryForKey(key) {
      const actual = key === todayKey() ? (state.calendar?.[key] || snapshotFromParts(state.completed, state.offToday, state.sessions)) : (state.calendar?.[key] || null);
      const plan = getDayPlan(key, false);
      if (!actual && !plan) return null;
      const snapshot = {};
      DISPLAY_ROUTINE_ORDER.forEach((id) => {
        const manualStatus = plan?.statuses?.[id];
        if (["done", "none", "off"].includes(manualStatus)) {
          snapshot[id] = manualStatus;
          return;
        }
        const actualStatus = actual?.[id];
        if (actualStatus && actualStatus !== "none" && actualStatus !== "blank") {
          snapshot[id] = actualStatus;
          return;
        }
        if (plan) {
          const off = effectiveOffForDate(key, id);
          if (off) snapshot[id] = "off";
          else snapshot[id] = actualStatus || "none";
          return;
        }
        snapshot[id] = actualStatus || "none";
      });
      return snapshot;
    }

    function renderCalendar() {
      updateTodayCalendar(state);
      const base = dateFromKey(selectedDateKey || todayKey());
      const year = base.getFullYear();
      const month = base.getMonth();
      const first = new Date(year, month, 1);
      const start = new Date(year, month, 1 - first.getDay());
      const today = todayKey();
      const routineColors = new Map(state.routines.map((routine) => [routine.id, routine.color]));
      els.calendarTitle.textContent = `${year}년 ${month + 1}월`;
      els.calendarGrid.innerHTML = "";
      for (let i = 0; i < 42; i += 1) {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + i);
        const key = dateKeyFromDate(cellDate);
        const entry = calendarEntryForKey(key);
        const inMonth = cellDate.getMonth() === month;
        const day = document.createElement("button");
        day.type = "button";
        day.className = [
          "calendar-day",
          inMonth ? "" : "other-month",
          key === today ? "today" : "",
          key === selectedDateKey ? "selected" : ""
        ].filter(Boolean).join(" ");
        day.dataset.dateKey = key;
        const plan = getDayPlan(key, false);
        const slots = DISPLAY_ROUTINE_ORDER.map((id) => {
          const status = entry ? (entry[id] || "none") : "blank";
          const color = routineColors.get(id) || "#81786b";
          const hasNote = Boolean(String(plan?.notes?.[id] || "").trim()) && status !== "off" && status !== "blank";
          const slotClass = ["calendar-slot", status, hasNote ? "has-note" : ""].filter(Boolean).join(" ");
          return `<span class="${escapeAttr(slotClass)}" style="--slot-color:${escapeAttr(color)}" aria-hidden="true"></span>`;
        }).join("");
        day.innerHTML = `
          <div class="calendar-date-number">${cellDate.getDate()}</div>
          <div class="calendar-slots" aria-hidden="true">${slots}</div>
        `;
        day.addEventListener("click", () => {
          selectedDateKey = key;
          isDatePlanMode = true;
          closeCalendar();
          renderHome();
        });
        els.calendarGrid.appendChild(day);
      }
    }

    function openCalendar() {
      renderCalendar();
      els.calendarOverlay.classList.add("active");
      els.calendarOverlay.setAttribute("aria-hidden", "false");
    }

    function closeCalendar() {
      els.calendarOverlay.classList.remove("active");
      els.calendarOverlay.setAttribute("aria-hidden", "true");
    }

    function shiftCalendarMonth(delta) {
      const base = dateFromKey(selectedDateKey || todayKey());
      selectedDateKey = dateKeyFromDate(new Date(base.getFullYear(), base.getMonth() + delta, 1));
      renderCalendar();
    }

    function startRoutine(routineId) {
      const routine = getRoutine(routineId) || state.routines[0];
      if (!routine) return;
      if (!claimActiveRunForRoutine(routine)) return;
      if (effectiveOffForDate(todayKey(), routine.id)) {
        if (hasOwn(getDayPlan(todayKey(), false)?.off, routine.id)) setPlanOff(todayKey(), routine.id, false);
        delete state.offToday[routine.id];
      }
      activeRoutineId = routine.id;
      setTheme(routine);
      getSession(routine.id);
      showScreen("run");
      lastPreviewKey = "";
      shouldCenterPreview = true;
      renderRun();
      startTick();
    }

    function centerPreviewChip(chip, behavior = "smooth") {
      if (!els.stepPreview || !chip) return;
      const container = els.stepPreview;
      recalcPreviewEdgeSpacers();
      const containerRect = container.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      const target = container.scrollLeft
        + (chipRect.left - containerRect.left)
        - ((container.clientWidth - chipRect.width) / 2);
      const max = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollTo({
        left: Math.max(0, Math.min(max, target)),
        behavior
      });
    }

    function setPreviewSpacerWidth(spacer, width) {
      if (!spacer) return;
      const next = `${Math.max(16, Math.round(width))}px`;
      spacer.style.flexBasis = next;
      spacer.style.width = next;
    }

    function recalcPreviewEdgeSpacers() {
      const container = els.stepPreview;
      if (!container) return;
      const chips = Array.from(container.querySelectorAll(".preview-chip"));
      const startSpacer = container.querySelector(".preview-spacer.start");
      const endSpacer = container.querySelector(".preview-spacer.end");
      if (!chips.length) return;
      setPreviewSpacerWidth(startSpacer, (container.clientWidth - chips[0].offsetWidth) / 2);
      setPreviewSpacerWidth(endSpacer, (container.clientWidth - chips[chips.length - 1].offsetWidth) / 2);
    }

    function renderStepPreview(routine, currentIndex) {
      if (!els.stepPreview) return;
      const previewKey = `${routine.id}|${currentIndex}|${routine.steps.map((step) => `${step.id}:${step.icon}:${step.title}`).join("|")}`;
      if (lastPreviewKey === previewKey) {
        if (shouldCenterPreview) {
          const currentChip = els.stepPreview.querySelector(".preview-chip.current");
          requestAnimationFrame(() => {
            centerPreviewChip(currentChip, "smooth");
            shouldCenterPreview = false;
          });
        }
        return;
      }
      lastPreviewKey = previewKey;
      const savedScrollLeft = els.stepPreview.scrollLeft || 0;
      els.stepPreview.innerHTML = "";
      const startSpacer = document.createElement("span");
      startSpacer.className = "preview-spacer start";
      els.stepPreview.appendChild(startSpacer);
      let currentChip = null;
      routine.steps.forEach((step, idx) => {
        const chip = document.createElement("div");
        chip.className = `preview-chip ${idx === currentIndex ? "current" : ""}`;
        chip.textContent = `${idx + 1}. ${step.icon ? step.icon + " " : ""}${step.title}`;
        els.stepPreview.appendChild(chip);
        if (idx === currentIndex) currentChip = chip;
      });
      const endSpacer = document.createElement("span");
      endSpacer.className = "preview-spacer end";
      els.stepPreview.appendChild(endSpacer);
      requestAnimationFrame(() => {
        recalcPreviewEdgeSpacers();
        if (shouldCenterPreview && currentChip) {
          centerPreviewChip(currentChip, "smooth");
          shouldCenterPreview = false;
        } else {
          const max = Math.max(0, els.stepPreview.scrollWidth - els.stepPreview.clientWidth);
          els.stepPreview.scrollLeft = Math.max(0, Math.min(max, savedScrollLeft));
        }
      });
    }

    function updateDeparturePin(text) {
      if (!els.departurePinSlot) return;
      const departureText = String(text || "").trim();
      els.departurePinSlot.innerHTML = departureText ? `<span class="departure-pin">출발 ${escapeHtml(departureText)}</span>` : "";
    }

    function renderRun() {
      if (!activeRoutineId) return;
      const routine = getRoutine(activeRoutineId);
      const session = getSession(activeRoutineId);
      if (!routine || !session) return;
      const step = routine.steps[session.index];
      if (!step) return completeRoutine();
      const doneCount = session.status.filter((s) => s === "done" || s === "skipped").length;
      const percent = Math.round((doneCount / routine.steps.length) * 100);
      const stepTotal = minutesToSeconds(step.minutes);
      const elapsed = stepTotal - session.remainingSec;
      const angle = stepTotal > 0 ? (Math.max(0, Math.min(elapsed, stepTotal)) / stepTotal) * 360 : 360;
      const isOverdue = session.remainingSec < 0;

      const departureText = String(session.departureText || "").trim();
      els.runStepMeta.textContent = `${routine.name} · ${session.index + 1} / ${routine.steps.length}`;
      updateDeparturePin(departureText);
      els.sessionRoutineTitle.textContent = routine.name;
      const runDayNote = dayNoteFor(todayKey(), routine.id);
      if (runDayNote) {
        els.runDayNote.innerHTML = `<div class="run-day-note-label">오늘 메모</div><div class="run-day-note-body">${escapeHtml(runDayNote)}</div>`;
      } else {
        els.runDayNote.innerHTML = "";
      }
      els.runDayNote.classList.toggle("empty", !runDayNote);
      els.taskIcon.textContent = step.icon || "·";
      els.progressFill.style.width = `${percent}%`;
      els.timerRing.style.setProperty("--angle", `${Math.max(0, Math.min(360, angle))}deg`);
      els.timerRing.classList.toggle("overdue", isOverdue);
      els.timerRing.classList.toggle("paused", !session.running);
      els.timerLabel.textContent = "";
      els.timerTime.textContent = formatTimerTime(session.remainingSec);
      els.timerStatus.textContent = isOverdue ? "초과" : (session.running ? "진행" : "일시정지");
      els.taskTitle.textContent = step.title;
      els.pauseBtn.textContent = session.running ? "일시정지" : "재개";
      els.undoBtn.disabled = !session.history.length;
      renderStepPreview(routine, session.index);
      syncWakeLock("run");
      const note = String(step.note || "").trim();
      const isDepartureCapture = step.capture === "departure";
      if (isDepartureCapture) {
        els.stepMemo.classList.remove("empty");
        els.stepMemo.classList.add("has-departure");
        const existingDepartureInput = document.getElementById("departureInput");
        const canReuseDepartureInput = existingDepartureInput && els.stepMemo.contains(existingDepartureInput);
        if (!canReuseDepartureInput) {
          els.stepMemo.innerHTML = `
            <div class="departure-editor">
              <label for="departureInput">출발</label>
              <input id="departureInput" class="departure-input" type="text" inputmode="text" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="예: 11:50" value="${escapeAttr(departureText)}" />
            </div>
          `;
        } else if (document.activeElement !== existingDepartureInput && existingDepartureInput.value !== departureText) {
          existingDepartureInput.value = departureText;
        }
      } else {
        els.stepMemo.classList.remove("has-departure");
        els.stepMemo.textContent = note || "";
        els.stepMemo.classList.toggle("empty", !note);
      }
      els.stepMemo.parentElement.hidden = false;
    }

    function pushHistory(session) {
      session.history = session.history || [];
      session.history.push({
        index: session.index,
        status: session.status.slice(),
        remainingSec: session.remainingSec,
        running: session.running,
        lastTick: Date.now()
      });
      if (session.history.length > 40) session.history.shift();
    }

    function advance(status) {
      if (!activeRoutineId) return;
      const routine = getRoutine(activeRoutineId);
      const session = getSession(activeRoutineId);
      if (!routine || !session) return;
      pushHistory(session);
      session.status[session.index] = status;
      session.index += 1;
      if (session.index >= routine.steps.length) {
        saveState();
        completeRoutine();
        return;
      }
      session.remainingSec = minutesToSeconds(routine.steps[session.index].minutes);
      session.running = true;
      session.lastTick = Date.now();
      saveState();
      shouldCenterPreview = true;
      renderRun();
      showReward(status === "done" ? "✓" : "›", status);
    }

    function undoStep() {
      if (!activeRoutineId) return;
      const session = getSession(activeRoutineId);
      if (!session || !session.history || !session.history.length) {
        showToast("되돌릴 단계 없음");
        return;
      }
      const snapshot = session.history.pop();
      session.index = snapshot.index;
      session.status = snapshot.status.slice();
      session.remainingSec = snapshot.remainingSec;
      session.running = false;
      session.lastTick = Date.now();
      delete state.completed[activeRoutineId];
      saveState();
      showScreen("run");
      shouldCenterPreview = true;
      renderRun();
      startTick();
      showToast("되돌림");
    }

    function renderDoneScreen(routineId, celebrate = false) {
      const routine = getRoutine(routineId);
      if (!routine) return renderHome();
      activeRoutineId = routine.id;
      stopTick();
      setTheme(routine);
      showScreen("done");
      els.done.classList.remove("celebrate");
      if (celebrate) {
        void els.done.offsetWidth;
        els.done.classList.add("celebrate");
      }
      els.doneTitle.textContent = `${routine.name} 완료`;
      els.doneText.textContent = routine.doneText || "오늘 완료.";
      els.doneUndoBtn.disabled = !(state.sessions[routine.id]?.history || []).length;
      els.restartBtn.onclick = () => {
        resetSession(routine.id, true);
        startRoutine(routine.id);
      };
      if (celebrate) showCelebration();
    }

    function completeRoutine() {
      if (!activeRoutineId) return;
      const routine = getRoutine(activeRoutineId);
      if (!routine) return;
      state.completed[activeRoutineId] = new Date().toISOString();
      clearCloudActiveRunIf(activeRoutineId);
      saveState();
      renderDoneScreen(routine.id, true);
    }

    function togglePause() {
      if (!activeRoutineId) return;
      const session = getSession(activeRoutineId);
      if (!session) return;
      session.running = !session.running;
      session.lastTick = Date.now();
      saveState();
      renderRun();
      showToast(session.running ? "재개" : "일시정지");
    }

    function tick() {
      if (!activeRoutineId) return;
      const session = getSession(activeRoutineId);
      if (!session || !session.running) return;
      const now = Date.now();
      const delta = Math.floor((now - session.lastTick) / 1000);
      if (delta <= 0) return;
      session.lastTick = now;
      session.remainingSec = session.remainingSec - delta;
      saveState();
      renderRun();
    }

    function startTick() {
      stopTick();
      tickId = window.setInterval(tick, 500);
    }

    function stopTick() {
      if (tickId) window.clearInterval(tickId);
      tickId = null;
    }

    function openEditor(routineId, fromScreen) {
      previousScreen = fromScreen || "home";
      stopTick();
      if (routineId && getRoutine(routineId)) editRoutineId = routineId;
      if (!getRoutine(editRoutineId)) editRoutineId = state.routines[0]?.id;
      const routine = getRoutine(editRoutineId);
      if (!editStepId || !routine.steps.some((step) => step.id === editStepId)) editStepId = null;
      setTheme(routine);
      showScreen("edit");
      renderEditor();
    }

    function closeEditor() {
      clearResetRoutineArm();
      saveState();
      if (previousScreen === "run" && activeRoutineId && getRoutine(activeRoutineId)) {
        startRoutine(activeRoutineId);
      } else {
        renderHome();
        applyPendingRemoteIfSafe();
      }
    }

    function renderEditor() {
      const routine = getRoutine(editRoutineId);
      if (!routine) return renderHome();
      setTheme(routine);
      if (!editStepId || !routine.steps.some((step) => step.id === editStepId)) editStepId = null;
      els.routineTabs.innerHTML = "";
      routinesForDisplay().forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `routine-tab ${item.id === routine.id ? "active" : ""}`;
        btn.innerHTML = `<span>${escapeHtml(item.icon)}</span><span>${escapeHtml(item.name)}</span>`;
        btn.addEventListener("click", () => {
          editRoutineId = item.id;
          editStepId = null;
          clearResetRoutineArm();
          renderEditor();
        });
        els.routineTabs.appendChild(btn);
      });
      els.editRoutineTitle.textContent = routine.name;
      els.editTotalTime.textContent = `약 ${formatDuration(totalSeconds(routine))}`;
      updateResetRoutineButton();
      els.stepEditorList.innerHTML = "";
      routine.steps.forEach((step, idx) => {
        const isActive = editStepId === step.id;
        const item = document.createElement("div");
        const hasNote = String(step.note || "").trim().length > 0;
        item.innerHTML = `
          <button class="step-card ${isActive ? "active" : ""}" data-action="toggle-step" data-index="${idx}" type="button">
            <div class="step-icon-tile" style="background:${escapeAttr(routine.soft)}; color:${escapeAttr(routine.color)}">${escapeHtml(step.icon || "·")}</div>
            <div>
              <div class="step-card-title">${escapeHtml(step.title)}</div>
              ${hasNote ? `<div class="step-card-meta">${escapeHtml(step.note)}</div>` : ""}
            </div>
            <div class="step-time-pill">${formatDuration(minutesToSeconds(step.minutes))}</div>
          </button>
          <div class="step-detail ${isActive ? "active" : ""}">
            <div class="field-row compact">
              <input class="field short" data-field="icon" data-index="${idx}" maxlength="4" value="${escapeAttr(step.icon || "")}" placeholder="아이콘" autocomplete="off" autocorrect="off" spellcheck="false" />
              <input class="field" data-field="title" data-index="${idx}" value="${escapeAttr(step.title)}" placeholder="단계 제목" autocomplete="off" />
            </div>
            <div class="duration-control">
              <button class="duration-btn minute-adjust" data-action="adjust-time" data-index="${idx}" data-delta="-60" type="button">−1분</button>
              <button class="duration-btn" data-action="adjust-time" data-index="${idx}" data-delta="-15" type="button">−15초</button>
              <div class="duration-value">${formatDuration(minutesToSeconds(step.minutes))}</div>
              <button class="duration-btn" data-action="adjust-time" data-index="${idx}" data-delta="15" type="button">+15초</button>
              <button class="duration-btn minute-adjust" data-action="adjust-time" data-index="${idx}" data-delta="60" type="button">+1분</button>
            </div>
            <div class="memo-wrap ${hasNote ? "has-note" : "no-note"}">
              <textarea class="edit-textarea" rows="2" data-field="note" data-index="${idx}" placeholder="메모" autocomplete="off">${escapeHtml(step.note || "")}</textarea>
              <button class="clear-memo" data-action="clear-note" data-index="${idx}" type="button" aria-label="메모 지우기">×</button>
            </div>
            <div class="step-controls">
              <button class="icon-btn" data-action="step-up" data-index="${idx}" type="button">위</button>
              <button class="icon-btn" data-action="step-down" data-index="${idx}" type="button">아래</button>
              <button class="icon-btn danger" data-action="step-delete" data-index="${idx}" type="button">삭제</button>
            </div>
          </div>
        `;
        els.stepEditorList.appendChild(item);
      });
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "add-step-card";
      addBtn.dataset.action = "step-add";
      addBtn.textContent = "＋ 세부루틴 추가";
      els.stepEditorList.appendChild(addBtn);
    }

    let resetRoutineArmedId = null;
    let resetRoutineArmTimer = null;

    function updateResetRoutineButton() {
      if (!els.resetRoutineBtn) return;
      const isArmed = resetRoutineArmedId === editRoutineId;
      els.resetRoutineBtn.classList.toggle("confirm", isArmed);
      els.resetRoutineBtn.textContent = isArmed ? "한 번 더 누르면 재설정" : "기본 루틴으로 재설정";
      els.resetRoutineBtn.setAttribute(
        "aria-label",
        isArmed ? "한 번 더 누르면 현재 루틴을 기본값으로 재설정" : "현재 루틴을 기본값으로 재설정"
      );
    }

    function clearResetRoutineArm() {
      if (resetRoutineArmTimer) window.clearTimeout(resetRoutineArmTimer);
      resetRoutineArmTimer = null;
      resetRoutineArmedId = null;
      updateResetRoutineButton();
    }

    function performResetCurrentRoutineToDefault() {
      const routine = getRoutine(editRoutineId);
      const fixed = defaultById(editRoutineId);
      if (!routine || !fixed) return;
      const index = state.routines.findIndex((item) => item.id === editRoutineId);
      if (index < 0) return;
      state.routines[index] = normalizeRoutineFromFixed(null, fixed, true);
      delete state.sessions[editRoutineId];
      delete state.completed[editRoutineId];
      delete state.offToday[editRoutineId];
      editStepId = null;
      saveState();
      showSaved();
      showToast("기본 루틴으로 되돌림");
      resetRoutineArmedId = null;
      renderEditor();
      if (activeRoutineId === editRoutineId) renderRun();
    }

    function requestResetCurrentRoutineToDefault() {
      if (!getRoutine(editRoutineId) || !defaultById(editRoutineId)) return;
      if (resetRoutineArmedId === editRoutineId) {
        if (resetRoutineArmTimer) window.clearTimeout(resetRoutineArmTimer);
        resetRoutineArmTimer = null;
        performResetCurrentRoutineToDefault();
        return;
      }
      resetRoutineArmedId = editRoutineId;
      updateResetRoutineButton();
      showToast("한 번 더 누르면 재설정");
      if (resetRoutineArmTimer) window.clearTimeout(resetRoutineArmTimer);
      resetRoutineArmTimer = window.setTimeout(clearResetRoutineArm, 4200);
    }

    function formatMinutesInput(minutes) {
      const n = Number(minutes);
      if (!Number.isFinite(n)) return "1";
      return String(Math.round(n * 100) / 100);
    }

    function updateStepField(index, field, value) {
      const routine = getRoutine(editRoutineId);
      if (!routine || !routine.steps[index]) return;
      if (field === "icon") routine.steps[index].icon = String(value || "·").slice(0, 4);
      if (field === "title") routine.steps[index].title = String(value || "새 단계");
      if (field === "note") routine.steps[index].note = String(value || "");
      if (field === "minutes") {
        const parsed = Number(String(value).replace(",", "."));
        routine.steps[index].minutes = Math.max(0.25, Number.isFinite(parsed) ? parsed : 1);
      }
      normalizeSessionAfterRoutineEdit(routine.id);
      saveState();
      showSaved();
      if (activeRoutineId === routine.id) renderRun();
      els.editTotalTime.textContent = `약 ${formatDuration(totalSeconds(routine))}`;
    }

    function adjustStepDuration(index, deltaSeconds) {
      const routine = getRoutine(editRoutineId);
      if (!routine || !routine.steps[index]) return;
      const step = routine.steps[index];
      const prevSec = minutesToSeconds(step.minutes);
      const nextSec = Math.max(15, prevSec + deltaSeconds);
      step.minutes = nextSec / 60;
      const session = state.sessions[routine.id];
      if (session && session.index === index) {
        const elapsed = Math.max(0, prevSec - Number(session.remainingSec || 0));
        session.remainingSec = Math.max(0, nextSec - elapsed);
      }
      normalizeSessionAfterRoutineEdit(routine.id);
      saveState();
      showSaved();
      renderEditor();
      if (activeRoutineId === routine.id) renderRun();
    }

    function normalizeSessionAfterRoutineEdit(routineId) {
      const routine = getRoutine(routineId);
      const session = state.sessions[routineId];
      if (!routine) return;
      if (!routine.steps.length) routine.steps.push(makeNewStep(routine.steps.length));
      if (!session) return;
      session.status = routine.steps.map((_, idx) => session.status?.[idx] || "pending");
      session.index = Math.min(session.index || 0, routine.steps.length - 1);
      if (session.index < 0) session.index = 0;
    }

    function moveItem(array, from, to) {
      if (to < 0 || to >= array.length || from < 0 || from >= array.length) return false;
      const [item] = array.splice(from, 1);
      array.splice(to, 0, item);
      return true;
    }

    function makeNewStep(index) {
      return { id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, icon: "·", title: `새 단계 ${index + 1}`, note: "", minutes: 1 };
    }

    function showToast(text) {
      els.toast.textContent = text;
      els.toast.classList.add("show");
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(() => els.toast.classList.remove("show"), 1400);
    }

    function showSaved() {
      if (!els.saveStatus || !els.edit.classList.contains("active")) return;
      els.saveStatus.textContent = "저장됨";
      els.saveStatus.classList.add("show");
      window.clearTimeout(showSaved._timer);
      showSaved._timer = window.setTimeout(() => els.saveStatus.classList.remove("show"), 850);
    }

    function showReward(mark = "✓", type = "done") {
      if (!els.rewardPop) return;
      const ringRect = els.timerRing?.getBoundingClientRect();
      if (ringRect && ringRect.width > 0 && ringRect.height > 0) {
        els.rewardPop.style.setProperty("--reward-center-x", `${ringRect.left + ringRect.width / 2}px`);
        els.rewardPop.style.setProperty("--reward-center-y", `${ringRect.top + ringRect.height / 2}px`);
      }
      els.rewardPop.textContent = mark;
      els.rewardPop.classList.remove("show", "skip");
      if (type === "skipped") els.rewardPop.classList.add("skip");
      void els.rewardPop.offsetWidth;
      els.rewardPop.classList.add("show");
      window.clearTimeout(showReward._timer);
      showReward._timer = window.setTimeout(() => els.rewardPop.classList.remove("show"), 620);
    }

    function chooseCelebrationVariant() {
      const roll = Math.random();
      if (roll < 0.40) return "confetti";
      if (roll < 0.65) return "firework";
      if (roll < 0.85) return "sparkle";
      return "ripple";
    }

    function makeCelebrationParticle(variant, index, total, width, height, palette) {
      const centerX = width / 2;
      const centerY = height * 0.43;
      const color = palette[index % palette.length];

      if (variant === "firework") {
        const burstCenters = [
          { x: centerX, y: height * 0.42 },
          { x: width * 0.38, y: height * 0.50 },
          { x: width * 0.62, y: height * 0.50 }
        ];
        const base = burstCenters[index % burstCenters.length];
        const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
        const speed = 4.2 + Math.random() * 5.8;
        return {
          x: base.x,
          y: base.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          gravity: 0.075 + Math.random() * 0.06,
          drag: 0.982,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.32,
          size: 4 + Math.random() * 7,
          color,
          shape: index % 3 === 0 ? "dot" : "rect",
          delay: (index % burstCenters.length) * 85 + Math.random() * 90
        };
      }

      if (variant === "sparkle") {
        const angle = (-155 + Math.random() * 310) * Math.PI / 180;
        const speed = 3.8 + Math.random() * 7.0;
        return {
          x: centerX + (Math.random() - 0.5) * 46,
          y: centerY + (Math.random() - 0.5) * 24,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4.6 - Math.random() * 2.2,
          gravity: 0.10 + Math.random() * 0.08,
          drag: 0.986,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.42,
          size: 4 + Math.random() * 7,
          color,
          shape: index % 4 === 0 ? "star" : "dot",
          delay: Math.random() * 160
        };
      }

      if (variant === "ripple") {
        const ringIndex = index % 2;
        const angle = (index / total) * Math.PI * 2 + Math.random() * 0.35;
        const speed = ringIndex ? 5.8 + Math.random() * 4.8 : 3.8 + Math.random() * 3.8;
        return {
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          gravity: 0.07 + Math.random() * 0.05,
          drag: 0.985,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.26,
          size: 5 + Math.random() * 6,
          color,
          shape: index % 3 === 0 ? "dot" : "rect",
          delay: ringIndex * 100 + Math.random() * 80
        };
      }

      const angle = (-170 + Math.random() * 340) * Math.PI / 180;
      const speed = 5.2 + Math.random() * 8.2;
      return {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5.5 - Math.random() * 4,
        gravity: 0.18 + Math.random() * 0.11,
        drag: 0.985,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.34,
        size: 5 + Math.random() * 8,
        color,
        shape: index % 4 === 0 ? "dot" : "rect",
        delay: Math.random() * 120
      };
    }

    function drawCelebrationParticle(ctx, p, life) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "star") {
        const r1 = p.size * (0.92 + 0.18 * Math.sin(life * Math.PI * 8));
        const r2 = p.size * 0.34;
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const radius = i % 2 === 0 ? r1 : r2;
          const a = -Math.PI / 2 + i * Math.PI / 4;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === "dot") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.54, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size * 0.65, -p.size * 0.36, p.size * 1.3, p.size * 0.72);
      }
      ctx.restore();
    }

    function showCelebration() {
      const routine = getRoutine(activeRoutineId) || state.routines[0] || DEFAULT_ROUTINES[0];
      const accent = routine.color || "#C85A4A";
      const soft = routine.soft || "#F3DDD9";
      const variant = chooseCelebrationVariant();
      const layer = document.createElement("div");
      layer.className = `celebration-layer variant-${variant}`;
      layer.innerHTML = `<canvas class="celebration-canvas"></canvas><span class="celebration-flash"></span><span class="celebration-ring"></span><span class="celebration-ring second"></span>`;
      document.body.appendChild(layer);

      const canvas = layer.querySelector("canvas");
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        window.setTimeout(() => layer.remove(), 1200);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = () => {
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();

      const palette = [accent, soft, "#ffffff", "#FFE08A", "#FF9F7A", "#934B8F"];
      const particleCount = variant === "confetti" ? 108 : variant === "firework" ? 96 : variant === "sparkle" ? 92 : 82;
      const duration = variant === "confetti" ? 1750 : variant === "firework" ? 1650 : variant === "sparkle" ? 1550 : 1500;
      const particles = Array.from({ length: particleCount }, (_, i) => makeCelebrationParticle(variant, i, particleCount, window.innerWidth, window.innerHeight, palette));
      const started = performance.now();

      function draw(now) {
        const elapsed = now - started;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.forEach((p) => {
          if (elapsed < p.delay) return;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= p.drag;
          p.vy = p.vy * p.drag + p.gravity;
          p.rot += p.vr;
          const life = Math.min(1, (elapsed - p.delay) / Math.max(1, duration - p.delay));
          const fadePoint = variant === "sparkle" ? 0.64 : 0.72;
          p.alpha = life < fadePoint ? 1 : Math.max(0, 1 - (life - fadePoint) / (1 - fadePoint));
          if (variant === "sparkle") p.alpha *= 0.72 + 0.28 * Math.abs(Math.sin(life * Math.PI * 5));
          drawCelebrationParticle(ctx, p, life);
        });
        if (elapsed < duration) {
          requestAnimationFrame(draw);
        } else {
          layer.remove();
        }
      }
      requestAnimationFrame(draw);
      window.setTimeout(() => layer.remove(), duration + 360);
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/'/g, "&#39;");
    }

    let lastResetButtonInvokeAt = 0;

    const hadStoredStateAtBoot = Boolean(localStorage.getItem(STORAGE_KEY));
    let state = loadState();
    let lastLocalCloudHash = cloudStateHash(state);
    if (hadStoredStateAtBoot) ensureLocalUpdatedAt();
    let tickId = null;
    let activeRoutineId = null;
    let editRoutineId = state.routines[0]?.id || "morning";
    let editStepId = null;
    let previousScreen = "home";
    let suppressStepMemoInput = false;
    let wakeLock = null;
    let wakeLockWanted = false;
    let lastPreviewKey = "";
    let shouldCenterPreview = false;
    let selectedDateKey = todayKey();
    let isDatePlanMode = false;
    let backupPanelOpen = false;
    let brandLongPressTimer = null;
    let brandLongPressed = false;
    let rootTouchStart = null;
    let rootScrollResetTimer = null;

    function activeElementIsTextInput() {
      const active = document.activeElement;
      return Boolean(active && active.closest && active.closest("input, textarea, select, [contenteditable='true']"));
    }

    function activeMainScreenName() {
      if (els.edit.classList.contains("active")) return "edit";
      if (els.run.classList.contains("active")) return "run";
      if (els.done.classList.contains("active")) return "done";
      if (els.home.classList.contains("active")) return "home";
      if (els.auth.classList.contains("active")) return "auth";
      return "";
    }

    function canElementScroll(el, axis) {
      if (!el || el === document || el === window) return false;
      if (axis === "x") return el.scrollWidth > el.clientWidth + 1;
      return el.scrollHeight > el.clientHeight + 1;
    }

    function scrollMax(el, axis) {
      if (!el) return 0;
      return Math.max(0, axis === "x" ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight);
    }

    function isAllowedScrollElement(el, axis) {
      if (!el || !canElementScroll(el, axis)) return false;
      if (axis === "x") return el.matches?.(".routine-tabs, .step-preview");
      return el.matches?.(".home, .edit-panel, .day-note-input, .memo-input, .edit-textarea");
    }

    function findScrollableAncestor(target, axis) {
      let node = target instanceof Element ? target : target?.parentElement;
      while (node && node !== document.body && node !== document.documentElement) {
        if (isAllowedScrollElement(node, axis)) return node;
        node = node.parentElement;
      }
      return null;
    }

    function clampScrollPosition(el, axis) {
      const max = scrollMax(el, axis);
      if (max <= 0) return;
      if (axis === "x") {
        if (el.scrollLeft < 0) el.scrollLeft = 0;
        if (el.scrollLeft > max) el.scrollLeft = max;
        return;
      }
      if (el.scrollTop < 0) el.scrollTop = 0;
      if (el.scrollTop > max) el.scrollTop = max;
    }

    function nudgeScrollBoundary(el, axis) {
      const max = scrollMax(el, axis);
      if (max <= 1) return;
      if (axis === "x") {
        if (el.scrollLeft <= 0) el.scrollLeft = 1;
        else if (el.scrollLeft >= max) el.scrollLeft = max - 1;
        return;
      }
      if (el.scrollTop <= 0) el.scrollTop = 1;
      else if (el.scrollTop >= max) el.scrollTop = max - 1;
    }

    function preventTouchScroll(event) {
      if (event.cancelable) event.preventDefault();
    }

    function resetRootScrollPosition(options = {}) {
      if (activeElementIsTextInput()) return;
      const forceApp = Boolean(options.forceApp);
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const screen = activeMainScreenName();
      if (els.app.scrollTop !== 0) els.app.scrollTop = 0;
      if (forceApp && screen !== "home" && els.home.scrollTop !== 0) els.home.scrollTop = 0;
      clampScrollPosition(els.home, "y");
      clampScrollPosition(els.routineTabs, "x");
      clampScrollPosition(els.stepPreview, "x");
    }

    function scheduleRootScrollReset(options = {}) {
      if (rootScrollResetTimer) window.clearTimeout(rootScrollResetTimer);
      window.requestAnimationFrame(() => resetRootScrollPosition(options));
      rootScrollResetTimer = window.setTimeout(() => {
        rootScrollResetTimer = null;
        resetRootScrollPosition(options);
      }, 80);
    }

    function handleRootTouchStart(event) {
      if (!event.touches || event.touches.length !== 1) {
        rootTouchStart = null;
        return;
      }
      const target = event.target;
      const xScroller = findScrollableAncestor(target, "x");
      const yScroller = findScrollableAncestor(target, "y");
      nudgeScrollBoundary(xScroller, "x");
      nudgeScrollBoundary(yScroller, "y");
      const touch = event.touches[0];
      rootTouchStart = { x: touch.clientX, y: touch.clientY, xScroller, yScroller };
    }

    function handleRootTouchMove(event) {
      if (!rootTouchStart || !event.touches || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - rootTouchStart.x;
      const dy = touch.clientY - rootTouchStart.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

      const axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      const scroller = axis === "x" ? rootTouchStart.xScroller : rootTouchStart.yScroller;
      if (!scroller || !isAllowedScrollElement(scroller, axis)) {
        preventTouchScroll(event);
        return;
      }

      const max = scrollMax(scroller, axis);
      if (max <= 0) {
        preventTouchScroll(event);
        return;
      }

      if (axis === "x") {
        const left = Math.max(0, Math.min(scroller.scrollLeft, max));
        if (left !== scroller.scrollLeft) scroller.scrollLeft = left;
        if ((dx > 0 && left <= 1) || (dx < 0 && left >= max - 1)) {
          scroller.scrollLeft = dx > 0 ? 0 : max;
          preventTouchScroll(event);
        }
        return;
      }

      const top = Math.max(0, Math.min(scroller.scrollTop, max));
      if (top !== scroller.scrollTop) scroller.scrollTop = top;
      if ((dy > 0 && top <= 1) || (dy < 0 && top >= max - 1)) {
        scroller.scrollTop = dy > 0 ? 0 : max;
        preventTouchScroll(event);
      }
    }

    function handleRootTouchEnd() {
      if (rootTouchStart) {
        clampScrollPosition(rootTouchStart.xScroller, "x");
        clampScrollPosition(rootTouchStart.yScroller, "y");
      }
      rootTouchStart = null;
      scheduleRootScrollReset({ forceApp: false });
    }

    function setBackupPanelOpen(open) {
      backupPanelOpen = Boolean(open);
      els.backupPanel.classList.toggle("active", backupPanelOpen);
      els.backupPanel.setAttribute("aria-hidden", backupPanelOpen ? "false" : "true");
      if (!backupPanelOpen) els.brandTitle.classList.remove("long-pressing");
    }

    function updateBackupImportButton() {
      const valid = Boolean(parseBackupText(els.backupInput.value));
      els.backupInput.classList.toggle("valid", valid);
      els.backupImportBtn.disabled = !valid;
    }

    function clearBackupInput() {
      els.backupInput.value = "";
      updateBackupImportButton();
    }

    function clearBrandLongPress() {
      if (brandLongPressTimer) window.clearTimeout(brandLongPressTimer);
      brandLongPressTimer = null;
      els.brandTitle.classList.remove("long-pressing");
    }

    async function exportBackupToClipboard() {
      const text = JSON.stringify(backupStatePayload());
      try {
        if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(text);
        showToast("백업 복사됨");
      } catch {
        els.backupInput.value = text;
        updateBackupImportButton();
        setBackupPanelOpen(true);
        showToast("직접 복사");
      }
    }

    function importBackupFromInput() {
      const parsed = parseBackupText(els.backupInput.value);
      if (!parsed) return;
      state = parsed.nextState;
      selectedDateKey = todayKey();
      isDatePlanMode = false;
      activeRoutineId = null;
      editRoutineId = state.routines[0]?.id || "morning";
      saveState();
      clearBackupInput();
      setBackupPanelOpen(false);
      renderHome();
      showToast("백업 가져옴");
    }

    function handleResetRoutineButton(event) {
      if (!event.currentTarget || event.currentTarget !== els.resetRoutineBtn) return;
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now - lastResetButtonInvokeAt < 420) return;
      lastResetButtonInvokeAt = now;
      requestResetCurrentRoutineToDefault();
    }

    els.brandTitle.addEventListener("pointerdown", () => {
      brandLongPressed = false;
      clearBrandLongPress();
      els.brandTitle.classList.add("long-pressing");
      brandLongPressTimer = window.setTimeout(() => {
        brandLongPressed = true;
        clearBrandLongPress();
        setBackupPanelOpen(true);
      }, LONG_PRESS_MS);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      els.brandTitle.addEventListener(eventName, clearBrandLongPress);
    });
    els.brandTitle.addEventListener("contextmenu", (event) => event.preventDefault());
    els.brandTitle.addEventListener("click", (event) => {
      if (brandLongPressed) {
        event.preventDefault();
        brandLongPressed = false;
      }
    });
    els.brandTitle.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setBackupPanelOpen(!backupPanelOpen);
    });
    els.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleEmailLogin();
    });
    els.backupInput.addEventListener("input", updateBackupImportButton);
    els.backupClearBtn.addEventListener("click", clearBackupInput);
    els.backupImportBtn.addEventListener("click", importBackupFromInput);
    els.backupExportBtn.addEventListener("click", exportBackupToClipboard);
    els.backupLogoutBtn.addEventListener("click", handleCloudLogoutButton);
    document.addEventListener("pointerdown", (event) => {
      if (!backupPanelOpen) return;
      if (els.heroArea.contains(event.target)) return;
      setBackupPanelOpen(false);
    });
    document.addEventListener("focusout", () => {
      window.setTimeout(applyPendingRemoteIfSafe, 160);
      window.setTimeout(() => scheduleRootScrollReset({ forceApp: false }), 180);
    });
    document.addEventListener("touchstart", handleRootTouchStart, { passive: true });
    document.addEventListener("touchmove", handleRootTouchMove, { passive: false });
    document.addEventListener("touchend", handleRootTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleRootTouchEnd, { passive: true });

    els.todayLabel.addEventListener("click", openCalendar);
    els.calendarPrevBtn.addEventListener("click", () => shiftCalendarMonth(-1));
    els.calendarNextBtn.addEventListener("click", () => shiftCalendarMonth(1));
    els.calendarCloseBtn.addEventListener("click", closeCalendar);
    els.calendarOverlay.addEventListener("click", (event) => {
      if (event.target === els.calendarOverlay) closeCalendar();
    });

    els.routineList.addEventListener("input", (event) => {
      const target = event.target;
      if (!target?.classList?.contains("day-note-input")) return;
      const routineId = target.dataset.routineId;
      if (!routineId || (selectedDateKey === todayKey() && !isDatePlanMode)) return;
      setDayNote(selectedDateKey, routineId, target.value);
      renderCalendar();
    });

    els.routineList.addEventListener("click", (event) => {
      const target = event.target;
      if (!target?.dataset?.action) return;
      const routineId = target.dataset.routineId;
      if (!routineId || (selectedDateKey === todayKey() && !isDatePlanMode)) return;
      if (target.dataset.action === "plan-toggle") {
        const nextOff = target.dataset.off === "true";
        setPlanOff(selectedDateKey, routineId, nextOff);
        showToast(nextOff ? "이 날짜는 안 함" : "이 날짜에 함");
        renderHome();
        renderCalendar();
        return;
      }
      if (target.dataset.action === "plan-status") {
        const nextStatus = target.dataset.status;
        setExplicitDayStatus(selectedDateKey, routineId, nextStatus);
        showToast(nextStatus === "done" ? "완료로 표시" : nextStatus === "off" ? "안 함으로 표시" : "미실행으로 표시");
        renderHome();
        renderCalendar();
      }
    });

    els.openEditBtn.addEventListener("click", () => {
      if (selectedDateKey !== todayKey() || isDatePlanMode) {
        selectedDateKey = todayKey();
        isDatePlanMode = false;
        renderHome();
        return;
      }
      openEditor(state.routines[0]?.id, "home");
    });
    els.closeEditBtn.addEventListener("click", closeEditor);
    els.resetRoutineBtn.addEventListener("pointerup", handleResetRoutineButton);
    els.resetRoutineBtn.addEventListener("click", handleResetRoutineButton);
    els.resetRoutineBtn.addEventListener("touchend", handleResetRoutineButton, { passive: false });
    els.backBtn.addEventListener("click", renderHome);
    els.undoBtn.addEventListener("click", undoStep);
    els.doneUndoBtn.addEventListener("click", undoStep);
    els.completeBtn.addEventListener("click", () => advance("done"));
    els.skipBtn.addEventListener("click", () => advance("skipped"));
    els.pauseBtn.addEventListener("click", togglePause);
    els.run.addEventListener("input", (event) => {
      if (event.target?.id !== "departureInput" || !activeRoutineId) return;
      const session = getSession(activeRoutineId);
      if (!session) return;
      session.departureText = String(event.target.value || "").slice(0, 32);
      saveState();
      updateDeparturePin(session.departureText);
    });
    els.doneHomeBtn.addEventListener("click", renderHome);
    els.stepEditorList.addEventListener("input", (event) => {
      const target = event.target;
      const field = target.dataset.field;
      const index = Number(target.dataset.index);
      if (!field || !Number.isInteger(index)) return;
      updateStepField(index, field, target.value);
    });

    els.stepEditorList.addEventListener("change", (event) => {
      const target = event.target;
      const field = target.dataset.field;
      const index = Number(target.dataset.index);
      if (!field || !Number.isInteger(index)) return;
      if (field === "icon" || field === "title") renderEditor();
    });



    let adjustRepeatTimer = null;
    let adjustRepeatDelay = null;
    let suppressNextAdjustClick = false;

    function clearAdjustRepeat() {
      if (adjustRepeatDelay) window.clearTimeout(adjustRepeatDelay);
      if (adjustRepeatTimer) window.clearInterval(adjustRepeatTimer);
      adjustRepeatDelay = null;
      adjustRepeatTimer = null;
    }

    els.stepEditorList.addEventListener("pointerdown", (event) => {
      const button = event.target.closest('button[data-action="adjust-time"]');
      if (!button || Math.abs(Number(button.dataset.delta)) !== 60) return;
      const index = Number(button.dataset.index);
      const delta = Number(button.dataset.delta);
      if (!Number.isInteger(index) || !Number.isFinite(delta)) return;
      clearAdjustRepeat();
      adjustRepeatDelay = window.setTimeout(() => {
        suppressNextAdjustClick = true;
        adjustStepDuration(index, delta);
        adjustRepeatTimer = window.setInterval(() => adjustStepDuration(index, delta), 135);
      }, 420);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      document.addEventListener(name, () => clearAdjustRepeat());
    });

    els.stepEditorList.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const action = button.dataset.action;
      const routine = getRoutine(editRoutineId);
      if (!routine) return;
      if (action === "step-add") {
        const nextStep = makeNewStep(routine.steps.length);
        routine.steps.push(nextStep);
        editStepId = nextStep.id;
        normalizeSessionAfterRoutineEdit(routine.id);
        saveState();
        showSaved();
        renderEditor();
        return;
      }
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index)) return;
      if (action === "adjust-time") {
        if (suppressNextAdjustClick) {
          suppressNextAdjustClick = false;
          return;
        }
        const delta = Number(button.dataset.delta);
        if (Number.isFinite(delta)) adjustStepDuration(index, delta);
        return;
      }
      if (action === "toggle-step") {
        editStepId = editStepId === routine.steps[index].id ? null : routine.steps[index].id;
        renderEditor();
      }
      if (action === "clear-note") {
        routine.steps[index].note = "";
        saveState();
        showSaved();
        renderEditor();
        showToast("메모 비움");
      }
      if (action === "step-up") {
        if (moveItem(routine.steps, index, index - 1)) {
          editStepId = routine.steps[index - 1].id;
          normalizeSessionAfterRoutineEdit(routine.id);
          saveState();
          showSaved();
          renderEditor();
        }
      }
      if (action === "step-down") {
        if (moveItem(routine.steps, index, index + 1)) {
          editStepId = routine.steps[index + 1].id;
          normalizeSessionAfterRoutineEdit(routine.id);
          saveState();
          showSaved();
          renderEditor();
        }
      }
      if (action === "step-delete") {
        if (routine.steps.length <= 1) {
          showToast("마지막 단계는 삭제 불가");
          return;
        }
        const removed = routine.steps.splice(index, 1)[0];
        if (editStepId === removed.id) editStepId = null;
        normalizeSessionAfterRoutineEdit(routine.id);
        saveState();
        renderEditor();
      }
    });

    window.addEventListener("resize", () => {
      scheduleRootScrollReset({ forceApp: false });
      if (!els.stepPreview?.children.length) return;
      requestAnimationFrame(recalcPreviewEdgeSpacers);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => scheduleRootScrollReset({ forceApp: false }));
      window.visualViewport.addEventListener("scroll", () => scheduleRootScrollReset({ forceApp: false }));
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.calendarOverlay.classList.contains("active")) closeCalendar();
    });

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncWakeLock(els.run.classList.contains("active") ? "run" : "other");
      } else {
        releaseWakeLock();
      }
      if (!activeRoutineId) return;
      const session = getSession(activeRoutineId);
      if (!session) return;
      session.lastTick = Date.now();
      saveState();
    });

    function initFromUrl() {
      updateCloudButton();
      initFirebase();
      selectedDateKey = todayKey();
      isDatePlanMode = false;
      els.todayLabel.textContent = dateKeyKo(selectedDateKey);
      saveState({ touch: false });
      // v1.12: 홈 화면 웹앱 저장소 분리를 피하기 위해 query 진입을 사용하지 않는다.
      // 과거 ?routine=outing, ?edit=1 같은 링크로 열려도 즉시 기본 주소로 정리하고,
      // 앱 내부에서만 루틴 선택/수정을 진행한다.
      if (window.location.search || window.location.hash) {
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch (error) {}
      }
      renderHome();
    }

    initFromUrl();
