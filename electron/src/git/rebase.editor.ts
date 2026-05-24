import fs from 'fs';
import path from 'path';
import os from 'os';
import { RebaseEntry } from '../../../shared/git.types';

/**
 * Creates a GIT_SEQUENCE_EDITOR script that overwrites the git rebase todo
 * file with our pre-built content, bypassing the interactive editor.
 * Returns the path to the shell script.
 *
 * Entries are validated before reaching here (see rebase.ipc.ts), but we
 * sanitize each field anyway so no untrusted data can emit an `exec` directive
 * or other git-rebase todo command via subject/hash content.
 */
export function createSequenceEditorScript(entries: RebaseEntry[]): string {
  const todoContent = entries
    .map((e) => {
      // Strip newlines from every field so no injected `exec` directives
      // can appear on their own line in the git sequencer todo file.
      const action  = e.action.replace(/[\r\n]/g, '');
      const hash    = e.hash.replace(/[\r\n]/g, '');
      const subject = e.subject.replace(/[\r\n]/g, '');
      return `${action} ${hash} ${subject}`;
    })
    .join('\n');

  const tempDir = path.join(os.tmpdir(), 'reflens');
  fs.mkdirSync(tempDir, { recursive: true });

  const todoPath = path.join(tempDir, `rebase-todo-${Date.now()}.txt`);
  fs.writeFileSync(todoPath, todoContent, 'utf-8');

  const scriptPath = path.join(tempDir, `rebase-editor-${Date.now()}.sh`);
  fs.writeFileSync(scriptPath, `#!/bin/sh\ncp "${todoPath}" "$1"\n`, { mode: 0o755 });

  return scriptPath;
}
