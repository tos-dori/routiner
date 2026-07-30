(() => {
  const loaderScript = document.currentScript;
  const baseUrl = new URL('./', loaderScript.src);
  const moduleFiles = [
  "config.js",
  "data/default-routines.js",
  "dom.js",
  "state-model.js",
  "storage.js",
  "sync.js",
  "sync-v2.js",
  "data-safety.js",
  "private-data-maintenance.js",
  "session.js",
  "ui.js",
  "calendar.js",
  "runner.js",
  "editor.js",
  "feedback.js",
  "runtime.js",
  "scroll.js",
  "backup.js",
  "data-safety-hooks.js",
  "events.js",
  "step-delete-safety.js",
  "bootstrap.js"
];

  function loadStylesheet(relativePath) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL(relativePath, baseUrl).href;
      link.dataset.routinerStyle = relativePath;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', () => reject(new Error(`Failed to load ${relativePath}`)), { once: true });
      document.head.appendChild(link);
    });
  }

  function loadClassicScript(relativePath) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(relativePath, baseUrl).href;
      script.async = false;
      script.dataset.routinerModule = relativePath;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`Failed to load ${relativePath}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  (async () => {
    await loadStylesheet('../styles/button-system.css');
    await loadStylesheet('../styles/step-delete-safety.css');
    for (const file of moduleFiles) await loadClassicScript(file);
    document.documentElement.dataset.routinerLoaded = 'true';
  })().catch((error) => {
    console.error('[Routiner] module load failed', error);
    const message = document.getElementById('authMessage');
    if (message) message.textContent = '앱을 불러오지 못했어. 새로고침해.';
  });
})();
