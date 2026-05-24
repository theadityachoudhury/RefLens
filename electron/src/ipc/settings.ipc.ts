import { ipcMain } from 'electron';
import { getSettingsStore, platformDefaultShortcuts } from '../settings/settings.store';
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
    const reset: AppSettings = {
      ...DEFAULT_SETTINGS,
      keyboardShortcuts: platformDefaultShortcuts(),
    };
    store.set('settings', reset);
    return reset;
  });

  ipcMain.handle('system:platform', () => process.platform);
}
