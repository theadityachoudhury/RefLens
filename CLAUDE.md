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

Channel namespaces: `repo:*`, `graph:*`, `diff:*`, `conflicts:*`, `worktree:*`, `process:*`, `rebase:*`, `cherrypick:*`.

Push events (main → renderer): `repo:statusChanged` and `process:output:{id}` — emitted via `win.webContents.send(...)`.

## Electron Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (preload needs `require`)
- All Node.js access is via the contextBridge; renderer never touches Node directly

## Angular App

Standalone components throughout. All routes are lazy-loaded. `repoOpenGuard` protects every route except `/`.

Routing: `/` → Welcome, `/graph` → DAG, `/conflicts` → conflict list, `/conflicts/resolve/:i` → viewer, `/conflicts/preview/:i/:option` → resolution preview, `/rebase`, `/cherry-pick`.

Monaco editor is loaded from `dist/assets/vs/` (copied from `node_modules/monaco-editor/min/vs` during build, with language workers and non-English NLS files excluded to reduce bundle size).

## D3 Commit Graph

`GraphRendererService` is provided at component level (not root). All D3 DOM work runs inside `ngZone.runOutsideAngular()`; click handlers re-enter Angular via `ngZone.run()`. The graph virtualises rendering — only the visible commit rows ± 10 buffer rows are in the SVG at any time. Layout: `LANE_WIDTH=20px`, `ROW_HEIGHT=28px`.

**Lane assignment** (`electron/src/git/graph.builder.ts`): commits arrive newest-first from `git log --topo-order`. A `laneMap` pre-assigns lanes to not-yet-seen parents. First parent inherits the same lane; additional parents (merges) open a new lane. Edges are cubic beziers when lanes differ.

## Conflict Resolution Flow

**Three-step flow:**

1. `/conflicts` — file list, shows all conflicted files and their hunk count
2. `/conflicts/resolve/:i` — side-by-side Monaco view: `oursView` (red highlights) left, `theirsView` (green highlights) right, no conflict markers visible; user picks Accept Current / Accept Incoming / Accept Both / Edit Manually
3. `/conflicts/preview/:i/:option` — Monaco diff editor (before vs after) + optional "Run & Test" panel

**Pre-computation:** `conflict.reader.ts` builds all three resolution strings in memory when the file is loaded — no filesystem I/O. The worktree is only created on demand when the user clicks "Set Up Worktree" in the preview screen.

**Worktree lifecycle:** `git worktree add --detach /tmp/reflens/wt-{id}` → write resolved file → run commands → confirm writes to real repo and calls `git worktree remove --force`.

## Environment

`.env` at repo root is loaded by `dotenv` in `main.ts`. The path resolves three levels up from `dist-electron/electron/src/`.

- `NODE_ENV=development` — loads `http://localhost:4200` instead of `dist/index.html`
- `OPEN_DEV_TOOLS=false` — set to `true` to auto-open DevTools detached
