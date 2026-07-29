import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { TextEncoder } from 'node:util';

class FakeStorage {
  constructor() { this.map = new Map(); this.failPrefix = ''; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.failPrefix && String(key).startsWith(this.failPrefix)) throw new Error('quota');
    this.map.set(String(key), String(value));
  }
}

const storage = new FakeStorage();
const baseState = (title = '기본') => ({
  version: '1.55',
  routineSchema: 'current-schema',
  routines: [{ id: 'morning', steps: [{ id: 'm1', title, minutes: 1 }] }],
  sessions: {}, completed: {}, offToday: {}, calendar: {}, dayPlans: {}
});
const context = {
  window: {},
  localStorage: storage,
  STORAGE_KEY: 'personal_routine_v01',
  ROUTINE_SCHEMA_VERSION: 'current-schema',
  TextEncoder,
  JSON, Math, Date, String, Number, Array, Object,
  unescape, encodeURIComponent,
  clone: (value) => JSON.parse(JSON.stringify(value)),
  normalizeLoadedState: (value) => JSON.parse(JSON.stringify(value)),
  loadState: () => baseState(),
  writeStoredState: (value) => storage.setItem('personal_routine_v01', JSON.stringify(value)),
  defaultById: () => baseState().routines[0],
  defaultState: () => baseState()
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/data-safety.js', 'utf8'), context);
const safety = context.window.RoutinerDataSafety;

storage.setItem(context.STORAGE_KEY, JSON.stringify(baseState('원본')));
assert.equal(safety.checkpointCurrent('first', true), true);
storage.setItem(context.STORAGE_KEY, JSON.stringify(baseState('두번째')));
assert.equal(safety.checkpointCurrent('second', true), true);
storage.setItem('personal_routine_v01__checkpointV2_01', '{broken');
assert.ok(safety.listCheckpoints().some((item) => item.raw.includes('원본')));

storage.setItem(context.STORAGE_KEY, '{corrupt');
const recovered = context.loadState();
assert.equal(recovered.routines[0].steps[0].title, '원본');
assert.equal(safety.isSafe(), true);

storage.setItem(context.STORAGE_KEY, JSON.stringify(baseState('보호할 상태')));
storage.failPrefix = 'personal_routine_v01__checkpointV2_';
context.writeStoredState(baseState('재설정 결과'), { reason: 'reset-default-routine' });
assert.equal(JSON.parse(storage.getItem(context.STORAGE_KEY)).routines[0].steps[0].title, '보호할 상태');
assert.equal(safety.isSafe(), false);

storage.failPrefix = '';
const tooLarge = baseState('x'.repeat(800_000));
assert.equal(safety.cloudStateSafe(tooLarge), false);
console.log('Routiner local data safety tests passed');
