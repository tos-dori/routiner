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
