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
