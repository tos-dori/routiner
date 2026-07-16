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
