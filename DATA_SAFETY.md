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
15. `private-defaults` is accepted only after a direct server read validates its structure and canonical hash. A missing, malformed or hash-mismatched document is never regenerated or overwritten by the public client.
16. The public client contains only five non-personal bootstrap shells. A fresh browser replaces those shells with verified private defaults before any initial cloud upload.
17. Reset-to-default is unavailable until the verified private-default document is loaded. Existing routines and cloud state remain usable even when reset is unavailable.

## Retention

- Local: 12 independent, hash-deduplicated checkpoint slots.
- Cloud: 50 previous canonical revisions.
- Conflicts: current conflict is shown immediately; stale session candidates are visible in the backup panel and automatically bounded to the newest 20 once per day.
- Private defaults: one owner-only Firestore document at `users/{uid}/routiner/private-defaults`.

## Privacy migration status

Completed in the current client:

1. Compatible owner-only Firestore rules and schema-4 client were deployed.
2. The authenticated app completed a server read-back and canonical-hash verification of `private-defaults`.
3. Personalized default routines and legacy personalized copy-migration strings were removed from repository HEAD.
4. Fresh-browser bootstrap now uses non-personal shells and refuses to create or upload them as the user's initial state when private defaults cannot be verified.
5. “기본 루틴으로 재설정” now reads only the verified private document and stops without changing data when that document is unavailable.

Still unresolved:

- Earlier public Git commits and any external clones still contain the old plaintext defaults. Removing them from HEAD does not erase history.
- Retroactive removal requires either making the repository private or an explicitly approved history rewrite/clean repository migration.

## Deployment verification

1. Run local quota-failure, privacy-phase-2, private-default validation, Firestore emulator and browser recovery tests.
2. Confirm the deployed app still reports `비공개 기본값 검증됨`.
3. Confirm existing edited routines, completion records and sessions remain unchanged.
4. Confirm reset-to-default restores the private server copy and creates a checkpoint first.
