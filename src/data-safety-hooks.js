(function(){
  const originalReset=performResetCurrentRoutineToDefault;
  const originalImport=importBackupFromInput;
  const originalSetBackupPanelOpen=setBackupPanelOpen;
  let recoveryHost=null;
  let cloudItems=[];

  performResetCurrentRoutineToDefault=function(){
    window.RoutinerDataSafety?.checkpointCurrent("reset-default-routine",true);
    window.RoutinerSyncV2?.markOperation("reset-default-routine");
    return originalReset();
  };

  importBackupFromInput=function(){
    window.RoutinerDataSafety?.checkpointCurrent("import-backup",true);
    window.RoutinerSyncV2?.markOperation("import-backup");
    return originalImport();
  };

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
  async function renderRecoveryPanel(){
    const host=ensureHost();host.innerHTML='<div class="backup-panel-title">복구본</div><div class="backup-help">현재 상태는 복원 직전에 다시 보관돼.</div><div id="routinerRecoveryList">불러오는 중…</div>';
    try{cloudItems=await(window.RoutinerSyncV2?.listCloudHistory?.()||Promise.resolve([]))}catch{cloudItems=[]}
    const items=localItems().concat(cloudItems.map((item)=>({source:"cloud",slot:item.slot,sort:item.revision,label:`계정 · r${item.revision} · ${item.operation}`}))).sort((a,b)=>b.sort-a.sort);
    const list=host.querySelector("#routinerRecoveryList");
    if(!items.length){list.textContent="사용 가능한 복구본 없음";return}
    list.innerHTML=items.slice(0,18).map((item)=>`<button type="button" class="backup-action secondary" data-recovery-source="${item.source}" data-recovery-slot="${item.slot}">${escapeHtml(item.label)}</button>`).join("");
    list.querySelectorAll("[data-recovery-source]").forEach((button)=>button.addEventListener("click",()=>restore(button.dataset.recoverySource,button.dataset.recoverySlot)));
  }
  async function restore(source,slot){
    if(source==="local"){
      try{
        const restored=window.RoutinerDataSafety.restoreLocal(Number(slot));
        state=normalizeLoadedState(restored);selectedDateKey=todayKey();isDatePlanMode=false;activeRoutineId=null;editRoutineId=state.routines[0]?.id||"morning";
        saveState({reason:"restore-local"});renderHome();window.RoutinerSyncV2?.markOperation("restore-local");await window.RoutinerSyncV2?.safeWriteCloud(true,"restore-local");showToast("기기 복구본 복원됨");renderRecoveryPanel();
      }catch(error){console.warn("Routiner local restore failed",error);showToast("기기 복구 실패")}
      return;
    }
    const item=cloudItems.find((entry)=>entry.slot===slot);if(!item)return;
    const ok=await window.RoutinerSyncV2?.restoreCloudHistory(item);showToast(ok?"계정 복구본 복원됨":"계정 복구 실패");renderRecoveryPanel();
  }
})();
