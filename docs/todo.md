# Feature Tracker — RefLens

Status key: ✅ Done · 🚧 In Progress · 📋 Planned · 💡 Idea

---

## Core Features

### Commit Graph
| Feature | Status | Notes |
|---|---|---|
| Canvas-rendered DAG with lanes | ✅ Done | D3 zoom, cubic bezier edges |
| Virtualized row rendering | ✅ Done | Visible rows ± 10 buffer |
| D3 zoom + pan (0.2× – 3×) | ✅ Done | Squared-distance click/pan threshold |
| 4 lane color palettes | ✅ Done | GitHub, Dracula, Solarized, Monochrome |
| Configurable row density | ✅ Done | compact / normal / spacious |
| Configurable commit dot size | ✅ Done | 3–8 px |
| Branch / tag / HEAD badges | ✅ Done | Inline on graph |
| Commit detail panel | ✅ Done | Author, date, message, file list |
| Branch list + checkout | ✅ Done | Click branch name to checkout |
| Show all branches (`--all`) toggle | ✅ Done | Setting: `graphShowAllBranches` |
| Configurable max commits | ✅ Done | 100–2000, setting: `graphMaxCommits` |
| Right-click context menu on commit | 📋 Planned | Branch from here, reset, revert |
| Tag creation from graph | 📋 Planned | Right-click → create tag |
| Drag-to-reorder branches | 💡 Idea | Reorder branch list |
| Stash visualization | 💡 Idea | Show stashes as dangling commits |

### Conflict Resolution
| Feature | Status | Notes |
|---|---|---|
| Conflicted file list with hunk counts | ✅ Done | |
| Abort merge / abort rebase | ✅ Done | Detects `isMerging` vs `isRebasing` |
| Complete merge with auto message | ✅ Done | |
| Side-by-side Monaco viewer | ✅ Done | HEAD left (red), incoming right (green) |
| Conflict markers stripped from view | ✅ Done | Clean editors, hunks highlighted |
| Auto-detect language from extension | ✅ Done | 14 language mappings |
| Accept Current / Incoming / Both | ✅ Done | Pre-computed in memory |
| Edit Manually mode | ✅ Done | Writable Monaco editor |
| Monaco diff preview | ✅ Done | Before vs after the resolution |
| Run & Test worktree sandbox | ✅ Done | `git worktree add --detach`, real-time process output |
| Auto-stage after resolve | ✅ Done | Setting: `autoStageAfterResolve` |
| Rebase conflict detection | 🚧 In Progress | `isRebasing` always returns `false` currently |
| Conflict hunk risk scoring | 💡 Idea | Flag overlapping edits vs. pure additions |
| Blame inline in conflict viewer | 💡 Idea | Who made each conflicting change |
| AI-assisted resolution suggestions | 💡 Idea | For common conflict patterns |

### Interactive Rebase
| Feature | Status | Notes |
|---|---|---|
| Load recent N commits | ✅ Done | Configurable depth: 10/20/50/100 |
| Drag-and-drop reordering (CDK) | ✅ Done | |
| All 6 actions (pick/reword/edit/squash/fixup/drop) | ✅ Done | |
| Custom `--onto` ref | ✅ Done | `ontoRef` input field |
| GIT_SEQUENCE_EDITOR non-interactive execution | ✅ Done | No TTY required |
| Rebase continue / abort | ✅ Done | |
| Error display inline | ✅ Done | |
| Rebase conflict handoff to resolver | 📋 Planned | After `rebase --continue` hits a conflict |
| Rebase commit message preview | 📋 Planned | Show full message on hover |

### Cherry-pick
| Feature | Status | Notes |
|---|---|---|
| Ctrl/Cmd+click on graph to queue | ✅ Done | Configurable modifier key |
| Alt+click alternative modifier | ✅ Done | Setting: `cherryPickModifier` |
| Drag-to-reorder queue | ✅ Done | CDK drag-drop |
| Per-item remove from queue | ✅ Done | |
| Sequential cherry-pick execution | ✅ Done | |
| Skip empty commits | ✅ Done | Silently skips `CHERRY_PICK_EMPTY` |
| Conflict detection → handoff | ✅ Done | Navigates to `/conflicts` |
| Cherry-pick continue / abort / skip | ✅ Done | IPC channels registered |

---

## Settings

### Appearance
| Setting | Status |
|---|---|
| Theme: Dark / Light / System | ✅ Done |
| 5 accent colors (blue/purple/green/teal/pink) | ✅ Done |
| UI font size (small/medium/large) | ✅ Done |

