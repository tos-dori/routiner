(function(){
  const panel=els.backupPanel;
  if(!panel)return;
  const originalSetPanelOpen=setBackupPanelOpen;
  const inputWrap=els.backupInput?.closest('.backup-input-wrap');
  const importButton=els.backupImportBtn;
  const exportButton=els.backupExportBtn;
  const logoutButton=els.backupLogoutBtn;
  let logoutArmed=false;
  let logoutTimer=null;

  const head=document.createElement('div');
  head.className='management-menu-head';
  head.innerHTML=`<div><strong>Routiner</strong><span>v${escapeHtml(APP_VERSION)}</span></div><div class="management-menu-status" id="managementMenuStatus"></div>`;

  const actions=document.createElement('div');
  actions.className='management-menu-actions';
  const recoveryButton=document.createElement('button');
  recoveryButton.type='button';
  recoveryButton.className='management-menu-action';
  recoveryButton.textContent='복구본';
  const importToggle=document.createElement('button');
  importToggle.type='button';
  importToggle.className='management-menu-action';
  importToggle.textContent='가져오기';
  exportButton.className='management-menu-action primary';
  exportButton.textContent='내보내기';
  logoutButton.className='management-menu-action danger';
  logoutButton.textContent='로그아웃';
  actions.append(recoveryButton,exportButton,importToggle,logoutButton);

  const body=document.createElement('div');
  body.className='management-menu-body';
  const importSection=document.createElement('section');
  importSection.className='management-menu-section management-import-section';
  importSection.setAttribute('aria-label','백업 가져오기');
  const importTitle=document.createElement('div');
  importTitle.className='management-menu-section-title';
  importTitle.textContent='백업 JSON 붙여넣기';
  importButton.className='management-menu-confirm';
  importButton.textContent='가져오기 실행';
  importSection.append(importTitle,inputWrap,importButton);
  body.append(importSection);

  panel.innerHTML='';
  panel.classList.add('management-menu');
  panel.dataset.menuMode='root';
  panel.append(head,actions,body);

  function updateStatus(){
    const target=head.querySelector('#managementMenuStatus');
    if(!target)return;
    const safe=window.RoutinerDataSafety?.isSafe?.()!==false;
    const privateState=window.RoutinerPrivateData?.status?.()?.state;
    if(!safe){target.textContent='기기 저장 확인 필요';target.dataset.tone='danger';return}
    target.dataset.tone='';
    if(!navigator.onLine){target.textContent='오프라인 · 기기 저장 정상';return}
    if(cloudSync?.user){target.textContent=privateState==='verified'?'동기화됨 · 기본값 검증됨':'계정 연결됨 · 기기 저장 정상';return}
    target.textContent='기기 저장 정상';
  }

  function resetLogout(){
    if(logoutTimer)window.clearTimeout(logoutTimer);
    logoutTimer=null;
    logoutArmed=false;
    logoutButton.classList.remove('confirm');
    logoutButton.textContent='로그아웃';
  }

  function setMode(mode){
    panel.dataset.menuMode=mode;
    resetLogout();
    const recovery=panel.querySelector('.backup-recovery');
    if(recovery&&recovery.parentElement!==body)body.appendChild(recovery);
  }

  function moveRecoveryHost(){
    const recovery=panel.querySelector('.backup-recovery');
    if(recovery&&recovery.parentElement!==body)body.appendChild(recovery);
  }

  const observer=new MutationObserver(moveRecoveryHost);
  observer.observe(panel,{childList:true,subtree:false});

  setBackupPanelOpen=function(open){
    if(open){setMode('root');updateStatus()}
    else resetLogout();
    originalSetPanelOpen(open);
    if(open)window.setTimeout(moveRecoveryHost,0);
  };

  recoveryButton.addEventListener('click',()=>{
    setMode('recovery');
    originalSetPanelOpen(true);
    window.setTimeout(moveRecoveryHost,0);
  });

  importToggle.addEventListener('click',()=>{
    setMode(panel.dataset.menuMode==='import'?'root':'import');
    if(panel.dataset.menuMode==='import')window.setTimeout(()=>els.backupInput?.focus(),0);
  });

  logoutButton.addEventListener('click',(event)=>{
    if(logoutArmed){resetLogout();return}
    event.preventDefault();
    event.stopImmediatePropagation();
    logoutArmed=true;
    logoutButton.classList.add('confirm');
    logoutButton.textContent='한 번 더';
    showToast('한 번 더 누르면 로그아웃');
    logoutTimer=window.setTimeout(resetLogout,4200);
  },true);

  window.addEventListener('online',updateStatus);
  window.addEventListener('offline',updateStatus);
  updateStatus();
})();
