import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getGit } from '../git/git.service';
import type { WorktreeInfo } from '../../../shared/git.types';

const activeWorktrees = new Map<string, WorktreeInfo>();

export function registerWorktreeHandlers(): void {
  ipcMain.handle('worktree:create', async (_, repoPath: string, id: string) => {
    const worktreePath = path.join(os.tmpdir(), 'reflens', `wt-${id}`);
    fs.mkdirSync(path.dirname(worktreePath), { recursive: true });

    const git = getGit(repoPath);

    // Get current HEAD branch name
    const status = await git.status();
    const branchName = `reflens-preview-${id}`;

    // Create worktree from current HEAD (detached — no new branch needed for preview)
    await git.raw(['worktree', 'add', '--detach', worktreePath]);

    const info: WorktreeInfo = { id, path: worktreePath, branch: branchName, repoPath };
    activeWorktrees.set(id, info);

    return info;
  });

  ipcMain.handle('worktree:applyFile', async (_, id: string, filePath: string, content: string) => {
    const info = activeWorktrees.get(id);
    if (!info) throw new Error(`Worktree ${id} not found`);
    const fullPath = path.join(info.path, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  });

  ipcMain.handle('worktree:remove', async (_, id: string) => {
    const info = activeWorktrees.get(id);
    if (!info) return;
    try {
      const git = getGit(info.repoPath);
      await git.raw(['worktree', 'remove', '--force', info.path]);
    } catch {
      // Best-effort removal
      fs.rmSync(info.path, { recursive: true, force: true });
    }
    activeWorktrees.delete(id);
  });
}
