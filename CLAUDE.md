# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs all three processes concurrently)
npm run start

# Build
npm run build:ng          # Angular → dist/
npm run build:electron    # Electron → dist-electron/
npm run build             # both of the above
npm run build:electron:watch  # Electron TS watch only

# Package (build + electron-builder + cleanup)
npm run package:mac
npm run package:win
npm run package:linux
npm run package:all       # all three platforms

# Clean release folder (removes unpacked dirs, blockmaps, debug yml)
npm run release:clean
```

There are no tests currently.

## Component Structure

Every Angular component lives in its own folder and is split into exactly three files:
- `component-name.component.ts` — class + metadata (`templateUrl`, `styleUrl`)
- `component-name.component.html` — template
- `component-name.component.scss` — styles

Never inline `template:` or `styles:` directly in the component decorator.

## Architecture

RefLens is an Electron + Angular desktop app. The two halves compile separately and communicate only through a typed IPC bridge.

```
shared/           ← TypeScript interfaces imported by both sides (no runtime deps)
electron/src/     ← Main process (CommonJS, Node.js, simple-git)
src/              ← Angular renderer (ES2022, bundler moduleResolution)
```

**Two tsconfig targets:**
- `tsconfig.json` — Angular (module: ES2022, moduleResolution: bundler) → `dist/`
- `tsconfig.electron.json` — Electron (module: CommonJS, moduleResolution: node, rootDir: ".") → `dist-electron/`
- Both use the `@shared/*` path alias pointing to `./shared/`
- Electron compiled entry: `dist-electron/electron/src/main.js`

## IPC Contract

`shared/ipc-api.types.ts` is the single source of truth — the `ElectronAPI` interface defines every callable method. Changes here must be reflected in three places:
1. `electron/src/preload.ts` — maps each method to `ipcRenderer.invoke(channel, ...args)`
2. `electron/src/ipc/*.ipc.ts` — registers `ipcMain.handle(channel, handler)`
3. `src/app/core/services/electron-api.service.ts` — wraps each method as an `Observable`

Channel namespaces: `repo:*`, `graph:*`, `diff:*`, `conflicts:*`, `worktree:*`, `process:*`, `rebase:*`, `cherrypick:*`, `window:*`, `editor:*`, `settings:*`, `system:*`, `updater:*`.

Note: `system:platform`, `system:version`, and `system:openExternal` are registered inside `registerSettingsHandlers()` in `settings.ipc.ts` — not a separate file.

Push events (main → renderer): `repo:statusChanged`, `process:output:{id}`, and `updater:event` — emitted via `win.webContents.send(...)`. `updater:event` broadcasts to all windows via `BrowserWindow.getAllWindows().forEach(...)`. All other channels are request-response via `ipcRenderer.invoke`.

**IPC push events and NgZone:** `ipcRenderer.on` callbacks execute outside Angular's NgZone. Any subscription to push-event observables (e.g. `onStatusChanged()`, `onUpdateEvent()`) must wrap state updates in `ngZone.run()` to trigger change detection. This applies to every component using `ChangeDetectionStrategy.OnPush` that subscribes to a push event — currently `RepositoryService`, `UpdateButtonComponent`, and `SettingsAboutTabComponent`. Polling via RxJS `timer()` is zone-patched automatically and does not need this treatment.

**Multi-window isolation:** Both `worktree.ipc.ts` and `process.ipc.ts` key their in-memory maps as `${win.id}:${id}` so independent windows with different repos never share worktree or process state.

**IPC input validation:** `electron/src/ipc/ipc-guards.ts` contains all input validation helpers used by every IPC handler to prevent injection attacks: `isGitHash`, `isGitRef`, `isGitBranchName`, `safeResolveWithin` (path-traversal guard), `isSafeId`, `isAbsolutePath`, `isBoundedString`, `isRebaseAction`. Always use these when handling user-supplied strings in IPC handlers.

## Electron Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (preload needs `require`)
- All Node.js access is via the contextBridge; renderer never touches Node directly

## Electron Main Process

`electron/src/main.ts` creates windows with `titleBarStyle: 'hiddenInset'` (macOS hidden inset titlebar, traffic lights at `{ x: 16, y: 14 }`). On macOS a minimal native menu (App, File → New Window `Cmd+N`, Edit) is set; on Windows/Linux the native menu bar is suppressed entirely (`Menu.setApplicationMenu(null)`) since the Angular titlebar renders its own.

DevTools open automatically if `NODE_ENV=development` and `OPEN_DEV_TOOLS=true` in `.env`, **or** if `openDevTools: true` in the persisted `AppSettings`. On production startup, `checkForUpdatesOnStartup()` runs automatically.

`electron/src/ipc/index.ts` exports `registerGlobalHandlers(createWindow)` which calls all 12 register functions once at startup. IPC channels are process-global; per-window routing is done inside handlers via `event.sender`.

**`git.service.ts`** maintains a `Map<repoPath, SimpleGit>` singleton cache. All IPC handlers call `getGit(repoPath)` — never construct `SimpleGit` directly.

## Angular App

Standalone components throughout. All routes are lazy-loaded. `repoOpenGuard` protects every route except `/`.

Routing: `/` → Welcome, `/graph` → DAG, `/conflicts` → conflict list, `/conflicts/resolve/:fileIndex` → viewer, `/conflicts/preview/:fileIndex/:option` → resolution preview, `/rebase`, `/cherry-pick`, `/settings`, `/error` → full-page error (unguarded).

**`RepositoryService`** manages all repo state. It combines three sources into `status$` (a `BehaviorSubject`):
1. A `timer(0, interval)` poll — when `statusRefreshInterval` is `0`, polling is disabled and only a single immediate fetch runs.
2. The `repo:statusChanged` push event.
3. A chokidar-based `.git` folder watcher (`electron/src/git/watcher.ts`) started via `repo:watch` IPC.

`tryRestoreLastRepo()` gates on `settings.ready$` before reading the `restoreLastRepo` flag, so it always reads persisted settings rather than `DEFAULT_SETTINGS`. Called from `AppComponent` on init. `refreshStatus()` forces an immediate one-shot fetch; used after branch checkout and after merge completion.

**`RefreshService`** is a minimal broadcast bus: `trigger()` emits on `refresh$`. `GraphComponent` subscribes to reload the graph; `ShortcutService` calls `trigger()` on the refresh keyboard shortcut.

**`ShortcutService`** installs a global `keydown` capture listener. It reads configured combos from `SettingsService.snapshot.keyboardShortcuts` and either calls `RefreshService.trigger()`, navigates to `/settings`, or emits on `goBack$`. Components subscribe to `goBack$` contextually. Utility functions `displayParts`, `displayCombo`, and `eventToCombo` are exported for the keyboard settings tab.

Monaco editor is loaded from `dist/assets/vs/` (copied from `node_modules/monaco-editor/min/vs` during build, with language workers and non-English NLS files excluded to reduce bundle size).

**Titlebar layout:** `AppComponent` renders a custom titlebar split into two flex regions: `.titlebar__left` (holds `rl-app-menu` + `rl-nav-buttons`) and `.titlebar__actions` (right-side icon buttons). On macOS the `.titlebar--mac` class adds `padding-left: 78px` to `.titlebar__left` to clear the traffic-light buttons. Both regions have `-webkit-app-region: no-drag` so clicks register; the gap between them is draggable.

**`NavButtonsComponent`** (`src/app/shared/components/titlebar/nav-buttons/`) — back/forward navigation arrows in the titlebar. Maintains a manual `history: string[]` + `historyIndex` updated via `NavigationEnd` router events. A `navigatingHistory` flag prevents back/forward presses from appending duplicate entries. Uses Angular `Location.back()` / `Location.forward()` for actual navigation. The host element must use `display: flex` (set in `nav-buttons.component.scss` via `:host { display: flex }`) — without it, buttons stack vertically.

**Error page:** `/error` route renders `ErrorComponent` — a full-page centered card. Callers navigate via `router.navigate(['/error'], { state: { title, message } })`; the component reads `history.state` to display the right text. The natural back-button behavior dismisses the error page. Currently used by `WelcomeComponent` on repository open failure.

## Canvas Commit Graph

`CanvasRendererService` is provided at component level (not root). All canvas work runs inside `ngZone.runOutsideAngular()`; click handlers re-enter Angular via `ngZone.run()`. The graph virtualises rendering — only the visible commit rows ± 10 buffer rows are drawn at any time. Layout: `LANE_WIDTH=20px`, `ROW_HEIGHT=28px` (configurable via `graphDensity`), `COMMIT_RADIUS=5px` (configurable via `graphCommitDotSize`). Zoom uses `d3.zoom` with `scaleExtent [0.2, 3]`. A squared-distance threshold of 25 (5² px) distinguishes clicks from pans.

**`shared/commit-graph.ts`** exports `CommitGraph` — an in-memory DAG used by both the renderer (Angular) and graph builder (Electron). Key methods: `from(commits)`, `isAncestor`, `getMergeBase` (BFS LCA), `getReachableFrom` (DFS).

**Lane assignment** (`electron/src/git/graph.builder.ts`): commits arrive newest-first from `git log --topo-order`. A `laneMap` pre-assigns lanes to not-yet-seen parents. First parent inherits the same lane; additional parents (merges) open a new lane. Edges are cubic beziers when lanes differ.

**Color palettes:** Lane colors are user-selectable via `graphLaneColorPalette`: `github`, `dracula`, `solarized`, or `monochrome` — each with 15 colors cycling with modulo. The palette is applied live by `CanvasRendererService` using the `settings.laneColorPalette()` signal.

**Cherry-pick queue:** Ctrl/Cmd-clicking a commit (modifier configurable via `settings.cherryPickModifier`: `'ctrlOrMeta'` or `'alt'`) adds/removes it from `cherryPickQueue` in `GraphComponent`. "Apply Cherry-picks" navigates to `/cherry-pick` with the queue passed via router state.

## Conflict Resolution Flow

**Three-step flow:**

1. `/conflicts` — file list with hunk counts; Abort button calls `abortMerge` or `abortRebase` based on `repoService.currentStatus?.isRebasing`
2. `/conflicts/resolve/:fileIndex` — side-by-side Monaco: `oursView` (red) left, `theirsView` (green) right, no conflict markers; user picks Accept Current / Accept Incoming / Accept Both / Edit Manually
3. `/conflicts/preview/:fileIndex/:option` — Monaco diff editor (before vs after) + optional "Run & Test" panel

**`ConflictService`** uses Angular signals: `files = signal<ConflictFile[]>([])`, `resolvedMap = signal<Record<string,string>>({})`, `loading = signal(false)`, `allResolved = computed(...)`.

**`GraphComponent` conflict navigation** triggers only when `status.conflicted.length > 0` AND (`status.isMerging || status.isCherryPicking`). Rebase conflicts do not trigger this auto-navigation.

**Pre-computation:** `conflict.reader.ts` builds all three resolution strings in memory when the file is loaded — no filesystem I/O at resolution time. The worktree is only created on demand when the user clicks "Set Up Worktree".

**Worktree lifecycle:** `git worktree add --detach /tmp/reflens/wt-{id}` → write resolved file → run commands → confirm writes to real repo and calls `git worktree remove --force`.

## `.git` Folder Watcher

`electron/src/git/watcher.ts` uses chokidar to watch the entire `.git` directory, ignoring `objects/` and `logs/` (high-frequency writes irrelevant to status). On any change, `awaitWriteFinish` waits for the file write to stabilize (100ms stability threshold, 50ms poll interval), then a 300ms debounce runs before fetching status and emitting `repo:statusChanged`. Total end-to-end delay is up to ~400ms.

The watcher is started via `repo:watch` IPC (called from `RepositoryService.startStatusPolling`), keyed by `windowId`. Starting a new watcher for the same window automatically stops the previous one. A `win.once('closed')` listener calls `stopWatch(win.id)` for cleanup.

## Interactive Rebase Trick

`rebase.editor.ts` creates a shell script (`#!/bin/sh\ncp "todo" "$1"\n`) where the todo file is pre-written with the desired rebase entries. This script is passed as `GIT_SEQUENCE_EDITOR` when spawning `git rebase --interactive`, bypassing the interactive editor entirely.

## Editor Detection

`electron/src/editors/editor.detector.ts` detects 10 editors (VS Code, VS Code Insiders, Cursor, Windsurf, Zed, WebStorm, Fleet, Sublime Text, Nova, Xcode) via platform-specific candidate paths. Not all editors are available on all platforms (e.g. Nova and Xcode are macOS-only). On macOS, it extracts the app icon via `sips` + `plutil` (`.icns` → 48px PNG base64) to work around Electron's dark-mode template icon issue. Results are cached after first detection. `openInEditor` uses `open -a` on macOS, direct `spawn` on Windows/Linux.

## Settings System

`shared/settings.types.ts` defines `AppSettings`, `ShortcutMap`, and `DEFAULT_SETTINGS`. Settings are persisted in electron-store (`settings.json`, separate from the repos store) and accessed via `settings:get`, `settings:set`, `settings:reset` IPC channels. Main-process handlers that need settings (worktree path, rebase depth, recent repos limit) import `readSettings()` from `electron/src/settings/settings.store.ts`. The store overrides `DEFAULT_SETTINGS.worktreePath` (`''`) with `path.join(os.tmpdir(), 'reflens')`. On reset, `platformDefaultShortcuts()` is called rather than using `DEFAULT_SETTINGS.keyboardShortcuts` directly.

`src/app/core/services/settings.service.ts` is the Angular service: it holds a `signal<AppSettings>()`, exposes computed selectors (`rowHeight`, `monacoTheme`, `refreshInterval`, `laneColorPalette`, `graphMaxCommits`, `graphShowAllBranches`, `commitRadius`, `autoStage`, etc.), and calls `applyToDOM()` when settings change.

`applyToDOM()` applies:
- `body.theme-light` toggle
- `body.accent-*` class for accent color
- `body.font-*` class + `document.documentElement.style.fontSize` for UI font size (so all `rem`-based sizes scale correctly)
- `monaco.editor.setTheme()` globally

**`settings.ready$`** is a `ReplaySubject<void>` that fires once after the first IPC settings response. Any code that must read persisted settings at startup (not `DEFAULT_SETTINGS`) must gate on this — e.g. `tryRestoreLastRepo()`.

**`SettingsService.platform` / `isMac` / `isWindows`** — computed signals populated from `system:platform` IPC; used by `ShortcutService` for platform-appropriate modifier key display.

**`statusRefreshInterval: 0`** disables periodic polling entirely — only a single immediate fetch runs, plus push events from the file watcher.

**Theme system:** All colors are CSS custom properties defined on `:root` (dark defaults) and overridden under `body.theme-light`. Accent colors override `--accent` and `--accent-subtle` via `body.accent-purple/green/teal/pink`.

**Font size system:** `uiFontSize` (`small` → 13px, `medium` → 14px, `large` → 16px) is applied to `document.documentElement` so that all `rem`-based font sizes across every component scale correctly. Every component uses `rem` exclusively — never `px` for font sizes.

## CI/CD

`.github/workflows/release.yml` runs on every push to `main` and always produces a new release. Three sequential jobs:

1. **`version`** — runs `npm version patch --no-git-tag-version`, commits `package.json` + `package-lock.json` with message `chore(release): X.Y.Z [skip ci]` (the `[skip ci]` prevents an infinite loop), tags `vX.Y.Z`, and pushes to `main` using `secrets.GH_PAT`. Outputs `version` and `tag` to downstream jobs.
2. **`build`** — matrix across `macos-latest`, `windows-latest`, `ubuntu-latest`. Checks out the tagged commit, runs `npm ci && npm run build`, then `npx electron-builder --{mac,win,linux} --publish never`. Artifacts: `.dmg` + `.zip` (mac, both arm64 + x64), `.exe` (win), `.AppImage` (linux). `CSC_IDENTITY_AUTO_DISCOVERY: false` (unsigned builds). Uploads artifacts per-platform.
3. **`release`** — downloads all platform artifacts, creates a GitHub Release at the version tag via `softprops/action-gh-release@v2` with auto-generated release notes.

**Required GitHub configuration:**
- `secrets.GH_PAT` — a Personal Access Token with `repo` scope (used for the version-bump push and release creation, since `GITHUB_TOKEN` cannot push to protected branches)
- Actions permissions: "Read and write permissions" under Settings → Actions → General
- Branch protection: if `main` is protected, the PAT owner must have bypass rights or branch protection must allow bot pushes

GitHub auto-generates source code `.zip` and `.tar.gz` for every tagged release.

## Environment

`.env` at repo root is loaded by `dotenv` in `main.ts`. The path resolves three levels up from `dist-electron/electron/src/`.

- `NODE_ENV=development` — loads `http://localhost:4200` instead of `dist/browser/index.html`
- `OPEN_DEV_TOOLS=false` — set to `true` to auto-open DevTools detached (also controllable via the `openDevTools` setting in `AppSettings`)
