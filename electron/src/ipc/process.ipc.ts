import { BrowserWindow, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { isAbsolutePath, isBoundedString } from './ipc-guards';
import type { ProcessOutput } from '../../../shared/git.types';

// Keyed by `${windowId}:${processId}` to isolate processes per window
const runningProcesses = new Map<string, ChildProcess>();

export function registerProcessHandlers(): void {
  ipcMain.handle('process:spawn', async (event, command: string, cwd: string, id: string) => {
    // cwd must be a valid absolute path — the user types the command themselves
    // (that's the Run & Test feature), but at minimum prevent cwd traversal.
    if (!isAbsolutePath(cwd)) throw new Error(`Invalid working directory: ${cwd}`);
    if (!isBoundedString(command, 4096)) throw new Error('command must be a non-empty string ≤ 4096 chars');

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = `${win.id}:${id}`;

    runningProcesses.get(key)?.kill();
    runningProcesses.delete(key);

    const proc = spawn(command, [], { cwd, shell: true });
    runningProcesses.set(key, proc);

    const send = (data: ProcessOutput) => {
      if (!event.sender.isDestroyed()) event.sender.send(`process:output:${id}`, data);
    };

    proc.stdout.on('data', (d: Buffer) =>
      send({ stdout: d.toString(), stderr: '', exitCode: undefined }),
    );
    proc.stderr.on('data', (d: Buffer) =>
      send({ stdout: '', stderr: d.toString(), exitCode: undefined }),
    );
    proc.on('close', (code) => {
      send({ stdout: '', stderr: '', exitCode: code ?? -1 });
      runningProcesses.delete(key);
    });
  });

  ipcMain.handle('process:kill', async (event, id: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = `${win.id}:${id}`;
    runningProcesses.get(key)?.kill();
    runningProcesses.delete(key);
  });
}
