# Architecture — RefLens

RefLens is an Electron + Angular desktop application. The two halves compile to separate targets and communicate exclusively through a typed IPC bridge. Neither side imports runtime code from the other — only the `shared/` folder is shared, and it contains only TypeScript interfaces and pure-logic classes with no runtime dependencies.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Electron Process                       │
│                                                             │
│   ┌─────────────┐        ┌──────────────────────────────┐  │
│   │  main.ts    │        │    IPC Handlers (12 modules)  │  │
│   │  BrowserWindow       │  repo · graph · diff          │  │
│   │  app lifecycle│      │  conflicts · worktree         │  │
│   │  menu setup │        │  process · rebase             │  │
│   └──────┬──────┘        │  cherrypick · settings        │  │
│          │               │  editor · updater · window    │  │
│          │               └──────────────┬───────────────┘  │
│          │                              │                    │
│          │               ┌─────────────▼───────────────┐   │
│          │               │   Git Layer                  │   │
│          │               │  git.service.ts (SimpleGit)  │   │
│          │               │  graph.builder.ts            │   │
│          │               │  conflict.reader.ts          │   │
│          │               │  watcher.ts (chokidar)       │   │
│          │               │  rebase.editor.ts            │   │
│          │               │  editor.detector.ts          │   │
│          │               └──────────────────────────────┘  │
│          │                                                    │
│   ┌──────▼──────┐                                            │
│   │ preload.ts  │  ← contextBridge (the only boundary)       │
│   └──────┬──────┘                                            │
└──────────┼──────────────────────────────────────────────────┘
           │  window.electronAPI  (contextIsolation: true)
┌──────────┼──────────────────────────────────────────────────┐
│          │             Angular Renderer                       │
│   ┌──────▼────────────────┐                                  │
│   │  ElectronApiService   │  ← wraps every method as Observable
│   └──────┬────────────────┘                                  │
│          │                                                    │
│   ┌──────▼────────────────────────────────────────────────┐ │
│   │  Core Services                                        │ │
│   │  RepositoryService · SettingsService                  │ │
│   │  ShortcutService · RefreshService · ConflictService   │ │
│   └──────┬────────────────────────────────────────────────┘ │
│          │                                                    │
│   ┌──────▼────────────────────────────────────────────────┐ │
│   │  Feature Components (lazy-loaded routes)              │ │
│   │  /         WelcomeComponent                           │ │
│   │  /graph    GraphComponent + CanvasRendererService      │ │
│   │  /conflicts  ConflictListComponent                    │ │
│   │  /conflicts/resolve/:i  ConflictViewerComponent       │ │
│   │  /conflicts/preview/:i/:opt  ResolutionPreviewComponent│ │
│   │  /rebase   RebaseComponent                            │ │
│   │  /cherry-pick  CherryPickComponent                    │ │
│   │  /settings  SettingsComponent (7 tabs)                │ │
│   └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                    shared/                                    │
│  ipc-api.types.ts   ← ElectronAPI interface (IPC contract)   │
│  git.types.ts       ← CommitNode, BranchInfo, ConflictFile…  │
│  settings.types.ts  ← AppSettings, DEFAULT_SETTINGS          │
│  commit-graph.ts    ← CommitGraph DAG (BFS/DFS)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Compile Targets

Two independent TypeScript compilation targets share the `shared/` folder via a `@shared/*` path alias:

| Target | Config | Module | Output |
|---|---|---|---|
| Angular renderer | `tsconfig.json` | ES2022, moduleResolution: bundler | `dist/browser/` |
| Electron main | `tsconfig.electron.json` | CommonJS, moduleResolution: node | `dist-electron/` |

The two outputs never import from each other at runtime. All communication goes through the IPC bridge.

---

## IPC Bridge

The IPC bridge is the single architectural boundary between the two halves. It is defined in three synchronized files:

```
shared/ipc-api.types.ts          ← interface ElectronAPI (source of truth)
        │
        ├── electron/src/preload.ts
        │   contextBridge.exposeInMainWorld('electronAPI', {
        │     methodName: (...args) => ipcRenderer.invoke(channel, ...args)
        │   })
        │
        ├── electron/src/ipc/*.ipc.ts
        │   ipcMain.handle(channel, async (event, ...args) => { ... })
        │
        └── src/app/core/services/electron-api.service.ts
            methodName(...args): Observable<T> {
              return from(window.electronAPI.methodName(...args))
            }
```

When adding a new IPC channel, all three files must be updated together.

### Channel Namespaces

