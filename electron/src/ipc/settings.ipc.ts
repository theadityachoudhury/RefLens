import { ipcMain } from 'electron';
import { getSettingsStore } from '../settings/settings.store';
import { DEFAULT_SETTINGS } from '../../../shared/settings.types';
import type { AppSettings } from '../../../shared/settings.types';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    const stored = getSettingsStore().get('settings');
    // Deep-merge with DEFAULT_SETTINGS so new fields added in later versions
    // are present even for users with an older settings file on disk.
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      keyboardShortcuts: { ...DEFAULT_SETTINGS.keyboardShortcuts, ...stored.keyboardShortcuts },
    };
  });

  ipcMain.handle('settings:set', (_, patch: Partial<AppSettings>) => {
    const store = getSettingsStore();
    const current = store.get('settings');
    const updated = { ...current, ...patch };
    store.set('settings', updated);
    return updated;
  });

  ipcMain.handle('settings:reset', () => {
    const store = getSettingsStore();
    store.set('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  });
}
