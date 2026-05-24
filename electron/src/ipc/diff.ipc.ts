import { ipcMain } from 'electron';
import { getGit } from '../git/git.service';
import type { DiffFile, DiffHunk, DiffLine } from '../../../shared/git.types';

export function registerDiffHandlers(): void {
  ipcMain.handle('diff:file', async (_, repoPath: string, hash: string, filePath: string) => {
    const git = getGit(repoPath);
    const raw = await git.raw(['show', `${hash}:${filePath}`, '--', filePath].filter(Boolean));
    return parseDiff(raw, filePath);
  });
}

function parseDiff(raw: string, filePath: string): DiffFile {
  const lines = raw.split('\n');
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
        currentHunk = {
          header: line,
          oldStart: oldLine,
          oldCount: 0,
          newStart: newLine,
          newCount: 0,
          lines: [],
        };
        hunks.push(currentHunk);
      }
      continue;
    }

    if (!currentHunk) continue;

    const diffLine: DiffLine = { type: 'context', content: line.slice(1) };
    if (line.startsWith('+')) {
      diffLine.type = 'add';
      diffLine.newLineNumber = newLine++;
      currentHunk.newCount++;
    } else if (line.startsWith('-')) {
      diffLine.type = 'remove';
      diffLine.oldLineNumber = oldLine++;
      currentHunk.oldCount++;
    } else {
      diffLine.oldLineNumber = oldLine++;
      diffLine.newLineNumber = newLine++;
      currentHunk.oldCount++;
      currentHunk.newCount++;
    }
    currentHunk.lines.push(diffLine);
  }

  return { oldPath: filePath, newPath: filePath, isBinary: false, hunks };
}
