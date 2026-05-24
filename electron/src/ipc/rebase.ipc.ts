import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import { getGit } from '../git/git.service';
import { createSequenceEditorScript } from '../git/rebase.editor';
import { readSettings } from '../settings/settings.store';
import { isGitRef, isGitHash, isRebaseAction, isBoundedString } from './ipc-guards';
import type { RebaseEntry } from '../../../shared/git.types';

function isValidEntry(e: unknown): e is RebaseEntry {
  if (!e || typeof e !== 'object') return false;
  const entry = e as Record<string, unknown>;
  return (
    isRebaseAction(entry['action']) &&
    isGitHash(entry['hash']) &&
    isBoundedString(entry['subject'], 500)
  );
}

export function registerRebaseHandlers(): void {
  ipcMain.handle('rebase:state', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    try {
      const log = await git.log({ maxCount: readSettings().rebaseDepth });
      return {
        entries: log.all.map((c) => ({
          action: 'pick' as const,
          hash: c.hash,
          subject: c.message,
        })),
        ontoRef: '',
        inProgress: false,
      };
    } catch {
      return { entries: [], ontoRef: '', inProgress: false };
    }
  });

  ipcMain.handle('rebase:start', async (_, repoPath: string, ontoRef: string, entries: unknown[]) => {
    // ontoRef must not start with '-' to block --exec=<shell-cmd> injection
    if (!isGitRef(ontoRef)) throw new Error(`Invalid rebase ref: ${ontoRef}`);

    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) {
      throw new Error('entries must be a non-empty array of at most 500 items');
    }
    const validated = entries.map((e, i) => {
      if (!isValidEntry(e)) throw new Error(`Invalid rebase entry at index ${i}`);
      return e;
    });

    const scriptPath = createSequenceEditorScript(validated);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn('git', ['rebase', '--interactive', ontoRef], {
        cwd: repoPath,
        env: {
          ...process.env,
          GIT_SEQUENCE_EDITOR: scriptPath,
          GIT_EDITOR: 'true',
        },
        shell: false,
      });

      let stderr = '';
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `Rebase failed with code ${code}`));
      });
    });
  });

  ipcMain.handle('rebase:continue', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['rebase', '--continue']);
  });

  ipcMain.handle('rebase:abort', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    await git.raw(['rebase', '--abort']);
  });
}
