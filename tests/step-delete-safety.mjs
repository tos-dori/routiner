import fs from 'node:fs';

const hooks = fs.readFileSync('src/data-safety-hooks.js', 'utf8');
const bootstrap = fs.readFileSync('src/bootstrap.js', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('styles/step-delete-safety.css', 'utf8');

const required = [
  [hooks, 'armedStepDeleteId'],
  [hooks, 'checkpointCurrent("step-delete",true)'],
  [hooks, 'markOperation("step-delete")'],
  [hooks, '저장 실패로 삭제를 되돌렸어'],
  [bootstrap, 'normalizeArmedDeleteLabel'],
  [bootstrap, 'button.textContent = "삭제"'],
  [app, 'step-delete-safety.css'],
  [css, '.icon-btn.danger.confirm'],
  [css, ':has(.step-detail.active)'],
  [css, 'border-bottom:1px solid'],
  [css, 'min-height:39px']
];
for (const [source, token] of required) {
  if (!source.includes(token)) throw new Error(`Missing step-delete/editor safety token: ${token}`);
}
console.log('step delete and compact editor regression checks passed');
