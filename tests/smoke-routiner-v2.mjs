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
  const privateDefaults = [
    { id: 'morning', icon: '↗', name: '아침', color: '#C85A4A', soft: '#F3DDD9', doneText: '완료', steps: [{ id: 'm1', icon: '·', title: '서버 기본 아침', note: '', minutes: 1 }] },
    { id: 'lunch', icon: '☀️', name: '점심', color: '#A6A43A', soft: '#EEF0CF', doneText: '완료', steps: [{ id: 'l1', icon: '·', title: '서버 기본 점심', note: '', minutes: 1 }] },
    { id: 'dinner', icon: '🌆', name: '저녁', color: '#2389C7', soft: '#DCEFFA', doneText: '완료', steps: [{ id: 'd1', icon: '·', title: '서버 기본 저녁', note: '', minutes: 1 }] },
    { id: 'outing', icon: '🧭', name: '외출', color: '#D88A2A', soft: '#F4E5CC', doneText: '완료', steps: [{ id: 'o1', icon: '·', title: '서버 기본 외출', note: '', minutes: 1 }] },
    { id: 'night', icon: '↓', name: '밤', color: '#934B8F', soft: '#F2E0EC', doneText: '완료', steps: [{ id: 'n1', icon: '·', title: '서버 기본 밤', note: '', minutes: 1 }] }
  ];

  showScreen('home');
  const bootstrapBefore = window.RoutinerDataSafety.bootstrapPending();
  const privateInstalled = window.RoutinerDataSafety.setPrivateDefaults(privateDefaults);
  const hydratedTitle = getRoutine('morning').steps[0].title;

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
  return {
    version: APP_VERSION,
    key: STORAGE_KEY,
    modules: document.querySelectorAll('script[data-routiner-module]').length,
    styles: Array.from(document.querySelectorAll('link[data-routiner-style]')).map((link) => link.dataset.routinerStyle),
    privateDataReady: typeof window.RoutinerPrivateData?.status === 'function',
    bootstrapBefore,
    privateInstalled,
    hydratedTitle
  };
});

if (
  seeded.version !== '1.58' ||
  seeded.key !== 'personal_routine_v01' ||
  seeded.modules !== 21 ||
  !seeded.styles.includes('../styles/button-system.css') ||
  !seeded.privateDataReady ||
  !seeded.bootstrapBefore ||
  !seeded.privateInstalled ||
  seeded.hydratedTitle !== '서버 기본 아침'
) {
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
    routineName: morning.name,
    sessionStatus: state.sessions.morning?.status?.[0],
    sessionIndex: state.sessions.morning?.index,
    completed: state.completed.morning,
    routineSchema: state.routineSchema,
    migrationCheckpoint: checkpoints.some((item) => item.reason === 'before-schema-migration' && item.raw.includes('개인 수정 보존')),
    checkpointCount: checkpoints.length
  };
});

if (
  migrated.title !== '개인 수정 보존' ||
  migrated.note !== '사용자 메모' ||
  migrated.routineName !== '아침' ||
  migrated.sessionStatus !== 'done' ||
  !migrated.completed ||
  !migrated.migrationCheckpoint
) {
  throw new Error(`Preserving migration failed: ${JSON.stringify(migrated)}`);
}