| Namespace | Purpose |
|---|---|
| `repo:*` | Repository open, watch, status, recent repos |
| `graph:*` | Commits, branches, tags, checkout, commit detail |
| `diff:*` | Per-file diff for a commit |
| `conflicts:*` | List, write, stage, abort, complete |
| `worktree:*` | Create, apply file, remove (Run & Test) |
| `process:*` | Spawn and kill shell processes in worktrees |
| `rebase:*` | State, start, continue, abort |
| `cherrypick:*` | Run, continue, skip, abort |
| `window:*` | New window creation |
| `editor:*` | Detect editors, open in editor |
| `settings:*` | Get, set, reset |
| `system:*` | Platform, version, openExternal |
| `updater:*` | Check, download, install |

### Push Events (Main → Renderer)

These channels are not request-response — the main process emits them unprompted:

| Event | Trigger | Destination |
|---|---|---|
| `repo:statusChanged` | chokidar `.git` watcher fires | Specific window's WebContents |
| `process:output:{id}` | Spawned process writes stdout/stderr | Specific window's WebContents |
| `updater:event` | electron-updater state change | All windows (broadcast) |

**NgZone note:** `ipcRenderer.on` callbacks fire outside Angular's NgZone. Any component subscribing to a push-event observable must wrap state mutations in `ngZone.run()` to trigger change detection.

### IPC Security

All IPC handlers validate user-supplied inputs through `electron/src/ipc/ipc-guards.ts`:

| Guard | Validates |
|---|---|
| `isGitHash` | 40-char hex string |
| `isGitRef` | Safe ref format |
| `isGitBranchName` | No injection chars |
| `safeResolveWithin(base, input)` | Path traversal prevention |
| `isSafeId` | Alphanumeric + dash/underscore |
| `isAbsolutePath` | Must start with `/` or drive letter |
| `isBoundedString(s, max)` | Length limit |
| `isRebaseAction` | Allowlisted rebase verbs |

---

## Electron Main Process

### Window Lifecycle

```
app.whenReady()
  └── createWindow()
        ├── new BrowserWindow({ titleBarStyle: 'hiddenInset', ... })
        ├── loads http://localhost:4200 (dev) OR dist/browser/index.html (prod)
        ├── registers menu (macOS: minimal native; Win/Linux: null)
        ├── win.once('closed') → cleanup watchers + process maps
        └── checkForUpdatesOnStartup()  (prod only)
```

### IPC Handler Registration

`electron/src/ipc/index.ts` exports `registerGlobalHandlers(createWindow)`. It is called once at startup and chains all 12 register functions:

```
registerGlobalHandlers
  ├── registerRepositoryHandlers
  ├── registerGraphHandlers
  ├── registerDiffHandlers
  ├── registerConflictHandlers
  ├── registerWorktreeHandlers
  ├── registerProcessHandlers
  ├── registerRebaseHandlers
  ├── registerCherryPickHandlers
  ├── registerSettingsHandlers  (also registers system:* channels)
  ├── registerEditorHandlers
  ├── registerUpdaterHandlers
  └── registerWindowHandlers
```

IPC channels are process-global. Per-window routing is achieved inside handlers via `event.sender` (to reply to the originating window) or `BrowserWindow.fromWebContents(event.sender)` (to access the window object for push events).

### Git Layer

```
git.service.ts
  Map<repoPath, SimpleGit>    ← singleton cache; never construct SimpleGit directly

graph.builder.ts
  git log --topo-order --format="%H%x1F%P%x1F%an%x1F%ae%x1F%ai%x1F%s%x1F%b"
  ---REFLENS--- separator between records
  Lane assignment (one pass, newest-first):
    - laneMap pre-assigns lanes to not-yet-seen parents
    - first parent inherits same lane
    - additional parents open new lanes
    - edges: cubic bezier when lanes differ, straight when same

conflict.reader.ts
  Parses <<<<<<<  =======  >>>>>>> markers
  Builds oursView, theirsView
  Pre-computes all 3 resolution strings in memory (no I/O at resolution time)

rebase.editor.ts
  Writes pre-built todo file to temp path
  Creates shell script: #!/bin/sh\ncp "$TODO" "$1"\n
  Passes script as GIT_SEQUENCE_EDITOR to git rebase --interactive

watcher.ts (chokidar)
  Watches .git/ (ignores objects/ and logs/)
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }
  300ms debounce → fetch status → emit repo:statusChanged
  Keyed by windowId; new watcher for same window stops the previous one
```

---

## Angular Renderer

### Routing

