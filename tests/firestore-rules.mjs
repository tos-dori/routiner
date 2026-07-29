import fs from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'routiner-rules-test',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
});
const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const guest = env.unauthenticatedContext().firestore();
const state = { routines: [{ id: 'morning', steps: [{ id: 'm1', title: 'start' }] }], calendar: {}, dayPlans: {}, completed: {}, offToday: {} };
const legacy = {
  tag: 'ROUTINER_FIRESTORE_STATE_V1', app: 'routiner', schema: 3,
  storageKey: 'personal_routine_v01', appVersion: '1.55', dayStartHour: 6,
  updatedAt: Date.now(), serverUpdatedAt: serverTimestamp(), updatedBy: 'legacy-device',
  activeRun: null, activeRunUpdatedAt: 0, state, stateHash: JSON.stringify(state)
};
const mainV4 = (revision = 1) => ({
  tag: 'ROUTINER_FIRESTORE_STATE_V1', app: 'routiner', schema: 4,
  storageKey: 'personal_routine_v01', appVersion: '1.56', dayStartHour: 6,
  updatedAt: Date.now(), serverUpdatedAt: serverTimestamp(), updatedBy: 'device-session',
  activeRun: null, activeRunUpdatedAt: 0, state, stateHash: 'deadbeef',
  revision, operation: 'local-change'
});
const history = {
  tag: 'ROUTINER_RECOVERY_V2', schema: 2, state, stateHash: 'deadbeef',
  archivedRevision: 1, operation: 'local-change', archivedAt: serverTimestamp(), archivedBy: 'device-session'
};
const conflict = {
  tag: 'ROUTINER_CONFLICT_V1', schema: 1, state, stateHash: 'feedface',
  baseRevision: 1, baseHash: 'deadbeef', observedRevision: 2, observedHash: 'cafebabe',
  operation: 'local-change', createdAt: serverTimestamp(), updatedBy: 'device-session'
};
const defaults = {
  tag: 'ROUTINER_PRIVATE_DEFAULTS_V1', schema: 1, routines: state.routines,
  defaultsHash: 'abcdef12', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'device-session'
};

try {
  const main = doc(alice, 'users/alice/routiner/main');
  await assertSucceeds(setDoc(main, legacy));
  await assertSucceeds(updateDoc(main, { activeRun: { routineId: 'morning' }, activeRunUpdatedAt: 1 }));
  await assertSucceeds(setDoc(main, mainV4(1)));

  await assertFails(setDoc(main, legacy));
  await assertFails(setDoc(main, mainV4(3)));
  await assertSucceeds(setDoc(main, mainV4(2)));
  await assertSucceeds(updateDoc(main, { activeRun: null, activeRunUpdatedAt: 2 }));

  await assertSucceeds(getDoc(main));
  await assertFails(getDoc(doc(bob, 'users/alice/routiner/main')));
  await assertFails(getDoc(doc(guest, 'users/alice/routiner/main')));
  await assertFails(setDoc(doc(alice, 'users/alice/routiner/other'), mainV4(1)));

  await assertSucceeds(setDoc(doc(alice, 'users/alice/routiner/private-defaults'), defaults));
  await assertFails(setDoc(doc(bob, 'users/alice/routiner/private-defaults'), defaults));
  await assertFails(setDoc(doc(guest, 'users/alice/routiner/private-defaults'), defaults));

  await assertSucceeds(setDoc(doc(alice, 'users/alice/routiner/main/history/slot-00'), history));
  await assertSucceeds(setDoc(doc(alice, 'users/alice/routiner/main/history/slot-49'), history));
  await assertFails(setDoc(doc(alice, 'users/alice/routiner/main/history/slot-50'), history));
  await assertFails(setDoc(doc(bob, 'users/alice/routiner/main/history/slot-00'), history));

  await assertSucceeds(setDoc(doc(alice, 'users/alice/routiner/main/conflicts/device-tab'), conflict));
  await assertFails(setDoc(doc(alice, 'users/alice/routiner/main/conflicts/invalid id'), conflict));
  await assertFails(setDoc(doc(bob, 'users/alice/routiner/main/conflicts/device-tab'), conflict));

  await assertFails(setDoc(main, { ...mainV4(3), unexpected: true }));
  console.log('Routiner Firestore rules tests passed');
} finally {
  await env.cleanup();
}
