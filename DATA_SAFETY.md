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
10. Active-run lock updates may change only `activeRun` and `activeRunUpdatedAt`; they do not advance state revision.
11. Cloud state above 750 KiB is rejected before Firestore's 1 MiB document limit.
12. Offline transaction failure leaves local state intact and queued for retry.

## Retention

- Local: 12 independent, hash-deduplicated checkpoint slots.
- Cloud: 50 previous canonical revisions.
- Conflict: one current candidate per browser tab session, removed after resolution.

## Privacy migration

The current public repository already contains personalized default routines in both HEAD and Git history. Data safety and access control can be deployed independently, but full privacy requires this staged migration:

1. Deploy compatible rules and schema-4 client.
2. Open the authenticated app once; verify `users/{uid}/routiner/private-defaults` exists and its hash is recorded.
3. Deploy a second client that contains only non-personal emergency defaults and requires the private defaults document for reset-to-default.
4. Remove the plaintext default routine file from HEAD.
5. Either make the repository private or rewrite/replace public Git history. Deleting the current file alone does not remove old public commits or external clones.

The second client must not be deployed before step 2, because doing so would make reset-to-default unavailable on a fresh browser.

## Deployment order

1. Run Firestore emulator rules tests and browser recovery tests.
2. Deploy backwards-compatible rules.
3. Deploy/merge schema-4 client.
4. Verify schema-4 main, a history slot, and private-defaults.
5. Execute the privacy migration above.
