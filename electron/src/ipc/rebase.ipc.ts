import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import { getGit } from '../git/git.service';
import { createSequenceEditorScript } from '../git/rebase.editor';
import type { RebaseEntry } from '../../../shared/git.types';

export function registerRebaseHandlers(): void {
  ipcMain.handle('rebase:state', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    try {
      const log = await git.log({ maxCount: 20 });
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

  ipcMain.handle('rebase:start', async (_, repoPath: string, ontoRef: string, entries: RebaseEntry[]) => {
    const scriptPath = createSequenceEditorScript(entries);

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