```
/                     WelcomeComponent           (unguarded)
/graph                GraphComponent             (repoOpenGuard)
/conflicts            ConflictListComponent      (repoOpenGuard)
/conflicts/resolve/:fileIndex   ConflictViewerComponent
/conflicts/preview/:fileIndex/:option   ResolutionPreviewComponent
/rebase               RebaseComponent            (repoOpenGuard)
/cherry-pick          CherryPickComponent        (repoOpenGuard)
/settings             SettingsComponent          (repoOpenGuard)
```

All routes except `/` are lazy-loaded. `repoOpenGuard` checks `RepositoryService.activeRepo$` and redirects to `/` if no repo is open.

### Core Services

```
ElectronApiService
  Wraps window.electronAPI.* as Observable<T> via from()
  Push events via fromEventPattern (handles cleanup on unsubscribe)

RepositoryService
  activeRepo$: BehaviorSubject<string | null>
  status$: BehaviorSubject<RepoStatus | null>
  loading$: BehaviorSubject<boolean>

  startStatusPolling():
    merge(
      timer(0, refreshInterval$),   ← zone-patched, no ngZone.run needed
      onStatusChanged()             ← push event, needs ngZone.run()
    )
    → fetchStatus() → status$.next()

  tryRestoreLastRepo():
    gates on settings.ready$ before reading restoreLastRepo flag

SettingsService
  signal<AppSettings>()            ← initialized to DEFAULT_SETTINGS
  Fetches real settings via IPC on init
  ~15 computed selectors (rowHeight, monacoTheme, laneColorPalette, …)
  applyToDOM():
    body.theme-light toggle
    body.accent-* class
    body.font-* class + documentElement.style.fontSize
    monaco.editor.setTheme()
  ready$: ReplaySubject<void>      ← fires once after first IPC response

ShortcutService
  Global keydown capture listener
  Converts event → canonical combo string ('mod+r')
  Looks up in settings.snapshot.keyboardShortcuts
  Actions: RefreshService.trigger() | navigate('/settings') | goBack$.next()
  Suppressed when focus is on input/textarea/select

RefreshService
  Subject<void> with trigger()
  GraphComponent subscribes to reload graph + branches
  ShortcutService calls trigger() on refresh shortcut

ConflictService
  files = signal<ConflictFile[]>([])
  resolvedMap = signal<Record<string,string>>({})
  loading = signal(false)
  allResolved = computed(...)
  confirmResolution(): write → stage → update resolvedMap
  abort(): abortRebase or abortMerge based on status.isRebasing
```

### Canvas Commit Graph

```
GraphComponent
  ├── CanvasRendererService  (component-scoped, not root)
  │     All drawing: ngZone.runOutsideAngular()
  │     Click handlers: ngZone.run()
  │     D3 zoom: scaleExtent [0.2, 3]
  │     RAF-gated draw loop (dirty flag)
  │     Virtualized: visible rows ± 10 buffer
  │     Hit-test: squared-distance < 25 (5px) → click, else pan
  │     commitClick$, commitRightClick$ → into NgZone
  │
  └── CommitGraph (shared/commit-graph.ts)
        from(commits): builds adjacency map
        isAncestor(a, b): BFS
        getMergeBase(a, b): BFS LCA
        getReachableFrom(hash): DFS

Lane layout constants:
  LANE_WIDTH = 20px
  ROW_HEIGHT = 22px (compact) | 28px (normal) | 36px (spacious)
  COMMIT_RADIUS = 3–8px (configurable)

Color palettes (15 colors each, cycling with modulo):
  github · dracula · solarized · monochrome
```

### Conflict Resolution Flow

```
/conflicts  (ConflictListComponent)
  ConflictService.files (signal)
  → click file → /conflicts/resolve/:fileIndex

/conflicts/resolve/:fileIndex  (ConflictViewerComponent)
  conflict.reader pre-computed: oursView, theirsView, resolutions
  Monaco read-only editors (left: ours/red, right: theirs/green)
  deltaDecorations highlight hunks
  Accept Current | Accept Incoming | Accept Both → immediate navigate
  Edit Manually → navigate with writable editor
  → /conflicts/preview/:fileIndex/:option

/conflicts/preview/:fileIndex/:option  (ResolutionPreviewComponent)
  Monaco diff editor: original vs resolved
  Manual mode: full writable Monaco editor
  Run & Test panel:
    worktree:create  → git worktree add --detach /tmp/reflens/wt-{id}
    worktree:applyFile → write resolved content into worktree
    process:spawn  → run user command; stream output via process:output:{id}
    process:kill   → stop running process
    worktree:remove → cleanup
    conflicts:write + conflicts:stage → confirm to real repo
```

