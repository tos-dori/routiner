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
await page.route('https://www.gstatic.com/**', (route) => route.abort());

async function waitLoaded() {
  await page.waitForFunction(() => document.documentElement.dataset.routinerLoaded === 'true', null, { timeout: 20000 });
}

await page.goto(url, { waitUntil: 'domcontentloaded' });
await waitLoaded();

const seeded = await page.evaluate(() => {
  showScreen('home');
  const morning = getRoutine('morning');
  morning.steps[0].title = '개인 수정 보존';
  morning.steps[0].note = '사용자 메모';
  state.sessions.morning = makeSession(morning, false);
  state.sessions.morning.status[0] = 'done';
  state.sessions.morning.index = Math.min(1, morning.steps.length - 1);
  state.completed.morning = '2026-07-29T00:00:00.000Z';
  saveState({ cloud: false, reason: 'seed-custom-state' });

  const old = prepareStateForSave(clone(state));
  old.routineSchema = 'legacy-schema-test';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(old));
  return { version: APP_VERSION, key: STORAGE_KEY, modules: document.querySelectorAll('script[data-routiner-module]').length };
});

if (seeded.version !== '1.56' || seeded.key !== 'personal_routine_v01' || seeded.modules !== 20) {
  throw new Error(`Unexpected initial structure: ${JSON.stringify(seeded)}`);
}

await page.reload({ waitUntil: 'domcontentloaded' });
await waitLoaded();

const migrated = await page.evaluate(() => {
  const morning = getRoutine('morning');
  const checkpoints = window.RoutinerDataSafety.listCheckpoints();
  return {
    title: morning.steps[0].title,
    note: morning.steps[0].note,
    sessionStatus: state.sessions.morning?.status?.[0],
    sessionIndex: state.sessions.morning?.index,
    completed: state.completed.morning,
    routineSchema: state.routineSchema,
    migrationCheckpoint: checkpoints.some((item) => item.reason === 'before-schema-migration' && item.raw.includes('개인 수정 보존')),
    checkpointCount: checkpoints.length
  };
});

if (migrated.title !== '개인 수정 보존' || migrated.note !== '사용자 메모' || migrated.sessionStatus !== 'done' || !migrated.completed || !migrated.migrationCheckpoint) {
  throw new Error(`Preserving migration failed: ${JSON.stringify(migrated)}`);
}

const timerRetention = await page.evaluate(() => {
  const before = window.RoutinerDataSafety.listCheckpoints().length;
  for (let i = 0; i < 35; i += 1) {
    state.sessions.morning.lastTick += 1000;
    state.sessions.morning.remainingSec -= 1;
    saveState({ cloud: false, reason: 'timer-tick' });
  }
  const after = window.RoutinerDataSafety.listCheckpoints().length;
  return { before, after };
});
if (timerRetention.after > timerRetention.before + 1) throw new Error(`Timer exhausted recovery history: ${JSON.stringify(timerRetention)}`);

const resetResult = await page.evaluate(() => {
  editRoutineId = 'morning';
  const routine = getRoutine('morning');
  routine.steps[0].title = '재설정 직전 표식';
  saveState({ cloud: false, reason: 'custom-before-reset' });
  performResetCurrentRoutineToDefault();
  const checkpoints = window.RoutinerDataSafety.listCheckpoints();
  return {
    resetTitle: getRoutine('morning').steps[0].title,
    preserved: checkpoints.some((item) => item.reason === 'reset-default-routine' && item.raw.includes('재설정 직전 표식'))
  };
});
if (resetResult.resetTitle === '재설정 직전 표식' || !resetResult.preserved) throw new Error(`Reset checkpoint failed: ${JSON.stringify(resetResult)}`);

await page.evaluate(() => {
  getRoutine('morning').steps[0].title = '손상 복구 표식';
  saveState({ cloud: false, reason: 'recovery-marker' });
  window.RoutinerDataSafety.checkpointCurrent('smoke-recovery', true);
  localStorage.setItem(STORAGE_KEY, '{corrupt');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await waitLoaded();

const recovered = await page.evaluate(() => ({
  title: getRoutine('morning').steps[0].title,
  safe: window.RoutinerDataSafety.isSafe(),
  issue: window.RoutinerDataSafety.issue(),
  corruptSlots: Object.keys(localStorage).filter((key) => key.startsWith(`${STORAGE_KEY}__corruptV2_`)).length,
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}));
if (!recovered.safe || recovered.title !== '손상 복구 표식' || recovered.corruptSlots < 1) throw new Error(`Corrupt recovery failed: ${JSON.stringify(recovered)}`);
if (recovered.horizontalOverflow) throw new Error('Unexpected horizontal overflow at 390px');
if (badLocalResponses.length) throw new Error(`Local resource errors: ${badLocalResponses.join(', ')}`);
const fatalErrors = pageErrors.filter((message) => /ReferenceError|SyntaxError/.test(message));
if (fatalErrors.length) throw new Error(`Runtime errors: ${fatalErrors.join(' | ')}`);

await page.screenshot({ path: '/tmp/routiner-v156-smoke.png', fullPage: true });
await browser.close();
