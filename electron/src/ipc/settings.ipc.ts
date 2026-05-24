import { ipcMain } from 'electron';
import path from 'path';
import { getSettingsStore, platformDefaultShortcuts } from '../settings/settings.store';
import { DEFAULT_SETTINGS } from '../../../shared/settings.types';
import type { AppSettings } from '../../../shared/settings.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBool(v: unknown): v is boolean   { return typeof v === 'boolean'; }
function isNum(v: unknown): v is number     { return typeof v === 'number' && isFinite(v); }
function isStr(v: unknown): v is string     { return typeof v === 'string'; }

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}

function oneOf<T extends string>(v: unknown, opts: readonly T[]): v is T {
  return isStr(v) && (opts as readonly string[]).includes(v);
}

function allowlisted(v: number, opts: readonly number[]): boolean {
  return opts.includes(v);
}

// ---------------------------------------------------------------------------
// Patch sanitiser — validates every field, drops unknowns and invalid values.
// Unknown keys are stripped so the renderer can never inject arbitrary data
// into the store. Invalid values are omitted (current stored value preserved).
// ---------------------------------------------------------------------------

function sanitizePatch(patch: unknown): Partial<AppSettings> {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return {};

  const p = patch as Record<string, unknown>;
  const out: Partial<AppSettings> = {};

  // --- Appearance ---
  if ('theme' in p && oneOf(p['theme'], ['dark', 'light', 'system'] as const))
    out.theme = p['theme'];

  if ('uiFontSize' in p && oneOf(p['uiFontSize'], ['small', 'medium', 'large'] as const))
    out.uiFontSize = p['uiFontSize'];

  if ('accentColor' in p && oneOf(p['accentColor'], ['blue', 'purple', 'green', 'teal', 'pink'] as const))
    out.accentColor = p['accentColor'];

  // --- Graph ---
  if ('graphMaxCommits' in p && isNum(p['graphMaxCommits']))
    out.graphMaxCommits = clamp(p['graphMaxCommits'], 100, 2000);

  if ('graphShowAllBranches' in p && isBool(p['graphShowAllBranches']))
    out.graphShowAllBranches = p['graphShowAllBranches'];

  if ('graphDensity' in p && oneOf(p['graphDensity'], ['compact', 'normal', 'spacious'] as const))
    out.graphDensity = p['graphDensity'];

  if ('graphCommitDotSize' in p && isNum(p['graphCommitDotSize']))
    out.graphCommitDotSize = clamp(p['graphCommitDotSize'], 3, 8);

  if ('graphLaneColorPalette' in p && oneOf(p['graphLaneColorPalette'], ['github', 'dracula', 'solarized', 'monochrome'] as const))
    out.graphLaneColorPalette = p['graphLaneColorPalette'];

  // --- Monaco editor ---
  if ('editorFontSize' in p && isNum(p['editorFontSize']))
    out.editorFontSize = clamp(p['editorFontSize'], 10, 18);

  if ('editorWordWrap' in p && isBool(p['editorWordWrap']))
    out.editorWordWrap = p['editorWordWrap'];

  if ('editorLineNumbers' in p && isBool(p['editorLineNumbers']))
    out.editorLineNumbers = p['editorLineNumbers'];

  if ('editorMinimap' in p && isBool(p['editorMinimap']))
    out.editorMinimap = p['editorMinimap'];

  if ('editorDiffLayout' in p && oneOf(p['editorDiffLayout'], ['side-by-side', 'inline'] as const))
    out.editorDiffLayout = p['editorDiffLayout'];

  // --- Git ---
  const REFRESH_OPTS = [0, 1000, 3000, 5000, 10000] as const;
  if ('statusRefreshInterval' in p && isNum(p['statusRefreshInterval']) && allowlisted(p['statusRefreshInterval'], REFRESH_OPTS))
    out.statusRefreshInterval = p['statusRefreshInterval'] as typeof REFRESH_OPTS[number];

  const RECENT_OPTS = [5, 10, 20, 50] as const;
  if ('recentReposLimit' in p && isNum(p['recentReposLimit']) && allowlisted(p['recentReposLimit'], RECENT_OPTS))
    out.recentReposLimit = p['recentReposLimit'] as typeof RECENT_OPTS[number];

  const REBASE_OPTS = [10, 20, 50, 100] as const;
  if ('rebaseDepth' in p && isNum(p['rebaseDepth']) && allowlisted(p['rebaseDepth'], REBASE_OPTS))
    out.rebaseDepth = p['rebaseDepth'] as typeof REBASE_OPTS[number];

  // --- Application ---
  if ('restoreLastRepo' in p && isBool(p['restoreLastRepo']))
    out.restoreLastRepo = p['restoreLastRepo'];

  if ('openDevTools' in p && isBool(p['openDevTools']))
    out.openDevTools = p['openDevTools'];

  if ('autoStageAfterResolve' in p && isBool(p['autoStageAfterResolve']))
    out.autoStageAfterResolve = p['autoStageAfterResolve'];

  if ('worktreePath' in p && isStr(p['worktreePath'])) {
    const wp = p['worktreePath'].trim();
    if (wp === '' || (path.isAbsolute(wp) && !wp.includes('\0')))
      out.worktreePath = wp;
  }

  // --- Keyboard shortcuts ---
  if ('keyboardShortcuts' in p && p['keyboardShortcuts'] && typeof p['keyboardShortcuts'] === 'object') {
    const sc = p['keyboardShortcuts'] as Record<string, unknown>;
    const isValidCombo = (v: unknown): v is string =>
      typeof v === 'string' && v.length > 0 && v.length < 50 && /^[a-z0-9+,.\-]+$/.test(v);

    const validSc: Record<string, string> = {};
    for (const key of ['refresh', 'openSettings', 'goBack'] as const) {
      if (key in sc && isValidCombo(sc[key])) validSc[key] = sc[key] as string;
    }
    if (Object.keys(validSc).length > 0) {
      out.keyboardShortcuts = validSc as unknown as AppSettings['keyboardShortcuts'];
    }
  }

  if ('cherryPickModifier' in p && oneOf(p['cherryPickModifier'], ['ctrlOrMeta', 'alt'] as const))
    out.cherryPickModifier = p['cherryPickModifier'];

  return out;
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    const stored = getSettingsStore().get('settings');
    // Forward-compatibility: spread DEFAULT_SETTINGS first so any field added
    // in a newer version appears with its default for users with older data.
    // keyboardShortcuts is a nested object so it gets its own spread.
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      keyboardShortcuts: { ...DEFAULT_SETTINGS.keyboardShortcuts, ...stored.keyboardShortcuts },
    };
  });

  ipcMain.handle('settings:set', (_, rawPatch: unknown) => {
    const store = getSettingsStore();
    const current = store.get('settings');
    const patch = sanitizePatch(rawPatch);
    const updated = { ...current, ...patch };
    store.set('settings', updated);
    return updated;
  });

  ipcMain.handle('settings:reset', () => {
    const store = getSettingsStore();
    const reset: AppSettings = {
      ...DEFAULT_SETTINGS,
      keyboardShortcuts: platformDefaultShortcuts(),
    };
    store.set('settings', reset);
    return reset;
  });

  ipcMain.handle('system:platform', () => process.platform);
}
