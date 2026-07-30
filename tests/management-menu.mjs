import fs from 'node:fs';

const app = fs.readFileSync('src/app.js', 'utf8');
const menu = fs.readFileSync('src/management-menu.js', 'utf8');
const css = fs.readFileSync('styles/management-menu.css', 'utf8');

const checks = [
  [app, 'management-menu.js'],
  [app, 'management-menu.css'],
  [menu, "recoveryButton.textContent='복구본'"],
  [menu, "importToggle.textContent='가져오기'"],
  [menu, "exportButton.textContent='내보내기'"],
  [menu, "logoutButton.textContent='로그아웃'"],
  [menu, "logoutButton.textContent='한 번 더'"],
  [menu, "panel.dataset.menuMode='root'"],
  [css, '.backup-panel.management-menu'],
  [css, '.management-menu-actions'],
  [css, '[data-menu-mode="import"]'],
  [css, '[data-menu-mode="recovery"]']
];
for (const [source, token] of checks) {
  if (!source.includes(token)) throw new Error(`Missing Routiner management menu token: ${token}`);
}
console.log('Routiner management menu static checks passed');
