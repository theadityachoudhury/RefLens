import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../../shared/ipc-api.types';
import type { ProcessOutput, RepositoryStatus } from '../../shared/git.types';

const electronAPI: ElectronAPI = {
  // Repository
  openRepository: (p) => ipcRenderer.invoke('repo:open', p),
  getRecentRepositories: () => ipcRenderer.invoke('repo:getRecent'),
  getRepositoryStatus: (r) => ipcRenderer.invoke('repo:status', r),
  onStatusChanged: (cb) => {
    const handler = (_: unknown, status: RepositoryStatus) => cb(status);
    ipcRenderer.on('repo:statusChanged', handler);
    return () => ipcRenderer.removeListener('repo:statusChanged', handler);
  },

  // Graph
  getCommitGraph: (r, o) => ipcRenderer.invoke('graph:commits', r, o),
  getCommitDetail: (r, h) => ipcRenderer.invoke('graph:commitDetail', r, h),
  getBranches: (r) => ipcRenderer.invoke('graph:branches', r),
  getTags: (r) => ipcRenderer.invoke('graph:tags', r),
  checkoutBranch: (r, b) => ipcRenderer.invoke('graph:checkout', r, b),
  createBranch: (r, n, h) => ipcRenderer.invoke('graph:createBranch', r, n, h),

  // Diffs
  getFileDiff: (r, h, f) => ipcRenderer.invoke('diff:file', r, h, f),

  // Conflicts
  getConflictFiles: (r) => ipcRenderer.invoke('conflicts:list', r),
  writeResolvedFile: (r, f, c) => ipcRenderer.invoke('conflicts:write', r, f, c),
  stageFile: (r, f) => ipcRenderer.invoke('conflicts:stage', r, f),
  abortMerge: (r) => ipcRenderer.invoke('conflicts:abortMerge', r),
  abortRebase: (r) => ipcRenderer.invoke('rebase:abort', r),
  completeMerge: (r, m) => ipcRenderer.invoke('conflicts:complete', r, m),

  // Worktree
  createWorktree: (r, id) => ipcRenderer.invoke('worktree:create', r, id),
  applyResolutionToWorktree: (id, f, c) => ipcRenderer.invoke('worktree:applyFile', id, f, c),
  removeWorktree: (id) => ipcRenderer.invoke('worktree:remove', id),

  // Process
  spawnProcess: (cmd, cwd, id) => ipcRenderer.invoke('process:spawn', cmd, cwd, id),
  killProcess: (id) => ipcRenderer.invoke('process:kill', id),
  onProcessOutput: (id, cb) => {
    const handler = (_: unknown, data: ProcessOutput) => cb(data);
    ipcRenderer.on(`process:output:${id}`, handler);
    return () => ipcRenderer.removeListener(`process:output:${id}`, handler);
  },

  // Rebase
  getRebaseState: (r) => ipcRenderer.invoke('rebase:state', r),
  startInteractiveRebase: (r, onto, entries) => ipcRenderer.invoke('rebase:start', r, onto, entries),
  continueRebase: (r) => ipcRenderer.invoke('rebase:continue', r),

  // Cherry-pick
  cherryPick: (r, hashes) => ipcRenderer.invoke('cherrypick:run', r, hashes),
  continueCherryPick: (r) => ipcRenderer.invoke('cherrypick:continue', r),
  skipCherryPick: (r) => ipcRenderer.invoke('cherrypick:skip', r),
  abortCherryPick: (r) => ipcRenderer.invoke('cherrypick:abort', r),

  // Window management
  openNewWindow: () => ipcRenderer.invoke('window:new'),

  // Editor integration
  getAvailableEditors: () => ipcRenderer.invoke('editor:getAll'),
  openInEditor: (repoPath, editorId) => ipcRenderer.invoke('editor:open', repoPath, editorId),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
