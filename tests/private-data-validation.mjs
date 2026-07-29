import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const storage = new Map();
const context = {
  window: {},
  STORAGE_KEY: 'personal_routine_v01',
  FIREBASE_SDK_VERSION: '12.15.0',
  syncCloudAfterSignIn: async () => {},
  cloudSync: { user: null },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  showToast: () => {},
  console,
  Math,
  Date,
  String,
  Number,
  Array,
  Object,
  JSON,
  Promise
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/private-data-maintenance.js', 'utf8'), context);

const api = context.window.RoutinerPrivateData;
assert.equal(typeof api.validateData, 'function');
assert.equal(typeof api.hashRoutines, 'function');

const routines = [{
  id: 'morning',
  name: '아침',
  steps: [{ id: 'm1', title: '시작', note: '', minutes: 1 }]
}];
const reordered = [{
  steps: [{ minutes: 1, note: '', title: '시작', id: 'm1' }],
  name: '아침',
  id: 'morning'
}];
const hash = api.hashRoutines(routines);
assert.equal(hash.length, 16);
assert.equal(api.hashRoutines(reordered), hash, 'object key order must not change the canonical hash');
assert.equal(api.validateData({
  tag: 'ROUTINER_PRIVATE_DEFAULTS_V1',
  schema: 1,
  routines,
  defaultsHash: hash
}).hash, hash);

assert.throws(() => api.validateData({
  tag: 'ROUTINER_PRIVATE_DEFAULTS_V1',
  schema: 1,
  routines: [{ id: 'morning', steps: [] }],
  defaultsHash: hash
}), /private-defaults-invalid/);

assert.throws(() => api.validateData({
  tag: 'ROUTINER_PRIVATE_DEFAULTS_V1',
  schema: 1,
  routines,
  defaultsHash: 'wrong'
}), /private-defaults-hash-mismatch/);

console.log('Routiner private defaults validation tests passed');
