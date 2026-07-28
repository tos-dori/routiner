(function(){
  const RECOVERY_KEY = `${STORAGE_KEY}__recoveryV1`;
  const CORRUPT_KEY = `${STORAGE_KEY}__corruptV1`;
  const SYNC_PROFILE_KEY = `${STORAGE_KEY}__syncProfileV1`;
  const LAST_ARCHIVE_KEY = `${STORAGE_KEY}__lastArchiveAt`;
  const PRIVATE_DEFAULTS_DOC_ID = "private-defaults";
  const MAX_LOCAL_SNAPSHOTS = 20;
  const MAX_CLOUD_SNAPSHOTS = 30;
  const firestoreModulePromise = import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);

  let blocked = false;
  let issue = "";
  let pendingOperation = "";
  let pendingOperationUntil = 0;
  let allowBlockedWrite = false;
  let privateDefaults = null;

  const originalLoadState = loadState;
  const originalWriteStoredState = writeStoredState;
  const originalApplyRemoteState = applyRemoteState;
  const originalDefaultById = defaultById;
  const originalPerformReset = performResetCurrentRoutineToDefault;

  function safeGet(key){try{return localStorage.getItem(key)}catch{return null}}
  function safeSet(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}
  function parseRaw(raw){
    if(typeof raw !== "string" || !raw.trim()) throw new Error("empty");
    const parsed = JSON.parse(raw);
    if(!isPlainObject(parsed)) throw new Error("shape");
    if(parsed.routines !== undefined && !Array.isArray(parsed.routines)) throw new Error("routines");
    return parsed;
  }
  function readSnapshots(){
    try{const value=JSON.parse(safeGet(RECOVERY_KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}
  }
  function writeSnapshots(items){safeSet(RECOVERY_KEY,JSON.stringify(items.slice(0,MAX_LOCAL_SNAPSHOTS)))}
  function snapshotRaw(raw,reason){
    let parsed;
    try{parsed=parseRaw(raw)}catch{return false}
    const normalized=JSON.stringify(parsed);
    const items=readSnapshots();
    if(items[0]?.raw===normalized)return false;
    items.unshift({createdAt:Date.now(),reason:String(reason||"change"),raw:normalized});
    writeSnapshots(items);
    return true;
  }
  function snapshotCurrent(reason){const raw=safeGet(STORAGE_KEY);return raw?snapshotRaw(raw,reason||"manual"):false}
  function latestValidSnapshot(){
    for(const item of readSnapshots()){
      try{parseRaw(item.raw);return item}catch{}
    }
    return null;
  }
  function latestLocalSnapshot(){return latestValidSnapshot()}
  function preserveCorrupt(raw,error){
    let items=[];
    try{items=JSON.parse(safeGet(CORRUPT_KEY)||"[]");if(!Array.isArray(items))items=[]}catch{items=[]}
    items.unshift({createdAt:Date.now(),error:String(error?.message||error||"invalid"),raw:String(raw||"")});
    safeSet(CORRUPT_KEY,JSON.stringify(items.slice(0,5)));
  }
  function stateHasData(value){return Boolean(value&&Array.isArray(value.routines)&&value.routines.some((routine)=>Array.isArray(routine?.steps)&&routine.steps.length))}
  function stepCount(value){
    if(!value||!Array.isArray(value.routines))return 0;
    return value.routines.reduce((sum,routine)=>sum+(Array.isArray(routine?.steps)?routine.steps.length:0),0);
  }
  function destructiveChange(previous,next){
    const before=stepCount(previous),after=stepCount(next);
    if(before>0&&after===0)return true;
    return before>=8&&after<=Math.floor(before/2);
  }
  function markOperation(operation){pendingOperation=String(operation||"explicit");pendingOperationUntil=Date.now()+15000}
  function consumeOperation(fallback="local-change"){
    if(!pendingOperation||Date.now()>pendingOperationUntil){pendingOperation="";pendingOperationUntil=0;return fallback}
    const value=pendingOperation;pendingOperation="";pendingOperationUntil=0;return value;
  }
  function readProfile(){try{return JSON.parse(safeGet(SYNC_PROFILE_KEY)||"null")||null}catch{return null}}
  function markProfile(hash,revision){
    if(!cloudSync.user)return;
    safeSet(SYNC_PROFILE_KEY,JSON.stringify({uid:cloudSync.user.uid,hash:String(hash||""),revision:Number(revision||0),linkedAt:Date.now()}));
  }
  function clearBlocked(){blocked=false;issue=""}

  loadState = function(){
    const raw=safeGet(STORAGE_KEY);
    if(!raw){clearBlocked();return originalLoadState()}
    try{parseRaw(raw);clearBlocked();return originalLoadState()}
    catch(error){
      preserveCorrupt(raw,error);
      const recovery=latestValidSnapshot();
      if(recovery){safeSet(STORAGE_KEY,recovery.raw);clearBlocked();issue="손상된 저장을 이전 자동 복구본으로 되돌렸어.";return originalLoadState()}
      blocked=true;
      issue="로컬 저장이 손상되어 클라우드 덮어쓰기를 멈췄어.";
      return defaultState();
    }
  };

  writeStoredState = function(targetState,options={}){
    if(blocked&&!allowBlockedWrite)return;
    let nextRaw;
    try{nextRaw=JSON.stringify(targetState);parseRaw(nextRaw)}catch{blocked=true;issue="저장하려는 데이터가 올바르지 않아 동기화를 멈췄어.";return}
    const current=safeGet(STORAGE_KEY);
    if(current&&current!==nextRaw)snapshotRaw(current,options.reason||"before-write");
    originalWriteStoredState(targetState,options);
  };

  defaultById = function(id){
    const source=Array.isArray(privateDefaults)&&privateDefaults.length?privateDefaults:DEFAULT_ROUTINES;
    return source.find((routine)=>routine.id===id)||source[0]||originalDefaultById(id);
  };

  performResetCurrentRoutineToDefault = function(){
    snapshotCurrent("before-default-reset");
    markOperation("reset-default-routine");
    return originalPerformReset();
  };

  applyRemoteState = function(nextState,updatedAt,metadata={}){
    snapshotCurrent("before-remote-apply");
    allowBlockedWrite=true;
    try{originalApplyRemoteState(nextState,updatedAt)}finally{allowBlockedWrite=false}
    clearBlocked();
    const hash=cloudStateHash(state);
    markProfile(hash,Number(metadata.revision||0));
  };

  function privateDefaultsRef(){
    if(!cloudSync.user||!cloudSync.db||!cloudSync.api?.doc)return null;
    return cloudSync.api.doc(cloudSync.db,"users",cloudSync.user.uid,"routiner",PRIVATE_DEFAULTS_DOC_ID);
  }
  async function ensurePrivateDefaults(){
    const ref=privateDefaultsRef();
    if(!ref)return false;
    const snap=await cloudSync.api.getDoc(ref);
    if(snap.exists()){
      const data=snap.data()||{};
      if(Array.isArray(data.routines)&&data.routines.length){privateDefaults=clone(data.routines);return true}
    }
    await cloudSync.api.setDoc(ref,{tag:"ROUTINER_PRIVATE_DEFAULTS_V1",schema:1,routines:clone(DEFAULT_ROUTINES),createdAt:cloudSync.api.serverTimestamp(),updatedBy:cloudSync.deviceId});
    privateDefaults=clone(DEFAULT_ROUTINES);
    return true;
  }
  function cloudHistoryRef(revision){
    const slot=Math.abs(Number(revision)||0)%MAX_CLOUD_SNAPSHOTS;
    const id=`slot-${String(slot).padStart(2,"0")}`;
    return cloudSync.api.doc(cloudSync.db,"users",cloudSync.user.uid,"routiner",FIRESTORE_DOC_ID,"history",id);
  }
  function currentCloudRevision(payload){return Number(payload?.revision||0)}
  function shouldArchive(operation,destructive){
    if(destructive||["reset-default-routine","import-backup","conflict-keep-local","initial-upload"].includes(operation))return true;
    const last=Number(safeGet(LAST_ARCHIVE_KEY)||0);
    return !last||Date.now()-last>12*60*60*1000;
  }
  async function safeWriteCloud(operation="local-change",force=false){
    if(blocked){showToast(issue||"복구가 필요해");return false}
    if(!cloudSync.ready||!cloudSync.user||!cloudSync.db)return false;
    const firestoreMod=await firestoreModulePromise;
    const ref=cloudDocRef();
    if(!ref)return false;
    const localSlice=cloudStateSlice(state);
    const localHash=JSON.stringify(localSlice);
    const explicitOperation=consumeOperation(operation);
    try{
      const result=await firestoreMod.runTransaction(cloudSync.db,async(transaction)=>{
        const currentSnap=await transaction.get(ref);
        const currentData=currentSnap.exists()?currentSnap.data()||{}:{};
        const currentState=isPlainObject(currentData.state)?currentData.state:null;
        const currentHash=currentState?JSON.stringify(currentState):"";
        const currentRevision=currentCloudRevision(currentData);
        const profile=readProfile();
        if(!force&&currentSnap.exists()&&profile?.uid===cloudSync.user.uid&&profile.revision&&currentRevision!==profile.revision&&currentHash!==profile.hash&&currentHash!==cloudSync.lastSavedHash){const error=new Error("sync-conflict");error.currentData=currentData;throw error}
        const destructive=currentState?destructiveChange(currentState,localSlice):false;
        const allowed=force||["reset-default-routine","import-backup","conflict-keep-local","initial-upload","restore"].includes(explicitOperation);
        if(destructive&&!allowed){const error=new Error("destructive-change");error.currentData=currentData;throw error}
        const archive=Boolean(currentState&&shouldArchive(explicitOperation,destructive));
        if(archive)transaction.set(cloudHistoryRef(currentRevision),{tag:"ROUTINER_RECOVERY_V1",schema:1,state:currentState,stateHash:currentHash,revision:currentRevision,operation:String(currentData.operation||""),archivedAt:cloudSync.api.serverTimestamp(),archivedBy:cloudSync.deviceId});
        const payload=firestoreStatePayload(state);
        const nextRevision=currentRevision+1;
        payload.revision=nextRevision;
        payload.operation=explicitOperation;
        payload.stateHash=localHash;
        payload.recoveryState=stateHasData(currentState)?currentState:(isPlainObject(currentData.recoveryState)?currentData.recoveryState:null);
        transaction.set(ref,payload);
        return{revision:nextRevision,archived:archive};
      });
      if(result.archived)safeSet(LAST_ARCHIVE_KEY,String(Date.now()));
      cloudSync.lastSavedHash=localHash;
      lastLocalCloudHash=localHash;
      markProfile(localHash,result.revision);
      return true;
    }catch(error){
      if(error?.message==="sync-conflict"){
        const parsed=parseFirestoreStatePayload(error.currentData);
        if(parsed){parsed.revision=currentCloudRevision(error.currentData);parsed.conflict=true;cloudSync.pendingRemote=parsed;showToast("다른 기기 변경도 보존했어. 확인 필요")}
        return false;
      }
      if(error?.message==="destructive-change"){showToast("내용이 크게 줄어 자동 저장을 막았어");return false}
      console.warn("Routiner safe Firestore save failed",error);
      showToast("클라우드 저장 실패");
      return false;
    }
  }
  function resolveConflict(parsed){
    const useRemote=window.confirm("이 기기와 다른 기기에서 모두 내용이 바뀌었어.\n\n확인: 계정 데이터 가져오기\n취소: 이 기기 내용 유지");
    cloudSync.pendingRemote=null;
    if(useRemote){applyRemoteState(parsed.nextState,parsed.updatedAt,{revision:parsed.revision});cloudSync.lastSavedHash=cloudStateHash(state);return}
    markOperation("conflict-keep-local");
    safeWriteCloud("conflict-keep-local",true);
  }

  flushCloudSave = async function(){
    if(!cloudSync.pendingSave||!cloudSync.ready||!cloudSync.user)return;
    cloudSync.pendingSave=false;
    try{await safeWriteCloud("local-change",false)}finally{cloudSync.pendingHash=""}
  };

  syncCloudAfterSignIn = async function(){
    if(!cloudSync.ready||!cloudSync.user)return;
    try{
      await ensurePrivateDefaults();
      const ref=cloudDocRef();
      if(!ref)return;
      const snap=await cloudSync.api.getDoc(ref);
      if(!snap.exists()){
        if(blocked){showToast("로컬 저장 복구 후 동기화할 수 있어");return}
        markOperation("initial-upload");
        await safeWriteCloud("initial-upload",true);
        return;
      }
      const raw=snap.data()||{};
      const parsed=parseFirestoreStatePayload(raw);
      if(!parsed){showToast("클라우드 데이터 형식 오류");return}
      parsed.revision=currentCloudRevision(raw);
      applyRemoteActiveRun(parsed.activeRun,parsed.activeRunUpdatedAt);
      const remoteHash=cloudStateHash(parsed.nextState),localHash=cloudStateHash(state),profile=readProfile();
      if(blocked||!hadStoredStateAtBoot){applyRemoteState(parsed.nextState,parsed.updatedAt,{revision:parsed.revision});cloudSync.lastSavedHash=remoteHash;return}
      if(remoteHash===localHash){cloudSync.lastSavedHash=remoteHash;markProfile(remoteHash,parsed.revision);return}
      if(profile?.uid===cloudSync.user.uid){
        if(localHash===profile.hash&&remoteHash!==profile.hash){applyRemoteState(parsed.nextState,parsed.updatedAt,{revision:parsed.revision});cloudSync.lastSavedHash=remoteHash;return}
        if(remoteHash===profile.hash&&localHash!==profile.hash){cloudSync.lastSavedHash=remoteHash;await safeWriteCloud("local-change",false);return}
      }
      parsed.conflict=true;
      resolveConflict(parsed);
    }catch(error){console.warn("Routiner safe sync failed",error);showToast("클라우드 확인 실패")}
  };

  startCloudSnapshot = function(){
    stopCloudSnapshot();
    const ref=cloudDocRef();
    if(!ref)return;
    cloudSync.unsubscribeSnapshot=cloudSync.api.onSnapshot(ref,(snap)=>{
      if(!snap.exists())return;
      const raw=snap.data()||{},parsed=parseFirestoreStatePayload(raw);
      if(!parsed)return;
      parsed.revision=currentCloudRevision(raw);
      applyRemoteActiveRun(parsed.activeRun,parsed.activeRunUpdatedAt);
      const remoteHash=cloudStateHash(parsed.nextState),localHash=cloudStateHash(state);
      if(parsed.updatedBy===cloudSync.deviceId||remoteHash===cloudSync.lastSavedHash||remoteHash===localHash){cloudSync.lastSavedHash=remoteHash;markProfile(remoteHash,parsed.revision);return}
      const profile=readProfile();
      if(profile?.uid===cloudSync.user.uid&&localHash===profile.hash){
        if(shouldDelayRemoteApply()){parsed.conflict=false;cloudSync.pendingRemote=parsed}else applyRemoteState(parsed.nextState,parsed.updatedAt,{revision:parsed.revision});
        return;
      }
      parsed.conflict=true;
      cloudSync.pendingRemote=parsed;
      showToast("다른 기기 변경도 보존했어. 확인 필요");
    },(error)=>{console.warn("Routiner Firestore realtime sync failed",error);showToast("실시간 동기화 실패")});
  };

  applyPendingRemoteIfSafe = function(){
    if(!cloudSync.pendingRemote||shouldDelayRemoteApply())return;
    const pending=cloudSync.pendingRemote;
    cloudSync.pendingRemote=null;
    if(pending.conflict){resolveConflict(pending);return}
    applyRemoteState(pending.nextState,pending.updatedAt,{revision:pending.revision});
  };

  window.RoutinerDataSafety={
    snapshotCurrent,
    markOperation,
    isSafe:()=>!blocked,
    issue:()=>issue,
    latestLocalSnapshot,
    ensurePrivateDefaults,
    privateDefaultsReady:()=>Array.isArray(privateDefaults)&&privateDefaults.length>0,
    destructiveChange,
    safeWriteCloud
  };
})();
