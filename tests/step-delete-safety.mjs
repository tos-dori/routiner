import fs from 'node:fs';

const hooks = fs.readFileSync('src/data-safety-hooks.js', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('styles/step-delete-safety.css', 'utf8');

const required = [
  [hooks, 'armedStepDeleteId'],
  [hooks, '한 번 더'],
  [hooks, 'checkpointCurrent("step-delete",true)'],
  [hooks, 'markOperation("step-delete")'],
  [hooks, '저장 실패로 삭제를 되돌렸어'],
  [app, 'step-delete-safety.css'],
  [css, '.icon-btn.danger.confirm']
];
for (const [source, token] of required) {
  if (!source.includes(token)) throw new Error(`Missing step-delete safety token: ${token}`);
}
console.log('step delete safety regression checks passed');
