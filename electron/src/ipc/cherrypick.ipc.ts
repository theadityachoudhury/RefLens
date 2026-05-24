import { ipcMain } from 'electron';
import { getGit } from '../git/git.service';
import { isGitHash } from './ipc-guards';

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
  ipcMain.handle('cherrypick:run', async (_, repoPath: string, hashes: unknown[]) => {
    if (!Array.isArray(hashes) || hashes.length === 0 || hashes.length > 100) {
      throw new Error('hashes must be a non-empty array of at most 100 items');
    }
    // Validate every element before starting — fail fast rather than mid-way
    for (const h of hashes) {
      if (!isGitHash(h)) throw new Error(`Invalid commit hash: ${h}`);
    }

    const git = getGit(repoPath);

    for (const hash of hashes as string[]) {
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