const buttonSystem = await page.evaluate(() => {
  openEditor('morning', 'home');
  editStepId = getRoutine('morning').steps[0].id;
  renderEditor();
  const labels = Array.from(document.querySelectorAll('.duration-btn')).slice(0, 4).map((button) => button.textContent.trim());
  const durationValue = document.querySelector('.duration-value')?.textContent.trim();
  const stepTime = document.querySelector('.step-time-pill')?.textContent.trim();
  const buttonFont = getComputedStyle(document.querySelector('.duration-btn')).fontFamily;
  const inputFont = getComputedStyle(document.querySelector('.field')).fontFamily;
  const orderButtons = Array.from(document.querySelectorAll('.step-order-controls .icon-btn')).map((button) => button.textContent.trim());
  const detail = getComputedStyle(document.querySelector('.step-detail.active'));
  return {
    labels,
    durationValue,
    stepTime,
    buttonFont,
    inputFont,
    orderButtons,
    detailBorderLeft: detail.borderLeftWidth,
    detailBorderTop: detail.borderTopWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
});

if (
  JSON.stringify(buttonSystem.labels) !== JSON.stringify(['−1m', '−15s', '+15s', '+1m']) ||
  buttonSystem.durationValue !== '1m' ||
  buttonSystem.stepTime !== '1m' ||
  !buttonSystem.buttonFont.includes('ui-rounded') ||
  buttonSystem.buttonFont === buttonSystem.inputFont ||
  JSON.stringify(buttonSystem.orderButtons) !== JSON.stringify(['↑', '↓']) ||
  buttonSystem.detailBorderLeft !== '0px' ||
  buttonSystem.detailBorderTop === '0px' ||
  buttonSystem.horizontalOverflow
) {
  throw new Error(`Compact button system failed: ${JSON.stringify(buttonSystem)}`);
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
  const privateDefaults = [
    { id: 'morning', icon: '↗', name: '아침', color: '#C85A4A', soft: '#F3DDD9', doneText: '완료', steps: [{ id: 'm1', icon: '·', title: '서버 기본 아침', note: '', minutes: 1 }] },
    { id: 'lunch', icon: '☀️', name: '점심', color: '#A6A43A', soft: '#EEF0CF', doneText: '완료', steps: [{ id: 'l1', icon: '·', title: '서버 기본 점심', note: '', minutes: 1 }] },
    { id: 'dinner', icon: '🌆', name: '저녁', color: '#2389C7', soft: '#DCEFFA', doneText: '완료', steps: [{ id: 'd1', icon: '·', title: '서버 기본 저녁', note: '', minutes: 1 }] },
    { id: 'outing', icon: '🧭', name: '외출', color: '#D88A2A', soft: '#F4E5CC', doneText: '완료', steps: [{ id: 'o1', icon: '·', title: '서버 기본 외출', note: '', minutes: 1 }] },
    { id: 'night', icon: '↓', name: '밤', color: '#934B8F', soft: '#F2E0EC', doneText: '완료', steps: [{ id: 'n1', icon: '·', title: '서버 기본 밤', note: '', minutes: 1 }] }
  ];

  editRoutineId = 'morning';
  const routine = getRoutine('morning');
  routine.steps[0].title = '재설정 직전 표식';
  saveState({ cloud: false, reason: 'custom-before-reset' });

  const beforeBlocked = window.RoutinerDataSafety.listCheckpoints().length;
  performResetCurrentRoutineToDefault();
  const blockedTitle = getRoutine('morning').steps[0].title;
  const afterBlocked = window.RoutinerDataSafety.listCheckpoints().length;

  window.RoutinerDataSafety.setPrivateDefaults(privateDefaults);
  performResetCurrentRoutineToDefault();
  const checkpoints = window.RoutinerDataSafety.listCheckpoints();
  return {
    blockedTitle,
    blockedCreatedCheckpoint: afterBlocked !== beforeBlocked,
    resetTitle: getRoutine('morning').steps[0].title,
    preserved: checkpoints.some((item) => item.reason === 'reset-default-routine' && item.raw.includes('재설정 직전 표식'))
  };
});
if (
  resetResult.blockedTitle !== '재설정 직전 표식' ||
  resetResult.blockedCreatedCheckpoint ||
  resetResult.resetTitle !== '서버 기본 아침' ||
  !resetResult.preserved
) {
  throw new Error(`Private reset gate failed: ${JSON.stringify(resetResult)}`);
}

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

await page.screenshot({ path: '/tmp/routiner-v158-smoke.png', fullPage: true });
await browser.close();
