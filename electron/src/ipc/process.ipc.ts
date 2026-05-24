import { BrowserWindow, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import type { ProcessOutput } from '../../../shared/git.types';

const runningProcesses = new Map<string, ChildProcess>();

export function registerProcessHandlers(win: BrowserWindow): void {
  ipcMain.handle('process:spawn', async (_, command: string, cwd: string, id: string) => {
    // Kill any existing process with this id
    runningProcesses.get(id)?.kill();
    runningProcesses.delete(id);

    const proc = spawn(command, [], { cwd, shell: true });
    runningProcesses.set(id, proc);

    const send = (data: ProcessOutput) => {
      if (!win.isDestroyed()) win.webContents.send(`process:output:${id}`, data);
    };

    proc.stdout.on('data', (d: Buffer) =>
      send({ stdout: d.toString(), stderr: '', exitCode: undefined }),
    );
    proc.stderr.on('data', (d: Buffer) =>
      send({ stdout: '', stderr: d.toString(), exitCode: undefined }),
    );
    proc.on('close', (code) => {
      send({ stdout: '', stderr: '', exitCode: code ?? -1 });
      runningProcesses.delete(id);
    });
  });

  ipcMain.handle('process:kill', async (_, id: string) => {
    runningProcesses.get(id)?.kill();
    runningProcesses.delete(id);
  });
}
