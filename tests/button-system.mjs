import fs from 'node:fs';
import assert from 'node:assert/strict';

const session = fs.readFileSync('src/session.js', 'utf8');
const editor = fs.readFileSync('src/editor.js', 'utf8');
const loader = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('styles/button-system.css', 'utf8');

assert.ok(session.includes('return `${s}s`'));
assert.ok(session.includes('return `${m}m`'));
assert.ok(session.includes('return `${m}m ${s}s`'));
assert.equal(session.includes('`${s}초`'), false);
assert.equal(session.includes('`${m}분`'), false);

for (const label of ['−1m', '−15s', '+15s', '+1m']) {
  assert.ok(editor.includes(`>${label}</button>`), `missing compact duration label ${label}`);
}
assert.equal(editor.includes('−1분'), false);
assert.equal(editor.includes('−15초'), false);
assert.ok(editor.includes('class="step-order-controls"'));
assert.ok(editor.includes('aria-label="위로 이동">↑</button>'));
assert.ok(editor.includes('aria-label="아래로 이동">↓</button>'));

assert.ok(loader.includes("loadStylesheet('../styles/button-system.css')"));
assert.ok(css.includes('ui-rounded'));
assert.ok(css.includes('button:not(.routine-card):not(.step-card):not(.calendar-day)'));
assert.ok(css.includes('.step-order-controls'));
assert.ok(css.includes('grid-template-columns: 42px 48px minmax(58px, 1fr) 48px 42px'));
assert.ok(css.includes('.icon-btn.danger'));

console.log('Routiner compact button system tests passed');
