import { chromium } from 'playwright';

const url = process.env.ROUTINER_URL || 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('https://www.gstatic.com/**', (route) => route.abort());
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.documentElement.dataset.routinerLoaded === 'true', null, { timeout: 20000 });

await page.evaluate(() => {
  showScreen('home');
  setBackupPanelOpen(true);
});
await page.waitForSelector('.backup-panel.management-menu.active');

const root = await page.evaluate(() => {
  const panel = document.getElementById('backupPanel');
  const importSection = panel.querySelector('.management-import-section');
  const recovery = panel.querySelector('.backup-recovery');
  return {
    labels: Array.from(panel.querySelectorAll('.management-menu-actions button')).map((button) => button.textContent.trim()),
    title: panel.querySelector('.management-menu-head strong')?.textContent.trim(),
    version: panel.querySelector('.management-menu-head span')?.textContent.trim(),
    status: panel.querySelector('.management-menu-status')?.textContent.trim(),
    mode: panel.dataset.menuMode,
    importDisplay: importSection ? getComputedStyle(importSection).display : 'missing',
    recoveryDisplay: recovery ? getComputedStyle(recovery).display : 'missing',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
});
if (JSON.stringify(root.labels) !== JSON.stringify(['복구본', '내보내기', '가져오기', '로그아웃'])) throw new Error(`Wrong Routiner menu actions: ${JSON.stringify(root)}`);
if (root.title !== 'Routiner' || root.version !== 'v1.58' || !root.status.includes('저장 정상')) throw new Error(`Wrong Routiner menu header: ${JSON.stringify(root)}`);
if (root.mode !== 'root' || root.importDisplay !== 'none' || root.recoveryDisplay !== 'none' || root.horizontalOverflow) throw new Error(`Wrong Routiner root mode: ${JSON.stringify(root)}`);
await page.screenshot({ path: '/tmp/routiner-management-menu.png', fullPage: true });

await page.click('.management-menu-actions button:nth-child(3)');
const importMode = await page.evaluate(() => ({
  mode: document.getElementById('backupPanel').dataset.menuMode,
  importDisplay: getComputedStyle(document.querySelector('.management-import-section')).display,
  inputFocused: document.activeElement === document.getElementById('backupInput')
}));
if (importMode.mode !== 'import' || importMode.importDisplay === 'none') throw new Error(`Routiner import mode failed: ${JSON.stringify(importMode)}`);

await page.click('.management-menu-actions button:nth-child(1)');
await page.waitForFunction(() => document.getElementById('backupPanel').dataset.menuMode === 'recovery');
const recoveryMode = await page.evaluate(() => ({
  mode: document.getElementById('backupPanel').dataset.menuMode,
  importDisplay: getComputedStyle(document.querySelector('.management-import-section')).display,
  recoveryDisplay: getComputedStyle(document.querySelector('.backup-recovery')).display
}));
if (recoveryMode.mode !== 'recovery' || recoveryMode.importDisplay !== 'none' || recoveryMode.recoveryDisplay === 'none') throw new Error(`Routiner recovery mode failed: ${JSON.stringify(recoveryMode)}`);

await page.evaluate(() => {
  const logout = document.getElementById('backupLogoutBtn');
  logout.disabled = false;
  document.getElementById('backupPanel').dataset.menuMode = 'root';
});
await page.click('#backupLogoutBtn');
const armed = await page.evaluate(() => ({
  text: document.getElementById('backupLogoutBtn').textContent.trim(),
  confirm: document.getElementById('backupLogoutBtn').classList.contains('confirm')
}));
if (armed.text !== '한 번 더' || !armed.confirm) throw new Error(`Routiner logout was not armed: ${JSON.stringify(armed)}`);

const fatal = errors.filter((message) => /ReferenceError|SyntaxError/.test(message));
if (fatal.length) throw new Error(`Runtime errors: ${fatal.join(' | ')}`);
await browser.close();