### Settings System

```
Settings flow:

  Electron main (settings.store.ts)
    electron-store → settings.json
    DEFAULT_SETTINGS overridden with platform defaults:
      worktreePath: os.tmpdir() + '/reflens'
      keyboardShortcuts: platformDefaultShortcuts()

  IPC channels: settings:get · settings:set · settings:reset
  Input sanitization: field-by-field allowlisting in settings.ipc.ts

  Angular (SettingsService)
    signal<AppSettings> → init from DEFAULT_SETTINGS
    First IPC response → update signal + emit ready$
    applyToDOM() on every change:
      CSS classes on <body>: theme-light, accent-*, font-*
      documentElement.style.fontSize (scales all rem-based sizes)
      monaco.editor.setTheme()

  Settings tabs → SettingsService.update(partial) → settings:set IPC
  Reset → settings:reset IPC → platformDefaultShortcuts()
```

---

## Data Flow Diagrams

### Repository Open Flow

```
User clicks "Open Repository"
  └── WelcomeComponent.openRepo()
        └── ElectronApiService.openRepository()
              └── ipcRenderer.invoke('repo:open')
                    └── repository.ipc.ts: showOpenDialog()
                          ├── validate: isGitRepo (check .git/)
                          ├── electron-store: save to recentRepos
                          └── return { path, name }
        └── RepositoryService.setActiveRepo(path)
              ├── startStatusPolling()
              │     ├── timer(0, interval) → repo:status IPC → status$.next()
              │     └── ipcRenderer.on('repo:statusChanged') → status$.next()
              └── ElectronApiService.watchRepo(path, windowId)
                    └── ipcRenderer.invoke('repo:watch')
                          └── watcher.ts: chokidar.watch('.git/')
                                → debounce 300ms
                                → fetch status
                                → win.webContents.send('repo:statusChanged')
  └── router.navigate(['/graph'])
```

### Status Update Flow

```
.git/ file changes  (e.g. after a commit, merge, or fetch)
  └── chokidar fires
        └── awaitWriteFinish (100ms stability, 50ms poll)
              └── 300ms debounce
                    └── git.service.getStatus(repoPath)
                          └── win.webContents.send('repo:statusChanged', status)
                                └── ipcRenderer.on callback (outside NgZone)
                                      └── ngZone.run(() => status$.next(status))
                                            └── Angular components update
```

### Conflict Resolution Data Flow

```
Repo enters conflict state (merge/cherry-pick)
  └── status$.next({ conflicted: [...], isMerging: true })
        └── GraphComponent detects → router.navigate(['/conflicts'])
              └── ConflictListComponent
                    └── conflicts:list IPC
                          └── conflict.reader.ts
                                ├── read raw file with markers
                                ├── parse hunks
                                ├── build oursView (HEAD side)
                                ├── build theirsView (incoming side)
                                └── pre-compute all 3 resolutions in memory
                    └── ConflictService.files.set([...])

User selects file → /conflicts/resolve/:i
  └── ConflictViewerComponent
        ├── Monaco left: oursView (read-only, red decorations)
        ├── Monaco right: theirsView (read-only, green decorations)
        └── User picks resolution option
              └── router.navigate(['/conflicts/preview', i, option])
                    └── ResolutionPreviewComponent
                          ├── Monaco diff: original vs resolved
                          └── [optional] Run & Test:
                                ├── worktree:create
                                ├── worktree:applyFile (write resolved content)
                                ├── process:spawn (user command)
                                │     └── process:output:{id} push events → UI
                                ├── [satisfied] conflicts:write + conflicts:stage
                                └── worktree:remove
```

### Graph Rendering Pipeline

```
/graph route activates
  └── GraphComponent.ngOnInit()
        ├── graph:commits IPC
        │     └── graph.builder.ts
        │           ├── git log --topo-order --format=...
        │           ├── parse records (x1F separator)
        │           └── lane assignment (one pass, newest-first):
        │                 laneMap[parentHash] = lane
        │                 firstParent → same lane
        │                 extraParents → new lane
        │                 build bezier edges
        │           └── return CommitNode[]
        │
        ├── graph:branches IPC → BranchInfo[]
        │
        └── CanvasRendererService.render(commits, branches)
              ngZone.runOutsideAngular(() => {
                D3 zoom setup
                RAF draw loop:
                  visibleRange = scrollTop / ROW_HEIGHT ± 10 buffer
                  for each visible commit:
                    drawLaneLines (bezier or straight)
                    drawCommitDot (circle, highlight if selected)
                    drawRefBadges (branch/tag/HEAD labels)
                    drawCommitMessage (truncated)
              })

User clicks commit (squared-distance < 25px)
  └── ngZone.run(() => commitClick$.next(commit))
        └── GraphComponent shows detail panel
              └── graph:commitDetail IPC → files changed, full message
```

