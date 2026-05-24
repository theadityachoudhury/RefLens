import { ipcMain } from 'electron';
import { getGit } from '../git/git.service';

const EMPTY_COMMIT_MARKERS = [
  'nothing to commit',
  'is now empty',
  'allow-empty',
];

const CONFLICT_MARKERS = [
  'CONFLICT',
  'after resolving the conflicts',
  'fix conflicts',
];

function isEmptyCommitError(msg: string): boolean {
  return EMPTY_COMMIT_MARKERS.some((m) => msg.includes(m));
}

function isConflictError(msg: string): boolean {
  return CONFLICT_MARKERS.some((m) => msg.includes(m));
}

export function registerCherryPickHandlers(): void {
  ipcMain.handle('cherrypick:run', async (_, repoPath: string, hashes: string[]) => {
    const git = getGit(repoPath);

    for (const hash of hashes) {
      try {
        await git.raw(['cherry-pick', hash]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        if (isEmptyCommitError(msg)) {
          // Commit is already applied — skip it silently
          await git.raw(['cherry-pick', '--skip']);
          continue;
        }

        if (isConflictError(msg)) {
          // Surface conflict to the renderer — it will navigate to /conflicts
          throw Object.assign(new Error('CHERRY_PICK_CONFLICT'), { hash });
        }

        throw err;
      }
    }
  });

  ipcMain.handle('cherrypick:continue', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['cherry-pick', '--continue']);
  });

  ipcMain.handle('cherrypick:skip', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['cherry-pick', '--skip']);
  });

  ipcMain.handle('cherrypick:abort', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['cherry-pick', '--abort']);
  });
}
