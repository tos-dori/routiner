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
