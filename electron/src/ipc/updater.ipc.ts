import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import type { UpdateEvent } from '../../../shared/ipc-api.types';

function broadcast(event: UpdateEvent): void {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:event', event));
}

export function registerUpdaterHandlers(): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => broadcast({ type: 'checking' }));
  autoUpdater.on('update-available', (info) => broadcast({ type: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => broadcast({ type: 'not-available' }));
  autoUpdater.on('download-progress', (p) => broadcast({ type: 'downloading', percent: p.percent }));
  autoUpdater.on('update-downloaded', (info) => broadcast({ type: 'downloaded', version: info.version }));
  autoUpdater.on('error', (err) => broadcast({ type: 'error', message: err.message }));

  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());
}

export function checkForUpdatesOnStartup(): void {
  autoUpdater.checkForUpdates().catch(() => undefined);
}
