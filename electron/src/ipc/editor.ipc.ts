import { ipcMain } from 'electron';
import { getEditorsWithIcons, openInEditor } from '../editors/editor.detector';

export function registerEditorHandlers(): void {
  ipcMain.handle('editor:getAll', () => getEditorsWithIcons());

  ipcMain.handle('editor:open', (_, repoPath: string, editorId: string) => {
    openInEditor(repoPath, editorId);
  });
}
