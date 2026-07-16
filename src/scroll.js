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
