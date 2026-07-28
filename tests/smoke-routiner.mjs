import { chromium } from 'playwright';

const url = process.env.ROUTINER_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
const badLocalResponses = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  if (response.url().startsWith(url) && response.status() >= 400) badLocalResponses.push(`${response.status()} ${response.url()}`);
});

await page.route('https://www.gstatic.com/**/firebase-app.js', (route) => route.fulfill({
  contentType: 'text/javascript',
  body: 'export function initializeApp(config){return {config}};'
}));
await page.route('https://www.gstatic.com/**/firebase-auth.js', (route) => route.fulfill({
  contentType: 'text/javascript',
  body: `export function getAuth(){return {}};
    export async function signInWithEmailAndPassword(){return {}};
    export async function signOut(){};
    export function onAuthStateChanged(auth,callback){queueMicrotask(()=>callback(null));return ()=>{}};`
}));
await page.route('https://www.gstatic.com/**/firebase-firestore.js', (route) => route.fulfill({
  contentType: 'text/javascript',
  body: `export function getFirestore(){return {}};
    export function doc(){return {path:Array.from(arguments).slice(1).join('/') }};
    export async function getDoc(){return {exists:()=>false,data:()=>null}};
    export async function setDoc(){};
    export function onSnapshot(ref,next){return ()=>{}};
    export function serverTimestamp(){return {__serverTimestamp:true}};
    export async function runTransaction(db,callback){return callback({get:async()=>({exists:()=>false,data:()=>null}),set(){}})};`
}));

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.documentElement.dataset.routinerLoaded === 'true', null, { timeout: 20000 });

const result = await page.evaluate(() => {
  const routineId = state.routines[0].id;
  const defaultTitle = defaultById(routineId).steps[0].title;

  state.routines[0].steps[0].title = '사용자 수정 루틴';
  saveState({ reason: 'smoke-custom' });
  editRoutineId = routineId;
  performResetCurrentRoutineToDefault();
  const resetTitle = state.routines[0].steps[0].title;
  const resetSnapshot = window.RoutinerDataSafety.latestLocalSnapshot();
  const resetSnapshotTitle = resetSnapshot ? JSON.parse(resetSnapshot.raw).routines[0].steps[0].title : '';

  state.routines[0].steps[0].title = '복구 전 루틴';
  saveState({ reason: 'smoke-recovery-before' });
  state.routines[0].steps[0].title = '복구 대상 루틴';
  saveState({ reason: 'smoke-recovery-current' });
  localStorage.setItem(STORAGE_KEY, '{broken');

  return {
    version: APP_VERSION,
    moduleCount: document.querySelectorAll('script[data-routiner-module]').length,
    defaultTitle,
    resetTitle,
    resetSnapshotTitle,
    safetyReady: typeof window.RoutinerDataSafety?.snapshotCurrent === 'function',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
});

if (result.version !== '1.56') throw new Error(`Unexpected version: ${JSON.stringify(result)}`);
if (result.moduleCount !== 18) throw new Error(`Unexpected module count: ${result.moduleCount}`);
if (!result.safetyReady) throw new Error('Data safety API unavailable');
if (result.resetTitle !== result.defaultTitle) throw new Error(`Default reset failed: ${JSON.stringify(result)}`);
if (result.resetSnapshotTitle !== '사용자 수정 루틴') throw new Error(`Reset snapshot missing: ${JSON.stringify(result)}`);
if (result.horizontalOverflow) throw new Error('Unexpected horizontal overflow at 390px');

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.documentElement.dataset.routinerLoaded === 'true', null, { timeout: 20000 });
const recovery = await page.evaluate(() => ({
  title: state.routines[0]?.steps[0]?.title,
  safe: window.RoutinerDataSafety?.isSafe(),
  issue: window.RoutinerDataSafety?.issue()
}));
if (recovery.title !== '복구 전 루틴' || !recovery.safe || !String(recovery.issue).includes('자동 복구본')) {
  throw new Error(`Routiner recovery failed: ${JSON.stringify(recovery)}`);
}

if (badLocalResponses.length) throw new Error(`Local resource errors: ${badLocalResponses.join(', ')}`);
const fatalErrors = pageErrors.filter((message) => /ReferenceError|SyntaxError|TypeError/.test(message));
if (fatalErrors.length) throw new Error(`Runtime errors: ${fatalErrors.join(' | ')}`);

await page.screenshot({ path: '/tmp/routiner-v156-smoke.png', fullPage: true });
await browser.close();
