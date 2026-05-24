import type { BrowserWindow } from 'electron';
import { registerSettingsHandlers } from './settings.ipc';
import { registerRepositoryHandlers } from './repository.ipc';
import { registerGraphHandlers } from './graph.ipc';
import { registerConflictHandlers } from './conflicts.ipc';
import { registerWorktreeHandlers } from './worktree.ipc';
import { registerProcessHandlers } from './process.ipc';
import { registerRebaseHandlers } from './rebase.ipc';
import { registerCherryPickHandlers } from './cherrypick.ipc';
import { registerDiffHandlers } from './diff.ipc';
import { registerWindowHandlers } from './window.ipc';
import { registerEditorHandlers } from './editor.ipc';

// Called once at startup — ipcMain.handle channels are process-global.
// Per-window routing is done inside handlers via event.sender.
export function registerGlobalHandlers(createWindow: () => BrowserWindow): void {
  registerSettingsHandlers();
  registerRepositoryHandlers();
  registerGraphHandlers();
  registerConflictHandlers();
  registerWorktreeHandlers();
  registerProcessHandlers();
  registerRebaseHandlers();
  registerCherryPickHandlers();
  registerDiffHandlers();
  registerWindowHandlers(createWindow);
  registerEditorHandlers();
}
