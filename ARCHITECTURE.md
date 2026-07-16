# Routiner architecture

## Stable entry files
- `index.html`: fixed DOM skeleton and three asset links only. Routine, timer, calendar, editor, sync, copy, and CSS patches should not modify it.
- `manifest.webmanifest`: PWA metadata.
- `styles/app.css`: all visual styling.
- `src/app.js`: ordered classic-script loader. Add a new module here only when a genuinely new code domain is introduced.

## JavaScript responsibilities
- `src/config.js`: version, storage keys, Firebase configuration, global constants.
- `src/data/default-routines.js`: default routines and default display order.
- `src/dom.js`: DOM element references.
- `src/state-model.js`: dates, day plans, and state-shape helpers.
- `src/storage.js`: local persistence, migrations, import/export serialization.
- `src/sync.js`: authentication and Firestore synchronization.
- `src/session.js`: routine sessions and time-format helpers.
- `src/ui.js`: theme, screen switching, and home rendering.
- `src/calendar.js`: monthly calendar rendering and navigation.
- `src/runner.js`: routine execution, timer, step movement, completion.
- `src/editor.js`: routine and step editing.
- `src/feedback.js`: toast, saved indicator, reward, celebration.
- `src/runtime.js`: live mutable runtime variables initialized after all core functions.
- `src/scroll.js`: scroll-boundary and overscroll protection.
- `src/backup.js`: backup panel actions.
- `src/events.js`: event bindings only.
- `src/bootstrap.js`: URL startup and final initialization.

## Invariants
- Keep storage key `personal_routine_v01` and existing saved-data compatibility.
- Keep the loader order unless dependency testing proves a change is safe.
- Do not move runtime initialization before storage and sync functions are defined.
- Normal feature patches should touch only the responsible source file and, when visual, `styles/app.css`.
