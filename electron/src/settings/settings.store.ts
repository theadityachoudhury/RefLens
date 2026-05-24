import Store from 'electron-store';
import os from 'os';
import path from 'path';
import type { AppSettings, ShortcutMap } from '../../../shared/settings.types';
import { DEFAULT_SETTINGS } from '../../../shared/settings.types';

interface SettingsStoreSchema {
  settings: AppSettings;
}

/**
 * Returns platform-appropriate default keyboard shortcuts.
 * All use 'mod' so they map to ⌘ on macOS and Ctrl on Windows/Linux,
 * but the defaults can diverge per-OS here when conventions differ.
 */
export function platformDefaultShortcuts(): ShortcutMap {
  const isMac = process.platform === 'darwin';
  return {
    refresh:      'mod+r',
    // ⌘, is the universal macOS convention for Preferences/Settings.
    // Ctrl+, is the VS Code / modern Windows convention — same key, different label.
    openSettings: 'mod+,',
    // Escape is universal; Mac also supports ⌘[ for back in many apps
    // but Escape is the most consistent cross-platform choice.
    goBack:       isMac ? 'escape' : 'escape',
  };
}

let _store: Store<SettingsStoreSchema> | null = null;

export function getSettingsStore(): Store<SettingsStoreSchema> {
  if (!_store) {
    _store = new Store<SettingsStoreSchema>({
      name: 'settings',
      defaults: {
        settings: {
          ...DEFAULT_SETTINGS,
          worktreePath: path.join(os.tmpdir(), 'reflens'),
          keyboardShortcuts: platformDefaultShortcuts(),
        },
      },
    });
  }
  return _store;
}

export function readSettings(): AppSettings {
  return getSettingsStore().get('settings');
}
