import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { getGit } from '../git/git.service';
import { readConflictFiles } from '../git/conflict.reader';

export function registerConflictHandlers(): void {
  ipcMain.handle('conflicts:list', async (_, repoPath: string) => {
    return readConflictFiles(repoPath);
  });

  ipcMain.handle('conflicts:write', async (_, repoPath: string, filePath: string, resolvedContent: string) => {
    const fullPath = path.join(repoPath, filePath);
    fs.writeFileSync(fullPath, resolvedContent, 'utf-8');
  });

  ipcMain.handle('conflicts:stage', async (_, repoPath: string, filePath: string) => {
    const git = getGit(repoPath);
    await git.add(filePath);
  });

  ipcMain.handle('conflicts:abortMerge', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['merge', '--abort']);
  });

  ipcMain.handle('conflicts:complete', async (_, repoPath: string, message: string) => {
    const git = getGit(repoPath);
    await git.commit(message, undefined, { '--no-edit': null });
  });
}
