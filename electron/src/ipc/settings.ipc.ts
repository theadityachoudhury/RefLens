import { ipcMain } from 'electron';
import { getSettingsStore } from '../settings/settings.store';
import { DEFAULT_SETTINGS } from '../../../shared/settings.types';
import type { AppSettings } from '../../../shared/settings.types';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    return getSettingsStore().get('settings');
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
