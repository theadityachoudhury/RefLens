import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { spawn } from 'child_process';
import type { EditorInfo } from '../../../shared/ipc-api.types';

interface DetectedEditor {
  id: string;
  name: string;
  appPath: string;
}

interface EditorDef {
  id: string;
  name: string;
  mac?: string[];
  win?: string[];
  linux?: string[];
}

const home = os.homedir();
const localAppData = process.env['LOCALAPPDATA'] ?? '';
const programFiles = process.env['PROGRAMFILES'] ?? 'C:\\Program Files';

const EDITOR_DEFS: EditorDef[] = [
  {
    id: 'vscode',
    name: 'VS Code',
    mac: [
      '/Applications/Visual Studio Code.app',
      path.join(home, 'Applications/Visual Studio Code.app'),
    ],
    win: [path.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe')],
    linux: ['/usr/bin/code', '/snap/bin/code', '/usr/local/bin/code'],
  },
  {
    id: 'vscode-insiders',
    name: 'VS Code Insiders',
    mac: [
      '/Applications/Visual Studio Code - Insiders.app',
      path.join(home, 'Applications/Visual Studio Code - Insiders.app'),
    ],
    win: [path.join(localAppData, 'Programs', 'Microsoft VS Code Insiders', 'Code - Insiders.exe')],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    mac: [
      '/Applications/Cursor.app',
      path.join(home, 'Applications/Cursor.app'),
    ],
    win: [path.join(localAppData, 'Programs', 'cursor', 'Cursor.exe')],
    linux: ['/usr/bin/cursor', path.join(home, '.local/bin/cursor')],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    mac: [
      '/Applications/Windsurf.app',
      path.join(home, 'Applications/Windsurf.app'),
    ],
    win: [path.join(localAppData, 'Programs', 'Windsurf', 'Windsurf.exe')],
    linux: ['/usr/bin/windsurf'],
  },
  {
    id: 'zed',
    name: 'Zed',
    mac: [
      '/Applications/Zed.app',
      path.join(home, 'Applications/Zed.app'),
    ],
    linux: [path.join(home, '.local/bin/zed'), '/usr/bin/zed'],
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    mac: [
      '/Applications/WebStorm.app',
      path.join(home, 'Applications/WebStorm.app'),
    ],
  },
  {
    id: 'fleet',
    name: 'Fleet',
    mac: [
      '/Applications/Fleet.app',
      path.join(home, 'Applications/Fleet.app'),
    ],
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    mac: [
      '/Applications/Sublime Text.app',
      path.join(home, 'Applications/Sublime Text.app'),
    ],
    win: [path.join(programFiles, 'Sublime Text', 'sublime_text.exe')],
    linux: ['/usr/bin/subl', '/opt/sublime_text/sublime_text'],
  },
  {
    id: 'nova',
    name: 'Nova',
    mac: ['/Applications/Nova.app'],
  },
  {
    id: 'xcode',
    name: 'Xcode',
    mac: ['/Applications/Xcode.app'],
  },
];

function getCandidates(def: EditorDef): string[] {
  if (process.platform === 'darwin') return def.mac ?? [];
  if (process.platform === 'win32') return def.win ?? [];
  return def.linux ?? [];
}

let cachedEditors: DetectedEditor[] | null = null;

function detectEditors(): DetectedEditor[] {
  if (cachedEditors) return cachedEditors;
  const found: DetectedEditor[] = [];
  for (const def of EDITOR_DEFS) {
    for (const candidate of getCandidates(def)) {
      if (fs.existsSync(candidate)) {
        found.push({ id: def.id, name: def.name, appPath: candidate });
        break;
      }
    }
  }
  cachedEditors = found;
  return found;
}

export async function getEditorsWithIcons(): Promise<EditorInfo[]> {
  const detected = detectEditors();
  return Promise.all(
    detected.map(async (e) => {
      try {
        const img = await app.getFileIcon(e.appPath, { size: 'normal' });
        return { id: e.id, name: e.name, icon: `data:image/png;base64,${img.toPNG().toString('base64')}` };
      } catch {
        return { id: e.id, name: e.name, icon: '' };
      }
    }),
  );
}

export function openInEditor(repoPath: string, editorId: string): void {
  const editors = detectEditors();
  const editor = editors.find((e) => e.id === editorId);
  if (!editor) throw new Error(`Editor "${editorId}" not found`);

  if (process.platform === 'darwin') {
    spawn('open', ['-a', editor.appPath, repoPath], { detached: true });
  } else if (process.platform === 'win32') {
    spawn(editor.appPath, [repoPath], { detached: true, shell: true });
  } else {
    spawn(editor.appPath, [repoPath], { detached: true });
  }
}
