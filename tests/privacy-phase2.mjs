import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function sourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const forbiddenFingerprints = [
  '독서실',
  '썸원',
  '우양산',
  'DayLog 열기',
  'Today 옮기고',
  '캘린더 체크하기',
  '어제 안 챙긴 음식',
  '턱걸이',
  '고양이 자세',
  '폰 없이'
];

for (const file of sourceFiles('src')) {
  const source = fs.readFileSync(file, 'utf8');
  for (const fingerprint of forbiddenFingerprints) {
    assert.equal(source.includes(fingerprint), false, `${file} still exposes private routine text: ${fingerprint}`);
  }
}

const defaultsSource = fs.readFileSync('src/data/default-routines.js', 'utf8');
const defaultsContext = {
  state: { routines: [] },
  DISPLAY_ROUTINE_ORDER: ['morning', 'outing', 'lunch', 'dinner', 'night'],
  Map,
  Array,
  String,
  Boolean
};
vm.createContext(defaultsContext);
vm.runInContext(defaultsSource, defaultsContext);
const publicDefaults = vm.runInContext('DEFAULT_ROUTINES', defaultsContext);
const isBootstrap = vm.runInContext('isPrivateDefaultsBootstrapRoutines', defaultsContext);

assert.equal(publicDefaults.length, 5);
assert.equal(isBootstrap(publicDefaults), true);
assert.ok(publicDefaults.every((routine) => routine.steps.length === 1));
assert.ok(publicDefaults.every((routine) => routine.steps[0].id.includes('private-defaults-pending')));

const syncSource = fs.readFileSync('src/sync-v2.js', 'utf8');
assert.equal(syncSource.includes('clone(DEFAULT_ROUTINES)'), false, 'client must not recreate private defaults from public shells');
assert.equal(syncSource.includes('ROUTINER_PRIVATE_DEFAULTS_V1'), false, 'sync client must not contain a private-default creation payload');

const maintenanceSource = fs.readFileSync('src/private-data-maintenance.js', 'utf8');
assert.ok(maintenanceSource.includes('private-defaults-missing'));
assert.ok(maintenanceSource.includes('자동 생성 중단'));

const hookSource = fs.readFileSync('src/data-safety-hooks.js', 'utf8');
assert.ok(hookSource.includes('privateDefaultsReady'));
assert.ok(hookSource.includes('재설정을 중단'));

console.log('Routiner privacy phase 2 tests passed');
