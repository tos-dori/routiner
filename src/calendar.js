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
