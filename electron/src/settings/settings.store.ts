import Store from 'electron-store';
import os from 'os';
import path from 'path';
import type { AppSettings } from '../../../shared/settings.types';
import { DEFAULT_SETTINGS } from '../../../shared/settings.types';

interface SettingsStoreSchema {
  settings: AppSettings;
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
        },
      },
    });
  }
  return _store;
}

export function readSettings(): AppSettings {
  return getSettingsStore().get('settings');
}
