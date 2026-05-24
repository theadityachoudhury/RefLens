import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { getGit } from '../git/git.service';
import { readConflictFiles } from '../git/conflict.reader';
import { safeResolveWithin, isBoundedString } from './ipc-guards';

export function registerConflictHandlers(): void {
  ipcMain.handle('conflicts:list', async (_, repoPath: string) => {
    return readConflictFiles(repoPath);
  });

  ipcMain.handle('conflicts:write', async (_, repoPath: string, filePath: string, resolvedContent: string) => {
    const fullPath = safeResolveWithin(repoPath, filePath);
    if (!fullPath) throw new Error(`Invalid file path: ${filePath}`);
    if (typeof resolvedContent !== 'string') throw new Error('resolvedContent must be a string');

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, resolvedContent, 'utf-8');
  });

  ipcMain.handle('conflicts:stage', async (_, repoPath: string, filePath: string) => {
    const fullPath = safeResolveWithin(repoPath, filePath);
    if (!fullPath) throw new Error(`Invalid file path: ${filePath}`);

    const git = getGit(repoPath);
    await git.add(fullPath);
  });

  ipcMain.handle('conflicts:abortMerge', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['merge', '--abort']);
  });

  ipcMain.handle('conflicts:complete', async (_, repoPath: string, message: string) => {
    if (!isBoundedString(message, 10_000)) throw new Error('Invalid commit message');
    const git = getGit(repoPath);
    await git.commit(message, undefined, { '--no-edit': null });
  });
}
