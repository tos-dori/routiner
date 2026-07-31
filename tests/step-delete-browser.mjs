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
    { id: 'safe-delete-keep', icon: '·', title: '남길 단계', note: '닫힌 행 구분 확인', minutes: 1 },
    { id: 'compact-row', icon: '·', title: '다른 단계', note: '', minutes: 2 }
  ];
  editRoutineId = 'morning';
  editStepId = 'safe-delete-target';
  saveState({ cloud: false, reason: 'seed-delete-test' });
  openEditor('morning', 'home');
  editStepId = 'safe-delete-target';
  renderEditor();
});

const layout = await page.evaluate(() => {
  const detail = document.querySelector('.step-detail.active');
  const activeContainer = detail?.parentElement;
  const hiddenHeader = activeContainer?.querySelector(':scope > .step-card');
  const closedContainer = Array.from(document.querySelectorAll('#stepEditorList > div')).find((item) => !item.querySelector('.step-detail.active'));
  const closedCard = closedContainer?.querySelector('.step-card');
  const activeStyle = activeContainer ? getComputedStyle(activeContainer) : null;
  const closedStyle = closedContainer ? getComputedStyle(closedContainer) : null;
  return {
    activeHeight: activeContainer?.getBoundingClientRect().height || 0,
    closedHeight: closedCard?.getBoundingClientRect().height || 0,
    activeHeaderDisplay: hiddenHeader ? getComputedStyle(hiddenHeader).display : 'missing',
    activeBorder: activeStyle?.borderTopWidth,
    activeBackground: activeStyle?.backgroundColor,
    closedBoundary: closedStyle?.borderBottomWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
});
if (
  layout.activeHeight <= 0 || layout.activeHeight > 175 ||
  layout.closedHeight <= 0 || layout.closedHeight > 42 ||
  layout.activeHeaderDisplay !== 'none' ||
  layout.activeBorder === '0px' ||
  layout.activeBackground === 'rgba(0, 0, 0, 0)' ||
  layout.closedBoundary === '0px' ||
  layout.horizontalOverflow
) throw new Error(`Compact editor contract failed: ${JSON.stringify(layout)}`);

const deleteButton = 'button[data-action="step-delete"][data-index="0"]';
const normalDeleteStyle = await page.$eval(deleteButton, (button) => getComputedStyle(button).backgroundColor);
await page.click(deleteButton);
await page.waitForFunction(() => {
  const button = document.querySelector('button[data-action="step-delete"][data-index="0"]');
  return button?.classList.contains('confirm') && button.textContent.trim() === '삭제';
});
const armed = await page.evaluate(() => {
  const button = document.querySelector('button[data-action="step-delete"][data-index="0"]');
  return {
    count: getRoutine('morning').steps.length,
    label: button?.textContent.trim(),
    confirm: button?.classList.contains('confirm'),
    background: button ? getComputedStyle(button).backgroundColor : ''
  };
});
if (armed.count !== 3 || armed.label !== '삭제' || !armed.confirm || armed.background === normalDeleteStyle) {
  throw new Error(`First delete click did not arm visually: ${JSON.stringify({ armed, normalDeleteStyle })}`);
}
await page.screenshot({ path: '/tmp/routiner-editor-compact.png', fullPage: true });

await page.click(deleteButton);
const deleted = await page.evaluate(() => ({
  count: getRoutine('morning').steps.length,
  title: getRoutine('morning').steps[0]?.title,
  preserved: window.RoutinerDataSafety.listCheckpoints().some((item) => item.reason === 'step-delete' && item.raw.includes('삭제 전 복구 표식'))
}));
if (deleted.count !== 2 || deleted.title !== '남길 단계' || !deleted.preserved) throw new Error(`Confirmed delete failed safety contract: ${JSON.stringify(deleted)}`);

await page.evaluate(() => {
  const routine = getRoutine('morning');
  routine.steps = [routine.steps[0]];
  editStepId = routine.steps[0].id;
  renderEditor();
});
await page.click('button[data-action="step-delete"][data-index="0"]');
const lastStep = await page.evaluate(() => ({
  count: getRoutine('morning').steps.length,
  label: document.querySelector('button[data-action="step-delete"][data-index="0"]')?.textContent.trim()
}));
if (lastStep.count !== 1 || lastStep.label !== '삭제') throw new Error(`Last step delete guard failed: ${JSON.stringify(lastStep)}`);

const fatalErrors = pageErrors.filter((message) => /ReferenceError|SyntaxError/.test(message));
if (fatalErrors.length) throw new Error(`Runtime errors: ${fatalErrors.join(' | ')}`);
await browser.close();
