(function(){
  const PROFILE_KEY=`${STORAGE_KEY}__syncProfileV2`;
  const PENDING_OPERATION_KEY=`${STORAGE_KEY}__pendingOperationV2`;
  const HISTORY_SLOTS=50;
  const SAVE_DEBOUNCE_MS=2500;
  const EXPLICIT_OPERATIONS=["reset-default-routine","import-backup","restore-local","restore-cloud","conflict-keep-local","initial-upload"];
  const sessionId=(crypto?.randomUUID?crypto.randomUUID():`session-${Date.now()}-${Math.random().toString(16).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,18);
  const clientId=(`${cloudSync.deviceId}`.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,36)+`-${sessionId}`).slice(0,64);
  const firestoreModulePromise=import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
  let baseRevision=0;
  let baseHash="";
  let pendingOperation="local-change";
  let pendingOperationHash="";
  let pendingRestored=false;
  let retryPending=false;

  function canonicalize(value){if(Array.isArray(value))return value.map(canonicalize);if(value&&typeof value==="object"){const output={};Object.keys(value).sort().forEach((key)=>{if(value[key]!==undefined)output[key]=canonicalize(value[key])});return output}return value}
  function stableJson(value){return JSON.stringify(canonicalize(value))}
  function hashText(text){let first=2166136261,second=2246822519;for(const char of String(text)){const code=char.charCodeAt(0);first^=code;first=Math.imul(first,16777619);second^=code;second=Math.imul(second,3266489917)}return(`00000000${(first>>>0).toString(16)}`).slice(-8)+(`00000000${(second>>>0).toString(16)}`).slice(-8)}
  function stateJson(targetState=state){return stableJson(cloudStateSlice(targetState))}
  function compactHash(targetState=state){return hashText(stateJson(targetState))}
  function readProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"null")||null}catch{return null}}
  function writeProfile(hash,revision){if(!cloudSync.user)return;baseHash=String(hash||"");baseRevision=Number(revision||0);try{localStorage.setItem(PROFILE_KEY,JSON.stringify({uid:cloudSync.user.uid,hash:baseHash,revision:baseRevision,linkedAt:Date.now()}))}catch{}}
  function explicitOperation(value){return EXPLICIT_OPERATIONS.includes(String(value||""))}
  function clearPendingOperation(){pendingOperation="local-change";pendingOperationHash="";try{localStorage.removeItem(PENDING_OPERATION_KEY)}catch{}}
  function restorePendingOperation(){
    if(pendingRestored)return;pendingRestored=true;
    try{const saved=JSON.parse(localStorage.getItem(PENDING_OPERATION_KEY)||"null");if(saved&&explicitOperation(saved.operation)&&String(saved.hash||"")===compactHash(state)){pendingOperation=String(saved.operation);pendingOperationHash=String(saved.hash);return}localStorage.removeItem(PENDING_OPERATION_KEY)}catch{try{localStorage.removeItem(PENDING_OPERATION_KEY)}catch{}}
  }
  function persistPendingOperation(){if(!explicitOperation(pendingOperation))return;pendingOperationHash=compactHash(state);try{localStorage.setItem(PENDING_OPERATION_KEY,JSON.stringify({operation:pendingOperation,hash:pendingOperationHash,createdAt:Date.now()}))}catch{}}
  function operationPriority(value){return EXPLICIT_OPERATIONS.includes(value)?2:value&&value!=="local-change"&&value!=="boot"?1:0}
  function markOperation(value){value=String(value||"local-change");if(operationPriority(value)>=operationPriority(pendingOperation)){pendingOperation=value;if(explicitOperation(value))pendingOperationHash=""}}
  function prepareOperation(requested){
    restorePendingOperation();const currentHash=compactHash(state);
    if(pendingOperationHash&&pendingOperationHash!==currentHash)clearPendingOperation();
    requested=String(requested||"local-change");if(operationPriority(requested)>=operationPriority(pendingOperation))pendingOperation=requested;
    if(explicitOperation(pendingOperation))persistPendingOperation();
    return pendingOperation;
  }
  function safeLocal(){
    if(window.RoutinerDataSafety&&!window.RoutinerDataSafety.isSafe()){showToast(window.RoutinerDataSafety.issue()||"로컬 복구 필요");return false}
    const slice=cloudStateSlice(state);
    if(window.RoutinerDataSafety&&!window.RoutinerDataSafety.cloudStateSafe(slice)){showToast("데이터 형식 또는 크기를 확인해");return false}
    return true;
  }
  function currentRevision(data){return Number(data?.revision||0)}
  function cloudMainRef(){return cloudDocRef()}
  function historyRef(revision){const slot=Math.abs(Number(revision)||0)%HISTORY_SLOTS;return cloudSync.api.doc(cloudSync.db,"users",cloudSync.user.uid,"routiner",FIRESTORE_DOC_ID,"history",`slot-${String(slot).padStart(2,"0")}`)}
  function conflictRef(){return cloudSync.api.doc(cloudSync.db,"users",cloudSync.user.uid,"routiner",FIRESTORE_DOC_ID,"conflicts",clientId)}
  function privateDefaultsRef(){return cloudSync.api.doc(cloudSync.db,"users",cloudSync.user.uid,"routiner","private-defaults")}
  function mainPayload(targetState,revision,operation,activeRunValue=cloudSync.activeRun,activeRunUpdatedValue=cloudSync.activeRunUpdatedAt){
    const slice=cloudStateSlice(targetState),hash=hashText(stableJson(slice));
    return{tag:FIRESTORE_TAG,app:"routiner",schema:FIRESTORE_SCHEMA,storageKey:STORAGE_KEY,appVersion:APP_VERSION,dayStartHour:DAY_START_HOUR,updatedAt:Date.now(),serverUpdatedAt:cloudSync.api.serverTimestamp(),updatedBy:clientId,activeRun:clone(activeRunValue||null),activeRunUpdatedAt:Number(activeRunUpdatedValue||0),state:slice,stateHash:hash,revision:Number(revision||0),operation:String(operation||"local-change")};
  }
  function historyPayload(data,remote,remoteHash,revision){return{tag:"ROUTINER_RECOVERY_V2",schema:2,state:remote,stateHash:remoteHash,archivedRevision:Number(revision||0),operation:String(data?.operation||"legacy"),archivedAt:cloudSync.api.serverTimestamp(),archivedBy:clientId}}
  function conflictPayload(local,localHash,remoteRevision,remoteHash,operation){return{tag:"ROUTINER_CONFLICT_V1",schema:1,state:local,stateHash:localHash,baseRevision:Number(baseRevision||0),baseHash:String(baseHash||""),observedRevision:Number(remoteRevision||0),observedHash:String(remoteHash||""),operation:String(operation||"local-change"),createdAt:cloudSync.api.serverTimestamp(),updatedBy:clientId}}
  function parsePayload(payload){
    if(!isPlainObject(payload)||payload.tag!==FIRESTORE_TAG||payload.app!=="routiner"||payload.storageKey!==STORAGE_KEY||!isPlainObject(payload.state))return null;
    const schema=Number(payload.schema||0);if(![1,2,3,FIRESTORE_SCHEMA].includes(schema))return null;
    const nextState=normalizeLoadedState(payload.state),activeRun=normalizeActiveRun(payload.activeRun),activeRunUpdatedAt=Number(payload.activeRunUpdatedAt||activeRun?.updatedAt||0);
    return{nextState,updatedAt:Number(payload.updatedAt||0),updatedBy:String(payload.updatedBy||""),schema,activeRun,activeRunUpdatedAt,revision:Number(payload.revision||0),stateHash:hashText(stableJson(cloudStateSlice(nextState))),operation:String(payload.operation||"")};
  }
  async function ensurePrivateDefaults(){
    if(!cloudSync.ready||!cloudSync.user)return false;
    const ref=privateDefaultsRef(),snap=await cloudSync.api.getDoc(ref);
    if(snap.exists()){
      const data=snap.data()||{};
      if(Array.isArray(data.routines)&&data.routines.length){window.RoutinerDataSafety?.setPrivateDefaults(data.routines);return true}
    }
    const routines=clone(DEFAULT_ROUTINES),defaultsHash=hashText(stableJson(routines));
    await cloudSync.api.setDoc(ref,{tag:"ROUTINER_PRIVATE_DEFAULTS_V1",schema:1,routines,defaultsHash,createdAt:cloudSync.api.serverTimestamp(),updatedAt:cloudSync.api.serverTimestamp(),updatedBy:clientId},{merge:false});
    window.RoutinerDataSafety?.setPrivateDefaults(routines);return true;
  }
  async function preserveConflict(local,localHash,remoteRevision,remoteHash,operation){
    try{await cloudSync.api.setDoc(conflictRef(),conflictPayload(local,localHash,remoteRevision,remoteHash,operation),{merge:false})}catch(error){if(navigator.onLine)console.warn("Routiner conflict preservation failed",error)}
  }
  async function clearConflict(){try{const mod=await firestoreModulePromise;await mod.deleteDoc(conflictRef())}catch{}}
  function applyRemote(parsed){
    const previous=clone(state);
    if(window.RoutinerDataSafety?.checkpointCurrent("before-remote",true)===false){showToast("원격 적용 전 복구본을 남기지 못했어");return false}
    cloudSync.applyingRemote=true;
    state=mergeRemoteStateWithLocal(parsed.nextState);
    const nextHash=compactHash(state);
    lastLocalCloudHash=nextHash;cloudSync.lastSavedHash=nextHash;
    writeLocalUpdatedAt(parsed.updatedAt||Date.now());
    saveState({touch:false,cloud:false,reason:"remote-apply"});
    if(!window.RoutinerDataSafety?.isSafe()){state=previous;cloudSync.applyingRemote=false;showToast("원격 상태 저장 실패로 적용을 되돌렸어");return false}
    if(!getRoutine(editRoutineId))editRoutineId=state.routines[0]?.id||"morning";
    if(editStepId&&!getRoutine(editRoutineId)?.steps.some((step)=>step.id===editStepId))editStepId=null;
    cloudSync.applyingRemote=false;writeProfile(nextHash,parsed.revision);clearPendingOperation();renderAfterRemoteMerge();clearConflict();return true;
  }
  async function resolveConflict(parsed){
    const useRemote=window.confirm("이 기기와 다른 기기에서 모두 내용이 바뀌었어.\n\n확인: 계정 데이터 사용\n취소: 이 기기 데이터 사용");
    cloudSync.pendingRemote=null;
    if(useRemote){applyRemote(parsed);return}
    markOperation("conflict-keep-local");await safeWriteCloud(true,"conflict-keep-local");await clearConflict();
  }
  function holdConflict(parsed){
    parsed.conflict=true;cloudSync.pendingRemote=parsed;showToast("다른 기기 변경과 이 기기 변경을 모두 보존했어");
    preserveConflict(cloudStateSlice(state),compactHash(state),parsed.revision,parsed.stateHash,pendingOperation);
  }
  async function safeWriteCloud(force=false,requestedOperation="local-change"){
    if(!safeLocal()||!cloudSync.ready||!cloudSync.user||!cloudSync.db)return false;
    const operation=prepareOperation(requestedOperation),mod=await firestoreModulePromise,ref=cloudMainRef(),local=cloudStateSlice(state),localHash=hashText(stableJson(local));
    if(!force&&localHash===baseHash){clearPendingOperation();return true}
    try{
      const result=await mod.runTransaction(cloudSync.db,async(transaction)=>{
        const snap=await transaction.get(ref),exists=snap.exists(),data=exists?snap.data()||{}:{},parsed=exists?parsePayload(data):null;
        if(exists&&!parsed)throw new Error("cloud-state-invalid");
        const remoteExact=exists?data.state:null,remoteHash=exists?parsed.stateHash:"",remoteRevision=exists?currentRevision(data):0;
        if(exists&&remoteHash===localHash)return{kind:"same",revision:remoteRevision,hash:remoteHash};
        if(!force&&exists&&(remoteRevision!==baseRevision||remoteHash!==baseHash)){
          transaction.set(conflictRef(),conflictPayload(local,localHash,remoteRevision,remoteHash,operation),{merge:false});
          return{kind:"conflict",parsed};
        }
        if(exists)transaction.set(historyRef(remoteRevision),historyPayload(data,remoteExact,hashText(stableJson(remoteExact)),remoteRevision),{merge:false});
        const nextRevision=remoteRevision+1,payload=mainPayload(state,nextRevision,operation,exists?data.activeRun:cloudSync.activeRun,exists?data.activeRunUpdatedAt:cloudSync.activeRunUpdatedAt);
        transaction.set(ref,payload,{merge:false});
        return{kind:"written",revision:nextRevision,hash:payload.stateHash};
      });
      if(result.kind==="conflict"){holdConflict(result.parsed);return false}
      writeProfile(result.hash,result.revision);cloudSync.lastSavedHash=result.hash;lastLocalCloudHash=result.hash;clearPendingOperation();retryPending=false;return true;
    }catch(error){
      const code=String(error?.code||error?.message||"");
      if(code.includes("unavailable")||code.includes("network")||!navigator.onLine){retryPending=true;showToast("오프라인 저장됨 · 연결되면 동기화");return false}
      console.warn("Routiner safe cloud save failed",error);showToast(code==="cloud-state-invalid"?"클라우드 데이터 형식 오류 · 덮어쓰기 중단":"클라우드 저장 실패");return false;
    }
  }

  cloudStateHash=function(targetState=state){return compactHash(targetState)};
  firestoreStatePayload=function(targetState=state){return mainPayload(targetState,baseRevision,pendingOperation)};
  parseFirestoreStatePayload=parsePayload;
  enqueueCloudSave=function(){
    prepareOperation(pendingOperation);
    if(cloudSync.applyingRemote||!cloudSync.ready||!cloudSync.user||!cloudSync.db)return;
    cloudSync.pendingSave=true;if(cloudSync.saveTimer)window.clearTimeout(cloudSync.saveTimer);
    cloudSync.saveTimer=window.setTimeout(flushCloudSave,SAVE_DEBOUNCE_MS);
  };
  flushCloudSave=async function(){if(!cloudSync.pendingSave||!cloudSync.ready||!cloudSync.user)return;cloudSync.pendingSave=false;await safeWriteCloud(false,pendingOperation);cloudSync.pendingHash=""};
  syncCloudAfterSignIn=async function(){
    if(!cloudSync.ready||!cloudSync.user)return;
    try{
      restorePendingOperation();await ensurePrivateDefaults();
      const profile=readProfile();baseRevision=profile?.uid===cloudSync.user.uid?Number(profile.revision||0):0;baseHash=profile?.uid===cloudSync.user.uid?String(profile.hash||""):"";
      const ref=cloudMainRef(),snap=await cloudSync.api.getDoc(ref),localHash=compactHash(state);
      if(!snap.exists()){if(safeLocal())await safeWriteCloud(true,"initial-upload");return}
      const parsed=parsePayload(snap.data());if(!parsed){showToast("클라우드 데이터 형식 오류 · 자동 덮어쓰기 중단");return}
      applyRemoteActiveRun(parsed.activeRun,parsed.activeRunUpdatedAt);
      if(parsed.stateHash===localHash){writeProfile(parsed.stateHash,parsed.revision);cloudSync.lastSavedHash=parsed.stateHash;clearPendingOperation();return}
      const linked=profile?.uid===cloudSync.user.uid;
      if(!linked){if(!hadStoredStateAtBoot){applyRemote(parsed);return}holdConflict(parsed);return}
      if(localHash===baseHash&&parsed.stateHash!==baseHash){applyRemote(parsed);return}
      if(parsed.stateHash===baseHash&&localHash!==baseHash){await safeWriteCloud(false,"local-change");return}
      holdConflict(parsed);
    }catch(error){console.warn("Routiner safe sync failed",error);showToast("클라우드 확인 실패")}
  };
  startCloudSnapshot=function(){
    stopCloudSnapshot();const ref=cloudMainRef();if(!ref)return;
    cloudSync.unsubscribeSnapshot=cloudSync.api.onSnapshot(ref,(snap)=>{
      if(!snap.exists())return;const parsed=parsePayload(snap.data());if(!parsed)return;
      applyRemoteActiveRun(parsed.activeRun,parsed.activeRunUpdatedAt);
      const localHash=compactHash(state);
      if(parsed.updatedBy===clientId){writeProfile(parsed.stateHash,parsed.revision);cloudSync.lastSavedHash=parsed.stateHash;if(parsed.stateHash!==localHash)enqueueCloudSave();else clearPendingOperation();return}
      if(parsed.stateHash===localHash){writeProfile(parsed.stateHash,parsed.revision);cloudSync.lastSavedHash=parsed.stateHash;clearPendingOperation();return}
      if(localHash===baseHash){if(shouldDelayRemoteApply())cloudSync.pendingRemote=parsed;else applyRemote(parsed);return}
      if(parsed.stateHash===baseHash){enqueueCloudSave();return}
      holdConflict(parsed);
    },(error)=>{console.warn("Routiner realtime sync failed",error);showToast("실시간 동기화 실패")});
  };
  applyPendingRemoteIfSafe=function(){if(!cloudSync.pendingRemote||shouldDelayRemoteApply())return;const pending=cloudSync.pendingRemote;cloudSync.pendingRemote=null;if(pending.conflict){resolveConflict(pending);return}applyRemote(pending)};

  window.addEventListener("online",()=>{if(retryPending){retryPending=false;enqueueCloudSave()}});
  window.RoutinerSyncV2={markOperation,safeWriteCloud,ensurePrivateDefaults,listCloudHistory,restoreCloudHistory,clientId};

  async function listCloudHistory(){
    if(!cloudSync.ready||!cloudSync.user)return[];const mod=await firestoreModulePromise,snaps=await mod.getDocs(mod.collection(cloudMainRef(),"history")),items=[];
    snaps.forEach((snap)=>{const data=snap.data()||{};if(isPlainObject(data.state))items.push({slot:snap.id,state:data.state,revision:Number(data.archivedRevision||0),operation:String(data.operation||"저장")})});
    return items.sort((a,b)=>b.revision-a.revision);
  }
  async function restoreCloudHistory(item){
    if(!item?.state)return false;const previous=clone(state);
    if(window.RoutinerDataSafety?.checkpointCurrent("before-restore",true)===false)return false;
    markOperation("restore-cloud");state=normalizeLoadedState(item.state);saveState({reason:"restore-cloud"});
    if(!window.RoutinerDataSafety?.isSafe()){state=previous;renderHome();return false}
    renderHome();return safeWriteCloud(true,"restore-cloud");
  }
})();
