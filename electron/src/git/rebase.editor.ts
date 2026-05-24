import fs from 'fs';
import path from 'path';
import os from 'os';
import { RebaseEntry } from '../../../shared/git.types';

/**
 * Creates a GIT_SEQUENCE_EDITOR script that overwrites the git rebase todo
 * file with our pre-built content, bypassing the interactive editor.
 * Returns the path to the shell script.
 */
export function createSequenceEditorScript(entries: RebaseEntry[]): string {
  const todoContent = entries
    .map((e) => `${e.action} ${e.hash} ${e.subject}`)
    .join('\n');

  const tempDir = path.join(os.tmpdir(), 'reflens');
  fs.mkdirSync(tempDir, { recursive: true });

  const todoPath = path.join(tempDir, `rebase-todo-${Date.now()}.txt`);
  fs.writeFileSync(todoPath, todoContent, 'utf-8');

  const scriptPath = path.join(tempDir, `rebase-editor-${Date.now()}.sh`);
  fs.writeFileSync(scriptPath, `#!/bin/sh\ncp "${todoPath}" "$1"\n`, { mode: 0o755 });

  return scriptPath;
}
