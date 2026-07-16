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