### Graph
| Setting | Status |
|---|---|
| Max commits (100–2000) | ✅ Done |
| Show all branches toggle | ✅ Done |
| Row density (compact/normal/spacious) | ✅ Done |
| Commit dot size (3–8 px) | ✅ Done |
| Lane color palette (4 options) | ✅ Done |

### Editor (Monaco)
| Setting | Status |
|---|---|
| Font size (10–18) | ✅ Done |
| Word wrap | ✅ Done |
| Line numbers | ✅ Done |
| Minimap | ✅ Done |
| Diff layout (side-by-side / inline) | ✅ Done |

### Git
| Setting | Status |
|---|---|
| Status refresh interval (0/1s/3s/5s/10s) | ✅ Done |
| Recent repos limit (5/10/20/50) | ✅ Done |
| Rebase depth (10/20/50/100) | ✅ Done |

### Application
| Setting | Status |
|---|---|
| Restore last repo on launch | ✅ Done |
| Auto-open DevTools | ✅ Done |
| Worktree base path | ✅ Done |
| Auto-stage after resolve | ✅ Done |

### Keyboard
| Setting | Status |
|---|---|
| Configurable shortcut: Refresh | ✅ Done |
| Configurable shortcut: Open Settings | ✅ Done |
| Configurable shortcut: Go Back | ✅ Done |
| Cherry-pick modifier key | ✅ Done |
| Live shortcut recording in settings tab | ✅ Done |

---

## Navigation & Shell

| Feature | Status | Notes |
|---|---|---|
| Back/forward navigation arrows in titlebar | ✅ Done | Manual history stack via `NavigationEnd` events |
| Full-page error route `/error` | ✅ Done | Router state carries title + message; back button dismisses |
| macOS traffic-light clearance in titlebar | ✅ Done | `padding-left: 78px` on `.titlebar--mac .titlebar__left` |

---

## Infrastructure

| Feature | Status | Notes |
|---|---|---|
| IPC security guards (injection, path traversal) | ✅ Done | `ipc-guards.ts` |
| `contextIsolation: true`, `nodeIntegration: false` | ✅ Done | |
| GitHub auto-updater | ✅ Done | `electron-updater`, manual download |
| NgZone fix for OnPush + push events | ✅ Done | `UpdateButtonComponent`, `SettingsAboutTabComponent`, `RepositoryService` |
| Multi-window support | ✅ Done | Per-window state keyed by `windowId` |
| macOS native menu | ✅ Done | App + File (New Window) + Edit |
| Windows/Linux custom titlebar | ✅ Done | Angular-rendered |
| `.git` folder watcher (chokidar) | ✅ Done | 300ms debounce |
| Editor detection (10 editors) | ✅ Done | |
| CI/CD auto-release on every merge to main | ✅ Done | `release.yml`: version-bump → build matrix → GitHub Release |
| macOS DMG + ZIP (arm64 + x64) | ✅ Done | Both Apple Silicon and Intel |
| Windows NSIS installer | ✅ Done | x64 |
| Linux AppImage | ✅ Done | x64 |
| Bundled editor icons (per-editor SVG/PNG) | 📋 Planned | Currently extracted from `.icns` via `sips` |
| Custom editor path configuration | 📋 Planned | User-supplied editor + CLI args |
| Automated test suite | 📋 Planned | No tests currently exist |

---

## Known Bugs

| Bug | Status | Notes |
|---|---|---|
| `isRebasing` always returns `false` | 🚧 In Progress | `repo:status` doesn't check `rebase-merge/` directory |
| `isCherryPicking` not set from status | 🚧 In Progress | Not checked in `watcher.ts` or `repository.ipc.ts` |

---

## Future Ideas

These are longer-horizon ideas not yet scoped into specific tasks:

- **Graph-based branch management** — create, rename, delete, push branches directly from the DAG
- **PR / issue context in conflicts** — surface the PR that introduced each conflicting change
- **Stash management** — show stashes visually and pop/apply/drop from the graph
- **Conflict intelligence** — hunk-level risk scoring based on overlap type
- **AI-assisted resolutions** — suggest resolutions for common patterns (import order, version bumps)
- **Blame integration** — `git blame` inline in the conflict viewer per highlighted hunk
- **Submodule awareness** — detect and visualize submodule state changes
- **Worktree manager** — UI for creating, switching, and removing persistent worktrees
