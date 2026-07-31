function normalizeArmedDeleteLabel() {
      els.stepEditorList?.querySelectorAll('button[data-action="step-delete"].confirm').forEach((button) => {
        button.textContent = "삭제";
        button.setAttribute("aria-label", "삭제 확인 상태. 다시 누르면 이 단계를 삭제");
      });
    }

function installArmedDeleteLabelObserver() {
      if (!els.stepEditorList) return;
      new MutationObserver(normalizeArmedDeleteLabel).observe(els.stepEditorList, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
      });
      els.stepEditorList.addEventListener("click", () => queueMicrotask(normalizeArmedDeleteLabel), true);
    }

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
      installArmedDeleteLabelObserver();
      renderHome();
    }

initFromUrl();
