const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const badLocalResponses = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
      badLocalResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.routinerLoaded === 'true',
    null,
    { timeout: 20000 }
  );

  const result = await page.evaluate(() => {
    const activeScreens = Array.from(document.querySelectorAll(
      '.auth-screen.active, .home.active, .run.active, .done-screen.active, .edit-screen.active'
    )).map((element) => element.id);

    return {
      version: APP_VERSION,
      renderHome: typeof renderHome,
      initFromUrl: typeof initFromUrl,
      moduleCount: document.querySelectorAll('script[data-routiner-module]').length,
      stylesheetLoaded: Array.from(document.styleSheets).some((sheet) => sheet.href?.endsWith('/styles/app.css')),
      activeScreens
    };
  });

  console.log(JSON.stringify({ result, pageErrors, badLocalResponses }, null, 2));

  if (result.version !== '1.55') throw new Error(`Unexpected version: ${result.version}`);
  if (result.renderHome !== 'function' || result.initFromUrl !== 'function') {
    throw new Error('Cross-file globals are unavailable');
  }
  if (result.moduleCount !== 17) throw new Error(`Unexpected module count: ${result.moduleCount}`);
  if (!result.stylesheetLoaded) throw new Error('styles/app.css was not loaded');
  if (result.activeScreens.length !== 1) {
    throw new Error(`Expected exactly one active main screen, got: ${result.activeScreens.join(', ') || 'none'}`);
  }
  if (badLocalResponses.length) throw new Error(`Local resource errors: ${badLocalResponses.join(', ')}`);

  const fatalErrors = pageErrors.filter((message) => /ReferenceError|SyntaxError/.test(message));
  if (fatalErrors.length) throw new Error(`Runtime errors: ${fatalErrors.join(' | ')}`);

  await page.screenshot({ path: '/tmp/routiner-v155-preview.png', fullPage: true });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
