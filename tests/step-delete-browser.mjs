import { chromium } from 'playwright';

const url = process.env.ROUTINER_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.route('https://www.gstatic.com/**', (route) => route.abort());
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.documentElement.dataset.routinerLoaded === 'true', null, { timeout: 20000 });

await page.evaluate(() => {
  showScreen('home');
  const routine = getRoutine('morning');
  routine.steps = [
    { id: 'safe-delete-target', icon: '·', title: '삭제 전 복구 표식', note: '', minutes: 1 },
    { id: 'safe-delete-keep', icon: '·', title: '남길 단계', note: '', minutes: 1 }
  ];
  editRoutineId = 'morning';
  editStepId = 'safe-delete-target';
  saveState({ cloud: false, reason: 'seed-delete-test' });
  openEditor('morning', 'home');
  editStepId = 'safe-delete-target';
  renderEditor();
});

const deleteButton = 'button[data-action="step-delete"][data-index="0"]';
await page.click(deleteButton);
const armed = await page.evaluate(() => ({
  count: getRoutine('morning').steps.length,
  label: document.querySelector('button[data-action="step-delete"][data-index="0"]')?.textContent.trim(),
  confirm: document.querySelector('button[data-action="step-delete"][data-index="0"]')?.classList.contains('confirm')
}));
if (armed.count !== 2 || armed.label !== '한 번 더' || !armed.confirm) throw new Error(`First delete click was destructive: ${JSON.stringify(armed)}`);

await page.click(deleteButton);
const deleted = await page.evaluate(() => ({
  count: getRoutine('morning').steps.length,
  title: getRoutine('morning').steps[0]?.title,
  preserved: window.RoutinerDataSafety.listCheckpoints().some((item) => item.reason === 'step-delete' && item.raw.includes('삭제 전 복구 표식'))
}));
if (deleted.count !== 1 || deleted.title !== '남길 단계' || !deleted.preserved) throw new Error(`Confirmed delete failed safety contract: ${JSON.stringify(deleted)}`);

await page.evaluate(() => { editStepId = 'safe-delete-keep'; renderEditor(); });
await page.click('button[data-action="step-delete"][data-index="0"]');
const lastStep = await page.evaluate(() => ({
  count: getRoutine('morning').steps.length,
  label: document.querySelector('button[data-action="step-delete"][data-index="0"]')?.textContent.trim()
}));
if (lastStep.count !== 1 || lastStep.label !== '삭제') throw new Error(`Last step delete guard failed: ${JSON.stringify(lastStep)}`);

const fatalErrors = pageErrors.filter((message) => /ReferenceError|SyntaxError/.test(message));
if (fatalErrors.length) throw new Error(`Runtime errors: ${fatalErrors.join(' | ')}`);
await browser.close();
