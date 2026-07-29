(function(){
  const STATUS_KEY=`${STORAGE_KEY}__privateDefaultsStatusV1`;
  const CLEANUP_KEY_PREFIX=`${STORAGE_KEY}__conflictCleanupV2_`;
  const MAX_CONFLICT_COPIES=20;
  const CLEANUP_INTERVAL_MS=24*60*60*1000;
  const originalSyncCloudAfterSignIn=syncCloudAfterSignIn;
  let apiPatched=false;
  let firestoreMod=null;
  let status={state:"pending",message:"비공개 기본값 확인 전",hash:"",verifiedAt:0};

  function canonicalize(value){
    if(Array.isArray(value))return value.map(canonicalize);
    if(value&&typeof value==="object"){
      const output={};
      Object.keys(value).sort().forEach((key)=>{if(value[key]!==undefined)output[key]=canonicalize(value[key])});
      return output;
    }
    return value;
  }
  function stableJson(value){return JSON.stringify(canonicalize(value))}
  function hashText(text){
    let first=2166136261,second=2246822519;
    for(const char of String(text)){
      const code=char.charCodeAt(0);
      first^=code;first=Math.imul(first,16777619);
      second^=code;second=Math.imul(second,3266489917);
    }
    return(`00000000${(first>>>0).toString(16)}`).slice(-8)+(`00000000${(second>>>0).toString(16)}`).slice(-8);
  }
  function validRoutines(routines){
    return Array.isArray(routines)&&routines.length>0&&routines.every((routine)=>
      routine&&typeof routine==="object"&&!Array.isArray(routine)&&String(routine.id||"")&&
      Array.isArray(routine.steps)&&routine.steps.length>0&&routine.steps.every((step)=>step&&typeof step==="object"&&!Array.isArray(step))
    );
  }
  function validatePrivateData(data){
    if(!data||data.tag!=="ROUTINER_PRIVATE_DEFAULTS_V1"||Number(data.schema)!==1||!validRoutines(data.routines))throw new Error("private-defaults-invalid");
    const actualHash=hashText(stableJson(data.routines));
    if(String(data.defaultsHash||"")!==actualHash)throw new Error("private-defaults-hash-mismatch");
    return{routines:data.routines,hash:actualHash};
  }
  function privatePath(ref){return String(ref?.path||"").endsWith("/routiner/private-defaults")}
  function setStatus(next){
    status={...status,...next};
    try{localStorage.setItem(STATUS_KEY,JSON.stringify({uid:cloudSync.user?.uid||"",...status}))}catch{}
  }
  function verifySnapshot(snapshot){
    if(!snapshot.exists()){setStatus({state:"missing",message:"비공개 기본값 생성 전",hash:"",verifiedAt:0});return null}
    try{
      const result=validatePrivateData(snapshot.data()||{});
      window.RoutinerDataSafety?.setPrivateDefaults(result.routines);
      setStatus({state:"verified",message:"비공개 기본값 서버 검증 완료",hash:result.hash,verifiedAt:Date.now()});
      return result;
    }catch(error){
      const mismatch=String(error?.message||"")==="private-defaults-hash-mismatch";
      setStatus({state:"blocked",message:mismatch?"비공개 기본값 해시 불일치 · 자동 덮어쓰기 중단":"비공개 기본값 문서 형식 오류 · 자동 덮어쓰기 중단",hash:"",verifiedAt:0});
      throw error;
    }
  }
  async function patchApi(){
    if(apiPatched)return;
    if(!cloudSync.api||!cloudSync.db)throw new Error("firebase-api-not-ready");
    firestoreMod=await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
    const originalGetDoc=cloudSync.api.getDoc;
    const originalSetDoc=cloudSync.api.setDoc;
    cloudSync.api.getDoc=async function(ref){
      if(!privatePath(ref))return originalGetDoc(ref);
      const snapshot=await firestoreMod.getDocFromServer(ref);
      verifySnapshot(snapshot);
      return snapshot;
    };
    cloudSync.api.setDoc=async function(ref,data,options){
      if(!privatePath(ref))return originalSetDoc(ref,data,options);
      const existing=await firestoreMod.getDocFromServer(ref);
      if(existing.exists()){
        verifySnapshot(existing);
        return;
      }
      const expected=validatePrivateData(data||{});
      await originalSetDoc(ref,data,options);
      const verified=await firestoreMod.getDocFromServer(ref);
      const result=verifySnapshot(verified);
      if(!result||result.hash!==expected.hash)throw new Error("private-defaults-readback-mismatch");
    };
    apiPatched=true;
  }

  syncCloudAfterSignIn=async function(){
    try{
      await patchApi();
      await originalSyncCloudAfterSignIn();
      await cleanupConflicts();
    }catch(error){
      console.warn("Routiner private data verification failed",error);
      if(String(error?.message||"").startsWith("private-defaults"))showToast(status.message);
      else throw error;
    }
  };

  async function conflictCopies(){
    if(!cloudSync.ready||!cloudSync.user||!cloudSync.db)return[];
    firestoreMod=firestoreMod||await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
    const snapshots=await firestoreMod.getDocs(firestoreMod.collection(cloudDocRef(),"conflicts"));
    const items=[];
    snapshots.forEach((snapshot)=>{
      const data=snapshot.data()||{};
      if(!data.state||typeof data.state!=="object"||!Array.isArray(data.state.routines))return;
      items.push({
        source:"conflict",
        slot:snapshot.id,
        ref:snapshot.ref,
        state:data.state,
        revision:Number(data.observedRevision||0),
        operation:String(data.operation||"local-change"),
        createdAt:timestampMillis(data.createdAt)
      });
    });
    return items.sort((a,b)=>b.createdAt-a.createdAt);
  }
  async function cleanupConflicts(force=false){
    if(!cloudSync.user)return;
    const key=CLEANUP_KEY_PREFIX+cloudSync.user.uid,last=Number(localStorage.getItem(key)||0);
    if(!force&&last&&Date.now()-last<CLEANUP_INTERVAL_MS)return;
    const items=await conflictCopies();
    await Promise.allSettled(items.slice(MAX_CONFLICT_COPIES).map((item)=>firestoreMod.deleteDoc(item.ref)));
    localStorage.setItem(key,String(Date.now()));
  }
  function timestampMillis(value){
    if(value&&typeof value.toMillis==="function")return value.toMillis();
    if(value&&Number.isFinite(value.seconds))return value.seconds*1000;
    return 0;
  }

  window.RoutinerPrivateData={
    status:()=>({...status}),
    validateData:validatePrivateData,
    hashRoutines:(routines)=>hashText(stableJson(routines)),
    verify:async()=>{await patchApi();const ref=cloudSync.api.doc(cloudSync.db,"users",cloudSync.user.uid,"routiner","private-defaults");return verifySnapshot(await firestoreMod.getDocFromServer(ref))},
    listConflicts:conflictCopies,
    removeConflict:async(id)=>{
      if(!cloudSync.user)return;
      firestoreMod=firestoreMod||await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`);
      await firestoreMod.deleteDoc(firestoreMod.doc(cloudDocRef(),"conflicts",String(id)));
    },
    cleanupConflicts:()=>cleanupConflicts(true)
  };
})();
