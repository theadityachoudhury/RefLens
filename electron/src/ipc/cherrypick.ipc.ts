import { ipcMain } from 'electron';
import { getGit } from '../git/git.service';

export function registerCherryPickHandlers(): void {
  ipcMain.handle('cherrypick:run', async (_, repoPath: string, hashes: string[]) => {
    const git = getGit(repoPath);
    for (const hash of hashes) {
      await git.raw(['cherry-pick', hash]);
    }
  });

  ipcMain.handle('cherrypick:abort', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['cherry-pick', '--abort']);
  });
}
