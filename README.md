# RefLens

A cross-platform desktop Git visualizer focused on the hardest parts of code integration — merge conflicts, interactive rebase, and cherry-pick workflows. Built with Electron + Angular.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-1.0.2-green)
![License](https://img.shields.io/github/license/theadityachoudhury/RefLens)

---

## What is RefLens?

RefLens is not a general-purpose Git GUI. It is a focused tool designed to make the most error-prone parts of Git integration *visual* and *safe*:

- **Commit DAG** — a high-performance canvas-rendered commit graph with lane coloring, zoom/pan, and branch badges
- **Conflict Resolution** — a 3-step guided flow with side-by-side Monaco editors, no raw conflict markers, and a "Run & Test" worktree sandbox
- **Interactive Rebase** — drag-and-drop commit reordering with pick/squash/fixup/drop/reword/edit actions
- **Cherry-pick Queue** — Ctrl+click commits on the graph to queue them, reorder, and apply as a batch
- **Back/Forward Navigation** — browser-style history arrows in the titlebar for navigating between views

---

## Screenshots

> Coming soon.

---

## Installation

Download the latest release for your platform from the [Releases](https://github.com/theadityachoudhury/RefLens/releases) page.

| Platform | Format |
|---|---|
| macOS (Apple Silicon) | `.dmg` / `.zip` (arm64) |
| macOS (Intel) | `.dmg` / `.zip` (x64) |
| Windows | NSIS installer (x64) |
| Linux | AppImage (x64) |

Auto-updates are delivered through GitHub Releases and install on next quit.

---

## Features

### Commit Graph
- Canvas-rendered DAG with D3 zoom (0.2× – 3×) and pan
- Virtualized rendering — only visible rows ± 10 buffer rows are drawn at any time
- 4 lane color palettes: GitHub, Dracula, Solarized, Monochrome
- Configurable row density (compact / normal / spacious) and commit dot size
- Inline branch, tag, and HEAD badges
- Commit detail panel: author, date, message body, changed files with status
- Branch checkout from the branch list panel

### Conflict Resolution (3-step flow)
1. **File list** — all conflicted files with hunk counts; Abort or Complete Merge
2. **Side-by-side viewer** — Monaco editors showing HEAD (left, red) vs. incoming (right, green); conflict markers stripped; 4 resolution modes: Accept Current / Accept Incoming / Accept Both / Edit Manually
3. **Preview & Run** — Monaco diff editor; optional "Run & Test" worktree sandbox to execute commands against the resolved file before committing

### Interactive Rebase
- Drag-and-drop commit reordering with CDK drag-drop
- All 6 actions: `pick`, `reword`, `edit`, `squash`, `fixup`, `drop`
- Configurable depth (10 / 20 / 50 / 100 commits)
- Non-interactive execution via `GIT_SEQUENCE_EDITOR` trick — no TTY required

### Cherry-pick
- Ctrl/Cmd+click (or Alt+click) commits on the graph to build a queue
- Drag to reorder before applying
- Conflict detection mid-sequence hands off to the conflict resolver

### Settings
- Theme: Dark / Light / System, with 5 accent colors
- UI font size (small / medium / large) — scales all `rem`-based sizes
- All Monaco editor options (font size, word wrap, line numbers, minimap, diff layout)
- Configurable keyboard shortcuts with live recording
- Detected editor integration (VS Code, Cursor, Windsurf, Zed, WebStorm, and more)
- Auto-update controls

### Updates
Automatic updates are delivered through GitHub Releases. A badge in the titlebar appears when an update is available; downloads and installs on next quit. New releases are published automatically on every merge to `main`.

---

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/theadityachoudhury/RefLens.git
cd RefLens
npm install
```

Create a `.env` file at the repo root:

```env
NODE_ENV=development
OPEN_DEV_TOOLS=false
```

### Run

```bash
npm run start          # Angular dev server + Electron (concurrent)
```

### Build

```bash
npm run build:ng          # Angular → dist/browser/
npm run build:electron    # Electron → dist-electron/
npm run build             # Both
```

### Package

```bash
npm run package:mac
npm run package:win
npm run package:linux
npm run package:all       # All three platforms
```

---

## Architecture

RefLens is split into two independent compile targets that communicate only through a typed IPC bridge:

```
shared/           ← TypeScript interfaces (no runtime deps)
electron/src/     ← Main process (Node.js, simple-git, CommonJS)
src/              ← Angular renderer (ES2022, standalone components)
```

See [docs/architecture.md](docs/architecture.md) for a complete breakdown with diagrams.

---

## Roadmap

See [docs/todo.md](docs/todo.md) for the current feature backlog and completion status.

---

## Contributing

1. Fork the repo and create a branch from `main`
2. Follow the component structure: every Angular component is three files (`*.ts`, `*.html`, `*.scss`) — no inline templates or styles
3. The IPC contract in `shared/ipc-api.types.ts` must stay in sync with preload, handler, and service when adding channels
4. `ipcRenderer.on` push-event callbacks fire outside Angular's NgZone — always wrap signal/state updates in `ngZone.run()` for `OnPush` components
5. There are currently no automated tests — manual testing is expected for each change

## Release Process

Every merge to `main` triggers `.github/workflows/release.yml`, which:
1. Bumps the patch version, commits `[skip ci]`, and tags the commit
2. Builds the app on macOS, Windows, and Linux in parallel
3. Creates a GitHub Release with `.dmg` (arm64 + x64), `.exe`, `.AppImage`, and auto-generated source archives

---

## License

[MIT](LICENSE)
