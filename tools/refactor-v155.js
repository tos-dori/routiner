const fs = require('fs');
const path = require('path');
const assert = require('assert');
const acorn = require('acorn');

const source = fs.readFileSync('app.js', 'utf8');
const parse = (code) => acorn.parse(code, {
  ecmaVersion: 'latest',
  sourceType: 'script',
  locations: true,
  allowAwaitOutsideFunction: true
});
const ast = parse(source);
assert.strictEqual(ast.body.length, 271, `Unexpected top-level statement count: ${ast.body.length}`);

const groups = [
  ['src/config.js', 1, 18],
  ['src/data/default-routines.js', 19, 21],
  ['src/dom.js', 22, 22],
  ['src/state-model.js', 23, 49],
  ['src/storage.js', 50, 71],
  ['src/sync.js', 72, 108],
  ['src/session.js', 109, 119],
  ['src/ui.js', 120, 131],
  ['src/calendar.js', 132, 136],
  ['src/runner.js', 137, 152],
  ['src/editor.js', 153, 167],
  ['src/feedback.js', 168, 176],
  ['src/runtime.js', 177, 198],
  ['src/scroll.js', 199, 212],
  ['src/backup.js', 213, 219],
  ['src/events.js', 220, 269],
  ['src/bootstrap.js', 270, 271]
];

function statementSource(from, to) {
  return ast.body
    .slice(from - 1, to)
    .map((node) => source.slice(node.start, node.end))
    .join('\n\n') + '\n';
}

const generated = [];
for (const [file, from, to] of groups) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let content = statementSource(from, to);
  if (file === 'src/config.js') {
    content = content.replace('const APP_VERSION = "1.54";', 'const APP_VERSION = "1.55";');
    assert(content.includes('const APP_VERSION = "1.55";'), 'APP_VERSION update failed');
  }
  fs.writeFileSync(file, content, 'utf8');
  generated.push(content);
}

const moduleFiles = groups.map(([file]) => file.replace(/^src\//, ''));
const loader = `(() => {
  const loaderScript = document.currentScript;
  const baseUrl = new URL('./', loaderScript.src);
  const moduleFiles = ${JSON.stringify(moduleFiles, null, 2)};

  function loadClassicScript(relativePath) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(relativePath, baseUrl).href;
      script.async = false;
      script.dataset.routinerModule = relativePath;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(\`Failed to load \${relativePath}\`)), { once: true });
      document.head.appendChild(script);
    });
  }

  (async () => {
    for (const file of moduleFiles) await loadClassicScript(file);
    document.documentElement.dataset.routinerLoaded = 'true';
  })().catch((error) => {
    console.error('[Routiner] module load failed', error);
    const message = document.getElementById('authMessage');
    if (message) message.textContent = '앱을 불러오지 못했어. 새로고침해.';
  });
})();
`;
fs.writeFileSync('src/app.js', loader, 'utf8');

fs.mkdirSync('styles', { recursive: true });
fs.copyFileSync('styles.css', 'styles/app.css');

let index = fs.readFileSync('index.html', 'utf8');
index = index.replace(/href="\.\/manifest\.webmanifest(?:\?v=[^"]+)?"/, 'href="./manifest.webmanifest"');
index = index.replace(/href="\.\/styles\.css(?:\?v=[^"]+)?"/, 'href="./styles/app.css"');
index = index.replace(/<script src="\.\/app\.js(?:\?v=[^"]+)?"><\/script>/, '<script src="./src/app.js"></script>');
assert(index.includes('href="./styles/app.css"'), 'Stylesheet link update failed');
assert(index.includes('src="./src/app.js"'), 'Script link update failed');
assert(!index.includes('./styles.css'), 'Old stylesheet link remains');
assert(!index.includes('./app.js'), 'Old script link remains');
fs.writeFileSync('index.html', index, 'utf8');

const expectedSource = source.replace('const APP_VERSION = "1.54";', 'const APP_VERSION = "1.55";');
const expectedAst = parse(expectedSource);
const generatedAst = parse(generated.join('\n'));

function stripPositions(value) {
  if (Array.isArray(value)) return value.map(stripPositions);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (['start', 'end', 'loc'].includes(key)) continue;
    result[key] = stripPositions(child);
  }
  return result;
}

assert.deepStrictEqual(
  stripPositions(generatedAst),
  stripPositions(expectedAst),
  'Generated module bundle is not AST-equivalent to the original app.js'
);

const architecture = `# Routiner architecture

## Stable entry files
- \`index.html\`: fixed DOM skeleton and three asset links only. Routine, timer, calendar, editor, sync, copy, and CSS patches should not modify it.
- \`manifest.webmanifest\`: PWA metadata.
- \`styles/app.css\`: all visual styling.
- \`src/app.js\`: ordered classic-script loader. Add a new module here only when a genuinely new code domain is introduced.

## JavaScript responsibilities
- \`src/config.js\`: version, storage keys, Firebase configuration, global constants.
- \`src/data/default-routines.js\`: default routines and default display order.
- \`src/dom.js\`: DOM element references.
- \`src/state-model.js\`: dates, day plans, and state-shape helpers.
- \`src/storage.js\`: local persistence, migrations, import/export serialization.
- \`src/sync.js\`: authentication and Firestore synchronization.
- \`src/session.js\`: routine sessions and time-format helpers.
- \`src/ui.js\`: theme, screen switching, and home rendering.
- \`src/calendar.js\`: monthly calendar rendering and navigation.
- \`src/runner.js\`: routine execution, timer, step movement, completion.
- \`src/editor.js\`: routine and step editing.
- \`src/feedback.js\`: toast, saved indicator, reward, celebration.
- \`src/runtime.js\`: live mutable runtime variables initialized after all core functions.
- \`src/scroll.js\`: scroll-boundary and overscroll protection.
- \`src/backup.js\`: backup panel actions.
- \`src/events.js\`: event bindings only.
- \`src/bootstrap.js\`: URL startup and final initialization.

## Invariants
- Keep storage key \`personal_routine_v01\` and existing saved-data compatibility.
- Keep the loader order unless dependency testing proves a change is safe.
- Do not move runtime initialization before storage and sync functions are defined.
- Normal feature patches should touch only the responsible source file and, when visual, \`styles/app.css\`.
`;
fs.writeFileSync('ARCHITECTURE.md', architecture, 'utf8');

fs.rmSync('app.js');
fs.rmSync('styles.css');
fs.rmSync('ARCHITECTURE_OUTLINE.txt', { force: true });
fs.rmSync('.github/workflows/one-time-outline.yml', { force: true });
