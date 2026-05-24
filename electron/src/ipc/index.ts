import { BrowserWindow } from 'electron';
import { registerRepositoryHandlers } from './repository.ipc';
import { registerGraphHandlers } from './graph.ipc';
import { registerConflictHandlers } from './conflicts.ipc';
import { registerWorktreeHandlers } from './worktree.ipc';
import { registerProcessHandlers } from './process.ipc';
import { registerRebaseHandlers } from './rebase.ipc';
import { registerCherryPickHandlers } from './cherrypick.ipc';
import { registerDiffHandlers } from './diff.ipc';

export function registerAllHandlers(win: BrowserWindow): void {
  registerRepositoryHandlers();
  registerGraphHandlers();
  registerConflictHandlers();
  registerWorktreeHandlers();
  registerProcessHandlers(win);
  registerRebaseHandlers();
  registerCherryPickHandlers();
  registerDiffHandlers();
}