---

## Multi-Window Architecture

RefLens supports multiple independent windows, each showing a different repository.

- `worktree.ipc.ts` and `process.ipc.ts` key their in-memory maps as `${win.id}:${id}` so windows never share worktree or process state
- The chokidar watcher in `watcher.ts` is keyed by `windowId`; a new `repo:watch` call for the same window replaces the previous watcher
- `win.once('closed')` fires `stopWatch(win.id)` and kills any running processes for that window
- `updater:event` is broadcast to all windows via `BrowserWindow.getAllWindows().forEach(...)`
- All other push events target only `win.webContents` of the originating window

---

## File Structure Reference

```
RefLens/
├── shared/
│   ├── ipc-api.types.ts        IPC contract (ElectronAPI interface)
│   ├── git.types.ts            CommitNode, BranchInfo, RepoStatus, ConflictFile, …
│   ├── settings.types.ts       AppSettings, ShortcutMap, DEFAULT_SETTINGS
│   └── commit-graph.ts         CommitGraph DAG (from, isAncestor, getMergeBase, getReachableFrom)
│
├── electron/src/
│   ├── main.ts                 BrowserWindow, app lifecycle, menu, .env
│   ├── preload.ts              contextBridge: every method → ipcRenderer.invoke
│   ├── ipc/
│   │   ├── index.ts            registerGlobalHandlers (chains all 12)
│   │   ├── ipc-guards.ts       Input validation (isGitHash, safeResolveWithin, …)
│   │   ├── repository.ipc.ts
│   │   ├── graph.ipc.ts
│   │   ├── diff.ipc.ts
│   │   ├── conflicts.ipc.ts
│   │   ├── worktree.ipc.ts
│   │   ├── process.ipc.ts
│   │   ├── rebase.ipc.ts
│   │   ├── cherrypick.ipc.ts
│   │   ├── settings.ipc.ts     (+ system:* channels)
│   │   ├── editor.ipc.ts
│   │   ├── updater.ipc.ts
│   │   └── window.ipc.ts
│   ├── git/
│   │   ├── git.service.ts      SimpleGit singleton cache
│   │   ├── graph.builder.ts    git log + lane assignment
│   │   ├── conflict.reader.ts  Conflict marker parser + pre-computed resolutions
│   │   ├── rebase.editor.ts    GIT_SEQUENCE_EDITOR trick
│   │   └── watcher.ts          chokidar .git/ watcher
│   ├── editors/
│   │   └── editor.detector.ts  10 editors, icon extraction, cross-platform open
│   └── settings/
│       └── settings.store.ts   electron-store wrapper + readSettings()
│
└── src/app/
    ├── app.component.ts        Root shell, titlebar, shortcut bootstrap
    ├── app.routes.ts           Lazy-loaded route table
    ├── core/
    │   ├── guards/
    │   │   └── repo-open.guard.ts
    │   └── services/
    │       ├── electron-api.service.ts   IPC façade (Promise → Observable)
    │       ├── repository.service.ts     Repo state + polling
    │       ├── settings.service.ts       Settings signal + applyToDOM
    │       ├── shortcut.service.ts       Global keydown handler
    │       ├── refresh.service.ts        Broadcast bus (trigger / refresh$)
    │       └── conflict.service.ts       Conflict state (signals)
    ├── features/
    │   ├── welcome/
    │   ├── graph/
    │   │   ├── graph.component.{ts,html,scss}
    │   │   └── canvas-renderer.service.ts
    │   ├── conflicts/
    │   │   ├── conflict-list/
    │   │   ├── conflict-viewer/
    │   │   └── resolution-preview/
    │   ├── rebase/
    │   ├── cherry-pick/
    │   └── settings/
    │       ├── tabs/
    │       │   ├── appearance/
    │       │   ├── graph/
    │       │   ├── editor/
    │       │   ├── git/
    │       │   ├── application/
    │       │   ├── keyboard/
    │       │   └── about/
    │       └── settings.component.{ts,html,scss}
    └── shared/
        └── components/
            └── titlebar/
                ├── editor-picker/
                ├── refresh-button/
                ├── new-window-button/
                ├── settings-button/
                ├── update-button/
                └── app-menu/
```
