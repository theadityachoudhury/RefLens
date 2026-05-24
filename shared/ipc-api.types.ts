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
} from './git.types';

export interface RepoInfo {
  path: string;
  name: string;
}

/** The typed API exposed on window.electronAPI via contextBridge */
export interface ElectronAPI {
  // Repository
  openRepository(path?: string): Promise<RepoInfo>;
  getRecentRepositories(): Promise<RepoInfo[]>;
  getRepositoryStatus(repoPath: string): Promise<RepositoryStatus>;
  onStatusChanged(callback: (status: RepositoryStatus) => void): () => void;

  // Graph
  getCommitGraph(repoPath: string, options: GraphOptions): Promise<CommitNode[]>;
  getCommitDetail(repoPath: string, hash: string): Promise<CommitNode & { diff: DiffFile[] }>;
  getBranches(repoPath: string): Promise<BranchInfo[]>;
  getTags(repoPath: string): Promise<TagInfo[]>;
  checkoutBranch(repoPath: string, branchName: string): Promise<void>;
  createBranch(repoPath: string, name: string, fromHash: string): Promise<void>;

  // Diffs
  getFileDiff(repoPath: string, hash: string, filePath: string): Promise<DiffFile>;

  // Conflicts
  getConflictFiles(repoPath: string): Promise<ConflictFile[]>;
  writeResolvedFile(repoPath: string, filePath: string, resolvedContent: string): Promise<void>;
  stageFile(repoPath: string, filePath: string): Promise<void>;
  abortMerge(repoPath: string): Promise<void>;
  abortRebase(repoPath: string): Promise<void>;
  completeMerge(repoPath: string, message: string): Promise<void>;

  // Worktree (for "Run & Test" preview)
  createWorktree(repoPath: string, id: string): Promise<WorktreeInfo>;
  applyResolutionToWorktree(worktreeId: string, filePath: string, content: string): Promise<void>;
  removeWorktree(worktreeId: string): Promise<void>;

  // Process spawning (preview run inside worktree)
  spawnProcess(command: string, cwd: string, processId: string): Promise<void>;
  killProcess(processId: string): Promise<void>;
  onProcessOutput(processId: string, callback: (data: ProcessOutput) => void): () => void;

  // Rebase
  getRebaseState(repoPath: string): Promise<RebaseState>;
  startInteractiveRebase(repoPath: string, ontoRef: string, entries: RebaseEntry[]): Promise<void>;
  continueRebase(repoPath: string): Promise<void>;

  // Cherry-pick
  cherryPick(repoPath: string, hashes: string[]): Promise<void>;
  continueCherryPick(repoPath: string): Promise<void>;
  skipCherryPick(repoPath: string): Promise<void>;
  abortCherryPick(repoPath: string): Promise<void>;
}
