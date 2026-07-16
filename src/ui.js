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
