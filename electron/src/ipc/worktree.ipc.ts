import { BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getGit } from '../git/git.service';
import { readSettings } from '../settings/settings.store';
import type { WorktreeInfo } from '../../../shared/git.types';

// Keyed by `${windowId}:${worktreeId}` to isolate worktrees per window
const activeWorktrees = new Map<string, WorktreeInfo>();

function winKey(event: Electron.IpcMainInvokeEvent, id: string): string {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? `${win.id}:${id}` : id;
}

export function registerWorktreeHandlers(): void {
  ipcMain.handle('worktree:create', async (event, repoPath: string, id: string) => {
    const key = winKey(event, id);
    const base = readSettings().worktreePath || path.join(os.tmpdir(), 'reflens');
    const worktreePath = path.join(base, `wt-${id}`);
    fs.mkdirSync(path.dirname(worktreePath), { recursive: true });

    const git = getGit(repoPath);
    const branchName = `reflens-preview-${id}`;
    await git.raw(['worktree', 'add', '--detach', worktreePath]);

    const info: WorktreeInfo = { id, path: worktreePath, branch: branchName, repoPath };
    activeWorktrees.set(key, info);
    return info;
  });

  ipcMain.handle('worktree:applyFile', async (event, id: string, filePath: string, content: string) => {
    const info = activeWorktrees.get(winKey(event, id));
    if (!info) throw new Error(`Worktree ${id} not found`);
    const fullPath = path.join(info.path, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  });

  ipcMain.handle('worktree:remove', async (event, id: string) => {
    const key = winKey(event, id);
    const info = activeWorktrees.get(key);
    if (!info) return;
    try {
      const git = getGit(info.repoPath);
      await git.raw(['worktree', 'remove', '--force', info.path]);
    } catch {
      fs.rmSync(info.path, { recursive: true, force: true });
    }
    activeWorktrees.delete(key);
  });
}
