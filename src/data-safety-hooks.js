(function(){
  const originalReset=performResetCurrentRoutineToDefault;
  const originalRequestReset=requestResetCurrentRoutineToDefault;
  const originalImport=importBackupFromInput;
  const originalSetBackupPanelOpen=setBackupPanelOpen;
  let recoveryHost=null;
  let cloudItems=[];
  let conflictItems=[];
  let armedStepDeleteId=null;
  let armedStepDeleteTimer=null;

  function privateDefaultsAvailable(){
    return Boolean(window.RoutinerDataSafety?.privateDefaultsReady?.()&&window.RoutinerDataSafety?.defaultById?.(editRoutineId));
  }

  requestResetCurrentRoutineToDefault=function(){
    if(!privateDefaultsAvailable()){showToast("비공개 기본값 확인 전이라 재설정을 중단했어");return}
    return originalRequestReset();
  };

  performResetCurrentRoutineToDefault=function(){
    if(!privateDefaultsAvailable()){showToast("비공개 기본값 확인 전이라 재설정을 중단했어");return}
    const before=clone(state);
    if(!window.RoutinerDataSafety?.checkpointCurrent("reset-default-routine",true)){showToast("복구본을 남기지 못해 재설정을 중단했어");return}
    window.RoutinerSyncV2?.markOperation("reset-default-routine");
    const result=originalReset();
    if(!window.RoutinerDataSafety?.isSafe()){
      state=before;renderEditor();showToast("저장 실패로 재설정을 되돌렸어");return;
    }
    return result;
  };

  importBackupFromInput=function(){
    const before=clone(state);
    if(!window.RoutinerDataSafety?.checkpointCurrent("import-backup",true)){showToast("복구본을 남기지 못해 가져오기를 중단했어");return}
    window.RoutinerSyncV2?.markOperation("import-backup");
    const result=originalImport();
    if(!window.RoutinerDataSafety?.isSafe()){
      state=before;renderHome();showToast("저장 실패로 가져오기를 되돌렸어");return;
    }
    return result;
  };

  function currentDeleteButton(){
    if(!armedStepDeleteId)return null;
    const routine=getRoutine(editRoutineId);
    if(!routine)return null;
    const index=routine.steps.findIndex((step)=>step.id===armedStepDeleteId);
    if(index<0)return null;
    return els.stepEditorList.querySelector(`button[data-action="step-delete"][data-index="${index}"]`);
  }

  function clearStepDeleteArm(){
    if(armedStepDeleteTimer)window.clearTimeout(armedStepDeleteTimer);
    armedStepDeleteTimer=null;
    const button=currentDeleteButton();
    if(button){button.classList.remove("confirm");button.textContent="삭제";button.setAttribute("aria-label","단계 삭제")}
    armedStepDeleteId=null;
  }

  function armStepDelete(stepId){
    clearStepDeleteArm();
    armedStepDeleteId=stepId;
    const button=currentDeleteButton();
    if(button){button.classList.add("confirm");button.textContent="한 번 더";button.setAttribute("aria-label","한 번 더 누르면 이 단계를 삭제")}
    showToast("한 번 더 누르면 삭제");
    armedStepDeleteTimer=window.setTimeout(clearStepDeleteArm,4200);
  }

  function deleteStepSafely(index){
    const routine=getRoutine(editRoutineId);
    if(!routine||!routine.steps[index])return;
    if(routine.steps.length<=1){clearStepDeleteArm();showToast("마지막 단계는 삭제 불가");return}
    const step=routine.steps[index];
    if(armedStepDeleteId!==step.id){armStepDelete(step.id);return}
    const before=clone(state);
    clearStepDeleteArm();
    if(!window.RoutinerDataSafety?.checkpointCurrent("step-delete",true)){showToast("복구본을 남기지 못해 삭제를 중단했어");return}
    window.RoutinerSyncV2?.markOperation("step-delete");
    const removed=routine.steps.splice(index,1)[0];
    if(editStepId===removed.id)editStepId=null;
    normalizeSessionAfterRoutineEdit(routine.id);
    saveState();
    if(!window.RoutinerDataSafety?.isSafe()){
      state=before;renderEditor();showToast("저장 실패로 삭제를 되돌렸어");return;
    }
    renderEditor();
    if(activeRoutineId===routine.id)renderRun();
    showToast("단계 삭제됨");
  }

  els.stepEditorList.addEventListener("click",(event)=>{
    const button=event.target.closest("button");
    if(!button)return;
    if(button.dataset.action!=="step-delete"){clearStepDeleteArm();return}
    event.preventDefault();event.stopImmediatePropagation();
    const index=Number(button.dataset.index);
    if(Number.isInteger(index))deleteStepSafely(index);
  },true);

  window.addEventListener("keydown",(event)=>{if(event.key==="Escape")clearStepDeleteArm()});

  setBackupPanelOpen=function(open){
    originalSetBackupPanelOpen(open);
    if(open)renderRecoveryPanel();
  };

  function ensureHost(){
    if(recoveryHost?.isConnected)return recoveryHost;
    recoveryHost=document.createElement("section");
    recoveryHost.className="backup-recovery";
    recoveryHost.setAttribute("aria-label","복구본");
    els.backupPanel.appendChild(recoveryHost);
    return recoveryHost;
  }
  function timeLabel(value){const date=new Date(Number(value||0));return Number.isNaN(date.getTime())?"시간 미상":date.toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
  function localItems(){return(window.RoutinerDataSafety?.listCheckpoints()||[]).map((item)=>{let count=0;try{count=JSON.parse(item.raw).routines.reduce((sum,routine)=>sum+(routine.steps?.length||0),0)}catch{}return{source:"local",slot:String(item.slot),sort:item.createdAt,label:`기기 · ${timeLabel(item.createdAt)} · ${count}단계 · ${item.reason}`}})}
  function privateStatusHtml(){
    const status=window.RoutinerPrivateData?.status?.();
    if(!status)return'<div class="backup-help">비공개 기본값 확인 전</div>';
    const label=status.state==="verified"?`비공개 기본값 검증됨 · ${timeLabel(status.verifiedAt)}`:status.message;
    return`<div class="backup-help">${escapeHtml(label)}</div>`;
  }
  async function renderRecoveryPanel(){
    const host=ensureHost();host.innerHTML=`<div class="backup-panel-title">복구본</div>${privateStatusHtml()}<div class="backup-help">현재 상태는 복원 직전에 다시 보관돼.</div><div id="routinerRecoveryList">불러오는 중…</div>`;
    try{cloudItems=await(window.RoutinerSyncV2?.listCloudHistory?.()||Promise.resolve([]))}catch{cloudItems=[]}
    try{conflictItems=await(window.RoutinerPrivateData?.listConflicts?.()||Promise.resolve([]))}catch{conflictItems=[]}
    const items=localItems()
      .concat(cloudItems.map((item)=>({source:"cloud",slot:item.slot,sort:item.revision,label:`계정 · r${item.revision} · ${item.operation}`})))
      .concat(conflictItems.map((item)=>({source:"conflict",slot:item.slot,sort:item.createdAt,label:`충돌 보존본 · ${timeLabel(item.createdAt)} · ${item.operation}`})))
      .sort((a,b)=>b.sort-a.sort);
    const list=host.querySelector("#routinerRecoveryList");
    if(!items.length){list.textContent="사용 가능한 복구본 없음";return}
    list.innerHTML=items.slice(0,20).map((item)=>`<button type="button" class="backup-action secondary" data-recovery-source="${item.source}" data-recovery-slot="${item.slot}">${escapeHtml(item.label)}</button>`).join("");
    list.querySelectorAll("[data-recovery-source]").forEach((button)=>button.addEventListener("click",()=>restore(button.dataset.recoverySource,button.dataset.recoverySlot)));
  }
  async function restore(source,slot){
    if(source==="local"){
      try{
        const restored=window.RoutinerDataSafety.restoreLocal(Number(slot));
        state=normalizeLoadedState(restored);selectedDateKey=todayKey();isDatePlanMode=false;activeRoutineId=null;editRoutineId=state.routines[0]?.id||"morning";
        saveState({reason:"restore-local"});
        if(!window.RoutinerDataSafety.isSafe())throw new Error("restore-save-failed");
        renderHome();window.RoutinerSyncV2?.markOperation("restore-local");await window.RoutinerSyncV2?.safeWriteCloud(true,"restore-local");showToast("기기 복구본 복원됨");renderRecoveryPanel();
      }catch(error){console.warn("Routiner local restore failed",error);showToast("기기 복구 실패")}
      return;
    }
    const item=source==="conflict"?conflictItems.find((entry)=>entry.slot===slot):cloudItems.find((entry)=>entry.slot===slot);
    if(!item)return;
    const ok=await window.RoutinerSyncV2?.restoreCloudHistory(item);
    if(ok&&source==="conflict")await window.RoutinerPrivateData?.removeConflict?.(slot);
    showToast(ok?(source==="conflict"?"충돌 보존본 복원됨":"계정 복구본 복원됨"):"계정 복구 실패");renderRecoveryPanel();
  }
})();
