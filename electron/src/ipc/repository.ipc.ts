import { dialog, ipcMain } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { getGit } from '../git/git.service';
import type { RepoInfo } from '../../../shared/ipc-api.types';

interface StoreSchema {
  recentRepos: RepoInfo[];
}

const store = new Store<StoreSchema>({ defaults: { recentRepos: [] } });

export function registerRepositoryHandlers(): void {
  ipcMain.handle('repo:open', async (_, dirPath?: string) => {
    let repoPath = dirPath;

    if (!repoPath) {
      const result = await dialog.showOpenDialog({
        title: 'Open Repository',
        properties: ['openDirectory'],
        buttonLabel: 'Open Repository',
      });
      if (result.canceled || !result.filePaths[0]) throw new Error('No directory selected');
      repoPath = result.filePaths[0];
    }

    // Validate it's a git repo
    const git = getGit(repoPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) throw new Error(`${repoPath} is not a git repository`);

    const name = path.basename(repoPath);
    const repoInfo: RepoInfo = { path: repoPath, name };

    // Persist to recent repos
    const recent = store.get('recentRepos', []);
    const filtered = recent.filter((r) => r.path !== repoPath);
    store.set('recentRepos', [repoInfo, ...filtered].slice(0, 10));

    return repoInfo;
  });

  ipcMain.handle('repo:getRecent', () => {
    return store.get('recentRepos', []);
  });

  ipcMain.handle('repo:status', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    const [status, log] = await Promise.all([
      git.status(),
      git.log(['-1', '--format=%H']),
    ]);

    return {
      currentBranch: status.current ?? 'HEAD',
      detachedHead: !status.current,
      headHash: log.latest?.hash ?? '',
      staged: status.staged.map((f) => ({ path: f, status: 'M' as const })),
      unstaged: status.modified.map((f) => ({ path: f, status: 'M' as const })),
      untracked: status.not_added,
      conflicted: status.conflicted,
      isRebasing: false,
      isMerging: status.conflicted.length > 0,
      isCherryPicking: false,
    };
  });
}
