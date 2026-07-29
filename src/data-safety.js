(function(){
  const PREFIX=`${STORAGE_KEY}__checkpointV2_`;
  const CURSOR_KEY=`${STORAGE_KEY}__checkpointCursorV2`;
  const CORRUPT_PREFIX=`${STORAGE_KEY}__corruptV2_`;
  const CORRUPT_CURSOR_KEY=`${STORAGE_KEY}__corruptCursorV2`;
  const MAX_CHECKPOINTS=12;
  const MAX_CORRUPT=3;
  const PERIODIC_MS=10*60*1000;
  const MAX_CLOUD_BYTES=750*1024;
  let blocked=false;
  let issue="";
  let privateDefaults=null;

  const originalNormalizeLoadedState=normalizeLoadedState;
  const originalWriteStoredState=writeStoredState;

  function safeGet(key){try{return localStorage.getItem(key)}catch{return null}}
  function safeSet(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}
  function slotKey(index){return`${PREFIX}${String(index).padStart(2,"0")}`}
  function corruptKey(index){return`${CORRUPT_PREFIX}${String(index).padStart(2,"0")}`}
  function cursor(key,max){const value=Number(safeGet(key)||0);return Number.isFinite(value)?Math.abs(Math.floor(value))%max:0}
  function byteLength(text){try{return new TextEncoder().encode(String(text)).length}catch{return unescape(encodeURIComponent(String(text))).length}}
  function hashText(text){let hash=2166136261;for(const char of String(text)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return(`00000000${(hash>>>0).toString(16)}`).slice(-8)}
  function object(value){return Boolean(value&&typeof value==="object"&&!Array.isArray(value))}
  function validateParsed(parsed){
    if(!object(parsed))throw new Error("state-shape");
    if(parsed.routines!==undefined&&!Array.isArray(parsed.routines))throw new Error("routines-shape");
    if(Array.isArray(parsed.routines)){
      if(!parsed.routines.length)throw new Error("routines-empty");
      parsed.routines.forEach((routine)=>{
        if(!object(routine)||!String(routine.id||""))throw new Error("routine-shape");
        if(!Array.isArray(routine.steps)||!routine.steps.length)throw new Error("steps-empty");
        routine.steps.forEach((step)=>{if(!object(step))throw new Error("step-shape")});
      });
    }
    return parsed;
  }
  function parseRaw(raw){if(typeof raw!=="string"||!raw.trim())throw new Error("empty");return validateParsed(JSON.parse(raw))}
  function forceReason(reason){return["before-remote","remote-apply","reset-default-routine","import-backup","restore-local","restore-cloud","before-schema-migration"].includes(String(reason||""))}
  function readCheckpoint(index){
    let wrapper;try{wrapper=JSON.parse(safeGet(slotKey(index))||"null")}catch{return null}
    if(!object(wrapper)||typeof wrapper.raw!=="string")return null;
    try{parseRaw(wrapper.raw)}catch{return null}
    return{slot:index,createdAt:Number(wrapper.createdAt||0),reason:String(wrapper.reason||"checkpoint"),hash:String(wrapper.hash||hashText(wrapper.raw)),size:Number(wrapper.size||byteLength(wrapper.raw)),raw:wrapper.raw};
  }
  function listCheckpoints(){const items=[];for(let i=0;i<MAX_CHECKPOINTS;i+=1){const item=readCheckpoint(i);if(item)items.push(item)}return items.sort((a,b)=>b.createdAt-a.createdAt)}
  function checkpointRaw(raw,reason,force=false){
    let parsed;try{parsed=parseRaw(raw)}catch{return false}
    const normalized=JSON.stringify(parsed),hash=hashText(normalized),latest=listCheckpoints()[0];
    if(latest?.hash===hash)return true;
    if(!force&&latest&&Date.now()-latest.createdAt<PERIODIC_MS)return false;
    const index=cursor(CURSOR_KEY,MAX_CHECKPOINTS),wrapper={schema:2,createdAt:Date.now(),reason:String(reason||"periodic"),hash,size:byteLength(normalized),raw:normalized};
    if(!safeSet(slotKey(index),JSON.stringify(wrapper)))return false;
    safeSet(CURSOR_KEY,String((index+1)%MAX_CHECKPOINTS));
    return true;
  }
  function checkpointCurrent(reason,force=true){const raw=safeGet(STORAGE_KEY);return raw?checkpointRaw(raw,reason||"manual",force):false}
  function quarantine(raw,error){const index=cursor(CORRUPT_CURSOR_KEY,MAX_CORRUPT);safeSet(corruptKey(index),JSON.stringify({schema:2,createdAt:Date.now(),error:String(error?.message||error||"invalid"),raw:String(raw||"")}));safeSet(CORRUPT_CURSOR_KEY,String((index+1)%MAX_CORRUPT))}
  function safeNormalize(parsed){
    const candidate=clone(parsed||{});
    if(candidate.routineSchema!==ROUTINE_SCHEMA_VERSION)candidate.routineSchema=ROUTINE_SCHEMA_VERSION;
    return originalNormalizeLoadedState(candidate);
  }
  function load(raw,fallbackFactory){
    if(!raw){blocked=false;issue="";return fallbackFactory()}
    try{
      const parsed=parseRaw(raw),needsMigration=parsed.routineSchema!==ROUTINE_SCHEMA_VERSION;
      if(needsMigration&&!checkpointRaw(raw,"before-schema-migration",true)){
        blocked=true;issue="업데이트 전 복구본을 남기지 못해 저장과 동기화를 중단했어.";
      }else{blocked=false;issue=""}
      const normalized=safeNormalize(parsed);validateParsed(normalized);return normalized;
    }catch(error){
      quarantine(raw,error);
      const recovery=listCheckpoints()[0];
      if(recovery){safeSet(STORAGE_KEY,recovery.raw);blocked=false;issue="손상된 저장을 자동 복구본으로 되돌렸어.";return safeNormalize(parseRaw(recovery.raw))}
      blocked=true;issue="로컬 저장이 손상되어 클라우드 저장을 차단했어.";return fallbackFactory();
    }
  }
  function write(targetState,options,rawWriter){
    if(blocked)return false;
    let normalized;try{normalized=JSON.stringify(validateParsed(targetState))}catch(error){blocked=true;issue="저장하려는 데이터 형식이 올바르지 않아 저장을 차단했어.";return false}
    const current=safeGet(STORAGE_KEY),reason=String(options?.reason||"local-change"),forced=forceReason(reason);
    if(current&&current!==normalized){
      const checkpointed=checkpointRaw(current,reason,forced);
      if(forced&&!checkpointed){blocked=true;issue="복구본을 남기지 못해 이 변경을 중단했어.";return false}
    }
    try{rawWriter(targetState,options);blocked=false;if(!issue.includes("자동 복구본"))issue="";return true}catch(error){blocked=true;issue="브라우저 저장 공간에 기록하지 못했어.";return false}
  }
  function restoreLocal(slot){
    const item=readCheckpoint(Number(slot));if(!item)throw new Error("checkpoint-not-found");
    if(!checkpointCurrent("before-restore",true))throw new Error("pre-restore-checkpoint-failed");
    if(!safeSet(STORAGE_KEY,item.raw))throw new Error("restore-write-failed");
    blocked=false;issue="선택한 로컬 복구본을 복원했어.";return safeNormalize(parseRaw(item.raw));
  }
  function cloudStateSafe(value){try{validateParsed(value);return byteLength(JSON.stringify(value))<=MAX_CLOUD_BYTES}catch{return false}}
  function cloudSize(value){try{return byteLength(JSON.stringify(value))}catch{return Infinity}}
  function privateDefaultsReady(){return Array.isArray(privateDefaults)&&privateDefaults.length>0}
  function privateDefaultById(id){if(!privateDefaultsReady())return null;return privateDefaults.find((routine)=>routine.id===id)||privateDefaults[0]||null}
  function bootstrapPending(){
    try{return isPrivateDefaultsBootstrapRoutines(state?.routines)}catch{return false}
  }
  function hydrateBootstrapState(){
    if(!privateDefaultsReady()||!bootstrapPending())return false;
    const previous=clone(state);
    state={...state,routines:clone(privateDefaults),routineSchema:ROUTINE_SCHEMA_VERSION};
    const ok=write(state,{touch:false,cloud:false,reason:"private-defaults-hydrate"},originalWriteStoredState);
    if(!ok){state=previous;issue=issue||"비공개 기본값을 기기에 저장하지 못했어.";return false}
    try{
      editRoutineId=state.routines[0]?.id||"morning";
      editStepId=null;
      renderHome();
    }catch{}
    return true;
  }
  function setPrivateDefaults(routines){
    try{validateParsed({routines});privateDefaults=clone(routines)}catch{privateDefaults=null;return false}
    hydrateBootstrapState();
    return true;
  }

  normalizeLoadedState=function(parsed){return safeNormalize(parsed)};
  loadState=function(){return load(safeGet(STORAGE_KEY),defaultState)};
  writeStoredState=function(targetState,options={}){return write(targetState,options,originalWriteStoredState)};
  defaultById=function(id){return privateDefaultById(id)};

  window.RoutinerDataSafety={
    checkpointCurrent,
    listCheckpoints,
    restoreLocal,
    isSafe:()=>!blocked,
    issue:()=>issue,
    cloudStateSafe,
    cloudSize,
    maxCloudBytes:MAX_CLOUD_BYTES,
    setPrivateDefaults,
    privateDefaultsReady,
    defaultById:privateDefaultById,
    bootstrapPending,
    hydrateBootstrapState,
    validateParsed
  };
})();
