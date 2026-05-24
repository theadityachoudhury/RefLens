import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';

export function registerWindowHandlers(createWindow: () => BrowserWindow): void {
  ipcMain.handle('window:new', () => {
    createWindow();
  });
}
