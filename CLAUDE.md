# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs all three processes concurrently)
npm run start

# Build
npm run build:ng          # Angular → dist/
npm run build:electron    # Electron → dist-electron/

# Package (build + electron-builder + cleanup)
npm run package:mac
npm run package:win
npm run package:linux

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

Channel namespaces: `repo:*`, `graph:*`, `diff:*`, `conflicts:*`, `worktree:*`, `process:*`, `rebase:*`, `cherrypick:*`, `window:*`, `editor:*`.

Push events (main → renderer): `repo:statusChanged` and `process:output:{id}` — emitted via `win.webContents.send(...)`. All other channels are request-response via `ipcRenderer.invoke`.

**Multi-window isolation:** Both `worktree.ipc.ts` and `process.ipc.ts` key their in-memory maps as `${win.id}:${id}` so independent windows with different repos never share worktree or process state.

## Electron Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (preload needs `require`)
- All Node.js access is via the contextBridge; renderer never touches Node directly

## Angular App

Standalone components throughout. All routes are lazy-loaded. `repoOpenGuard` protects every route except `/`.

Routing: `/` → Welcome, `/graph` → DAG, `/conflicts` → conflict list, `/conflicts/resolve/:i` → viewer, `/conflicts/preview/:i/:option` → resolution preview, `/rebase`, `/cherry-pick`.

**`RepositoryService`** manages all repo state. It combines two sources: a `timer(0, 3000)` poll and the `repo:statusChanged` push event — both feed into the same `status$` BehaviorSubject. If conflicted files are detected, `GraphComponent` auto-navigates to `/conflicts`.

Monaco editor is loaded from `dist/assets/vs/` (copied from `node_modules/monaco-editor/min/vs` during build, with language workers and non-English NLS files excluded to reduce bundle size).

## Canvas Commit Graph

`CanvasRendererService` is provided at component level (not root). All canvas work runs inside `ngZone.runOutsideAngular()`; click handlers re-enter Angular via `ngZone.run()`. The graph virtualises rendering — only the visible commit rows ± 10 buffer rows are drawn at any time. Layout: `LANE_WIDTH=20px`, `ROW_HEIGHT=28px`, `COMMIT_RADIUS=5px`. Zoom uses `d3.zoom` with `scaleExtent [0.2, 3]`. A 5px squared-distance threshold distinguishes clicks from pans.

**`shared/commit-graph.ts`** exports `CommitGraph` — an in-memory DAG used by both the renderer (Angular) and graph builder (Electron). Key methods: `from(commits)`, `isAncestor`, `getMergeBase` (BFS LCA), `getReachableFrom` (DFS).

**Lane assignment** (`electron/src/git/graph.builder.ts`): commits arrive newest-first from `git log --topo-order`. A `laneMap` pre-assigns lanes to not-yet-seen parents. First parent inherits the same lane; additional parents (merges) open a new lane. 15 hardcoded colors cycling with modulo. Edges are cubic beziers when lanes differ.

## Conflict Resolution Flow

**Three-step flow:**

1. `/conflicts` — file list with hunk counts; Abort button calls `abortMerge` or `abortRebase` depending on `ConflictService.isRebasing`
2. `/conflicts/resolve/:i` — side-by-side Monaco: `oursView` (red) left, `theirsView` (green) right, no conflict markers; user picks Accept Current / Accept Incoming / Accept Both / Edit Manually
3. `/conflicts/preview/:i/:option` — Monaco diff editor (before vs after) + optional "Run & Test" panel

**`ConflictService`** uses Angular signals: `files = signal<ConflictFile[]>([])`, `resolvedMap = signal<Record<string,string>>({})`, `allResolved = computed(...)`.

**Pre-computation:** `conflict.reader.ts` builds all three resolution strings in memory when the file is loaded — no filesystem I/O at resolution time. The worktree is only created on demand when the user clicks "Set Up Worktree".

**Worktree lifecycle:** `git worktree add --detach /tmp/reflens/wt-{id}` → write resolved file → run commands → confirm writes to real repo and calls `git worktree remove --force`.

## Interactive Rebase Trick

`rebase.editor.ts` creates a shell script (`#!/bin/sh\ncp "todo" "$1"\n`) where the todo file is pre-written with the desired rebase entries. This script is passed as `GIT_SEQUENCE_EDITOR` when spawning `git rebase --interactive`, bypassing the interactive editor entirely.

## Editor Detection

`electron/src/editors/editor.detector.ts` detects 10 editors via platform-specific candidate paths. On macOS, it extracts the app icon via `sips` + `plutil` (`.icns` → 48px PNG base64) to work around Electron's dark-mode template icon issue. Results are cached after first detection. `openInEditor` uses `open -a` on macOS, direct `spawn` on Windows/Linux.

## Settings System

`shared/settings.types.ts` defines `AppSettings` and `DEFAULT_SETTINGS`. Settings are persisted in electron-store (`settings.json`, separate from the repos store) and accessed via `settings:get`, `settings:set`, `settings:reset` IPC channels. Main-process handlers that need settings (worktree path, rebase depth, recent repos limit) import `readSettings()` from `electron/src/settings/settings.store.ts`.

`src/app/core/services/settings.service.ts` is the Angular service: it holds a `signal<AppSettings>()`, exposes computed selectors (`rowHeight`, `monacoTheme`, `refreshInterval`, etc.), and calls `applyToDOM()` when settings change — which sets `body.theme-light`, `body.accent-*`, and `body.font-*` CSS classes, and calls `monaco.editor.setTheme()` globally.

**Theme system:** All colors are CSS custom properties defined on `:root` (dark defaults) and overridden under `body.theme-light`. Accent colors override `--accent` and `--accent-subtle` via `body.accent-purple/green/teal/pink`. Route `/settings` (no guard) navigates to the tabbed settings page; the gear icon button in the titlebar links to it.

## Environment

`.env` at repo root is loaded by `dotenv` in `main.ts`. The path resolves three levels up from `dist-electron/electron/src/`.

- `NODE_ENV=development` — loads `http://localhost:4200` instead of `dist/browser/index.html`
- `OPEN_DEV_TOOLS=false` — set to `true` to auto-open DevTools detached
