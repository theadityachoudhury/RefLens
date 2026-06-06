import { Injectable } from '@angular/core';
import { Observable, from, fromEventPattern } from 'rxjs';
import type { ElectronAPI, EditorInfo, RepoInfo, UpdateEvent } from '../../../../shared/ipc-api.types';
import type { AppSettings } from '../../../../shared/settings.types';
import type {
  BranchInfo,
  CommitNode,
  ConflictFile,
  DiffFile,
  GraphOptions,
  ProcessOutput,
  RebaseEntry,
  RebaseState,
  RepositoryStatus,
  TagInfo,
  WorktreeInfo,
} from '../../../../shared/git.types';

@Injectable({ providedIn: 'root' })
export class ElectronApiService {
  private readonly api: ElectronAPI;

  constructor() {
    this.api = (window as unknown as { electronAPI: ElectronAPI }).electronAPI;
    if (!this.api) throw new Error('electronAPI not found — preload script may have failed');
  }

  // Repository
  openRepository(p?: string): Observable<RepoInfo> {
    return from(this.api.openRepository(p));
  }
  getRecentRepositories(): Observable<RepoInfo[]> {
    return from(this.api.getRecentRepositories());
  }
  getRepositoryStatus(repoPath: string): Observable<RepositoryStatus> {
    return from(this.api.getRepositoryStatus(repoPath));
  }
  watchRepository(repoPath: string): Observable<void> {
    return from(this.api.watchRepository(repoPath));
  }
  onStatusChanged(): Observable<RepositoryStatus> {
    return fromEventPattern<RepositoryStatus>(
      (handler) => this.api.onStatusChanged(handler as (s: RepositoryStatus) => void),
      (_, cleanup) => typeof cleanup === 'function' && cleanup(),
    );
  }

  // Graph
  getCommitGraph(repoPath: string, options: GraphOptions): Observable<CommitNode[]> {
    return from(this.api.getCommitGraph(repoPath, options));
  }
  getCommitDetail(repoPath: string, hash: string): Observable<CommitNode & { diff: DiffFile[] }> {
    return from(this.api.getCommitDetail(repoPath, hash));
  }
  getBranches(repoPath: string): Observable<BranchInfo[]> {
    return from(this.api.getBranches(repoPath));
  }
  getTags(repoPath: string): Observable<TagInfo[]> {
    return from(this.api.getTags(repoPath));
  }
  checkoutBranch(repoPath: string, branch: string): Observable<void> {
    return from(this.api.checkoutBranch(repoPath, branch));
  }
  createBranch(repoPath: string, name: string, fromHash: string): Observable<void> {
    return from(this.api.createBranch(repoPath, name, fromHash));
  }

  // Diffs
  getFileDiff(repoPath: string, hash: string, filePath: string): Observable<DiffFile> {
    return from(this.api.getFileDiff(repoPath, hash, filePath));
  }

  // Conflicts
  getConflictFiles(repoPath: string): Observable<ConflictFile[]> {
    return from(this.api.getConflictFiles(repoPath));
  }
  writeResolvedFile(repoPath: string, filePath: string, content: string): Observable<void> {
    return from(this.api.writeResolvedFile(repoPath, filePath, content));
  }
  stageFile(repoPath: string, filePath: string): Observable<void> {
    return from(this.api.stageFile(repoPath, filePath));
  }
  abortMerge(repoPath: string): Observable<void> {
    return from(this.api.abortMerge(repoPath));
  }
  abortRebase(repoPath: string): Observable<void> {
    return from(this.api.abortRebase(repoPath));
  }
  completeMerge(repoPath: string, message: string): Observable<void> {
    return from(this.api.completeMerge(repoPath, message));
  }

  // Worktree
  createWorktree(repoPath: string, id: string): Observable<WorktreeInfo> {
    return from(this.api.createWorktree(repoPath, id));
  }
  applyResolutionToWorktree(id: string, filePath: string, content: string): Observable<void> {
    return from(this.api.applyResolutionToWorktree(id, filePath, content));
  }
  removeWorktree(id: string): Observable<void> {
    return from(this.api.removeWorktree(id));
  }

  // Process
  spawnProcess(command: string, cwd: string, processId: string): Observable<void> {
    return from(this.api.spawnProcess(command, cwd, processId));
  }
  killProcess(processId: string): Observable<void> {
    return from(this.api.killProcess(processId));
  }
  watchProcessOutput(processId: string): Observable<ProcessOutput> {
    return fromEventPattern<ProcessOutput>(
      (handler) => this.api.onProcessOutput(processId, handler as (d: ProcessOutput) => void),
      (_, cleanup) => typeof cleanup === 'function' && cleanup(),
    );
  }

  // Rebase
  getRebaseState(repoPath: string): Observable<RebaseState> {
    return from(this.api.getRebaseState(repoPath));
  }
  startInteractiveRebase(repoPath: string, ontoRef: string, entries: RebaseEntry[]): Observable<void> {
    return from(this.api.startInteractiveRebase(repoPath, ontoRef, entries));
  }
  continueRebase(repoPath: string): Observable<void> {
    return from(this.api.continueRebase(repoPath));
  }

  // Cherry-pick
  cherryPick(repoPath: string, hashes: string[]): Observable<void> {
    return from(this.api.cherryPick(repoPath, hashes));
  }
  continueCherryPick(repoPath: string): Observable<void> {
    return from(this.api.continueCherryPick(repoPath));
  }
  skipCherryPick(repoPath: string): Observable<void> {
    return from(this.api.skipCherryPick(repoPath));
  }
  abortCherryPick(repoPath: string): Observable<void> {
    return from(this.api.abortCherryPick(repoPath));
  }

  // Window management
  openNewWindow(): Observable<void> {
    return from(this.api.openNewWindow());
  }

  // Editor integration
  getAvailableEditors(): Observable<EditorInfo[]> {
    return from(this.api.getAvailableEditors());
  }
  openInEditor(repoPath: string, editorId: string): Observable<void> {
    return from(this.api.openInEditor(repoPath, editorId));
  }

  // Settings
  getSettings(): Observable<AppSettings> {
    return from(this.api.getSettings());
  }
  setSettings(patch: Partial<AppSettings>): Observable<AppSettings> {
    return from(this.api.setSettings(patch));
  }
  resetSettings(): Observable<AppSettings> {
    return from(this.api.resetSettings());
  }

  // System
  getPlatform(): Observable<string> {
    return from(this.api.getPlatform());
  }
  getAppVersion(): Observable<string> {
    return from(this.api.getAppVersion());
  }
  openExternal(url: string): Observable<void> {
    return from(this.api.openExternal(url));
  }

  // Updates
  checkForUpdate(): Observable<void> {
    return from(this.api.checkForUpdate());
  }
  downloadUpdate(): Observable<void> {
    return from(this.api.downloadUpdate());
  }
  installUpdate(): Observable<void> {
    return from(this.api.installUpdate());
  }
  onUpdateEvent(): Observable<UpdateEvent> {
    return fromEventPattern<UpdateEvent>(
      (handler) => this.api.onUpdateEvent(handler as (e: UpdateEvent) => void),
      (_, cleanup) => typeof cleanup === 'function' && cleanup(),
    );
  }
}
