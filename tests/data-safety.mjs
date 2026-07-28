import fs from 'node:fs';
import vm from 'node:vm';

class MemoryStorage {
  constructor(){this.map=new Map()}
  getItem(key){return this.map.has(key)?this.map.get(key):null}
  setItem(key,value){this.map.set(key,String(value))}
}

function makeContext(){
  const localStorage=new MemoryStorage();
  const baseRoutines=[{id:'morning',steps:[{id:'m1'}]}];
  const context={
    localStorage,
    STORAGE_KEY:'personal_routine_v01',
    FIREBASE_SDK_VERSION:'12.15.0',
    FIRESTORE_DOC_ID:'main',
    DEFAULT_ROUTINES:baseRoutines,
    state:{routines:baseRoutines},
    cloudSync:{user:null,api:null},
    lastLocalCloudHash:'',
    hadStoredStateAtBoot:true,
    window:null,
    Date,JSON,String,Array,Object,Math,Promise,console,
    isPlainObject:(value)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)),
    clone:(value)=>JSON.parse(JSON.stringify(value)),
    defaultState:()=>({routines:JSON.parse(JSON.stringify(baseRoutines))}),
    loadState(){const raw=localStorage.getItem('personal_routine_v01');if(!raw)return this.defaultState();return JSON.parse(raw)},
    writeStoredState(target){localStorage.setItem('personal_routine_v01',JSON.stringify(target))},
    applyRemoteState(next){context.state=next;context.writeStoredState(next)},
    defaultById:(id)=>baseRoutines.find((routine)=>routine.id===id),
    performResetCurrentRoutineToDefault(){return true},
    cloudStateHash:(value)=>JSON.stringify(value||context.state),
    cloudStateSlice:(value)=>value||context.state,
    showToast(){},
    cloudDocRef(){return null},
    parseFirestoreStatePayload(){return null},
    applyRemoteActiveRun(){},
    shouldDelayRemoteApply(){return false},
    stopCloudSnapshot(){},
    firestoreStatePayload:(value)=>({state:value}),
    setTimeout,clearTimeout
  };
  context.window=context;
  vm.createContext(context);
  let source=fs.readFileSync(new URL('../src/data-safety.js',import.meta.url),'utf8');
  source=source.replace(/const firestoreModulePromise = import\([^;]+;/,"const firestoreModulePromise = Promise.resolve({ runTransaction: async function(){} });");
  vm.runInContext(source,context);
  return context;
}

const ctx=makeContext();
const first={routines:[{id:'morning',steps:[{id:'m1'}]}]};
const second={routines:[{id:'morning',steps:[{id:'m1'},{id:'m2'}]}]};
ctx.writeStoredState(first,{reason:'first'});
ctx.writeStoredState(second,{reason:'second'});
ctx.localStorage.setItem(ctx.STORAGE_KEY,'{broken');
const recovered=ctx.loadState();
if(recovered.routines[0].steps.length!==1)throw new Error('corrupt local state did not recover previous snapshot');
if(!ctx.RoutinerDataSafety.isSafe())throw new Error('recovered state should be safe');
if(!ctx.RoutinerDataSafety.issue().includes('자동 복구본'))throw new Error('recovery message missing');

const blocked=makeContext();
blocked.localStorage.setItem(blocked.STORAGE_KEY,'{broken');
blocked.loadState();
if(blocked.RoutinerDataSafety.isSafe())throw new Error('unrecoverable corruption must block writes');
blocked.writeStoredState(second);
if(blocked.localStorage.getItem(blocked.STORAGE_KEY)!=='{broken')throw new Error('blocked state overwrote corrupt source');

if(!ctx.RoutinerDataSafety.destructiveChange({routines:[{steps:new Array(10).fill({})}]},{routines:[{steps:[{}]}]}))throw new Error('destructive change not detected');
