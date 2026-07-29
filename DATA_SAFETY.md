# Routiner data safety contract

## Invariants

1. `personal_routine_v01` remains the canonical offline copy.
2. A valid Routiner state must contain at least one routine and every routine must contain at least one step.
3. Invalid local JSON is quarantined and never becomes a cloud write candidate.
4. Routine schema changes preserve existing routines, sessions and completion state. A schema number alone never authorizes resetting to defaults.
5. Reset-to-default, backup import, remote replacement and restore create an immediate local checkpoint before changing state.
6. Ordinary local changes create at most one checkpoint every 10 minutes. The one-second routine timer therefore cannot consume the checkpoint ring.
7. Each browser tab owns an independent base revision/hash. A tab cannot overwrite a revision it did not observe.
8. Concurrent local work is stored in `main/conflicts/{clientId}` while canonical `main` remains unchanged.
9. Every canonical state replacement archives the previous state into one of 50 deterministic history slots in the same transaction.
10. Active-run lock updates may change only `activeRun` and `activeRunUpdatedAt`; they do not advance state revision, and state transactions preserve the latest lock read inside the transaction.
11. Cloud state above 750 KiB is rejected before Firestore's 1 MiB document limit.
12. Offline transaction failure leaves local state intact and queued for retry.
13. Explicit offline reset/import/restore intent is stored with the exact canonical state hash and is discarded if that state changes.
14. Object keys are recursively sorted before hashing, so equivalent Firestore maps produce the same compact 16-hex hash regardless of key order.
15. `private-defaults` is accepted only after a server read-back validates its structure and canonical hash. An existing malformed document is never automatically overwritten.

## Retention

- Local: 12 independent, hash-deduplicated checkpoint slots.
- Cloud: 50 previous canonical revisions.
- Conflicts: current conflict is shown immediately; stale session candidates are visible in the backup panel and automatically bounded to the newest 20 once per day.

## Privacy migration

The current public repository already contains personalized default routines in both HEAD and Git history. Data safety and access control can be deployed independently, but full privacy requires this staged migration:

1. Deploy compatible rules and schema-4 client.
2. Open the authenticated app once; the app must show `비공개 기본값 서버 검증 완료` after a server read-back and matching canonical hash for `users/{uid}/routiner/private-defaults`.
3. Deploy a second client that contains only non-personal emergency defaults and requires the verified private defaults document for reset-to-default.
4. Remove the plaintext default routine file from HEAD.
5. Either make the repository private or rewrite/replace public Git history. Deleting the current file alone does not remove old public commits or external clones.

The second client must not be deployed before step 2, because doing so would make reset-to-default unavailable on a fresh browser. A malformed or hash-mismatched private document blocks automatic replacement and must be inspected rather than regenerated over the existing data.

## Deployment order

1. Run local quota-failure tests, Firestore emulator rules tests, private-default validation tests and browser recovery tests.
2. Deploy backwards-compatible rules.
3. Deploy/merge schema-4 client.
4. Verify schema-4 main, a history slot and the server-verified private-defaults status.
5. Execute the privacy migration above.
