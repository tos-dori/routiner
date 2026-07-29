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
            <div class="duration-control" role="group" aria-label="단계 시간 조절">
              <button class="duration-btn minute-adjust" data-action="adjust-time" data-index="${idx}" data-delta="-60" type="button" aria-label="1분 줄이기">−1m</button>
              <button class="duration-btn" data-action="adjust-time" data-index="${idx}" data-delta="-15" type="button" aria-label="15초 줄이기">−15s</button>
              <div class="duration-value" aria-label="현재 단계 시간">${formatDuration(minutesToSeconds(step.minutes))}</div>
              <button class="duration-btn" data-action="adjust-time" data-index="${idx}" data-delta="15" type="button" aria-label="15초 늘리기">+15s</button>
              <button class="duration-btn minute-adjust" data-action="adjust-time" data-index="${idx}" data-delta="60" type="button" aria-label="1분 늘리기">+1m</button>
            </div>
            <div class="memo-wrap ${hasNote ? "has-note" : "no-note"}">
              <textarea class="edit-textarea" rows="2" data-field="note" data-index="${idx}" placeholder="메모" autocomplete="off">${escapeHtml(step.note || "")}</textarea>
              <button class="clear-memo" data-action="clear-note" data-index="${idx}" type="button" aria-label="메모 지우기">×</button>
            </div>
            <div class="step-controls">
              <div class="step-order-controls" role="group" aria-label="단계 순서">
                <button class="icon-btn" data-action="step-up" data-index="${idx}" type="button" aria-label="위로 이동">↑</button>
                <button class="icon-btn" data-action="step-down" data-index="${idx}" type="button" aria-label="아래로 이동">↓</button>
              </div>
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
