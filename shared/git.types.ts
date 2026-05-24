export interface CommitNode {
  hash: string;
  shortHash: string;
  subject: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerDate: string;
  parents: string[];
  refs: string[];
  // DAG layout — populated by graph.builder.ts
  lane: number;
  generation: number;
  laneColor: string;
  edgesToParents: GraphEdge[];
}

export interface GraphEdge {
  fromHash: string;
  toHash: string;
  fromLane: number;
  toLane: number;
  isMerge: boolean;
  color: string;
}

export interface BranchInfo {
  name: string;
  fullName: string;
  isRemote: boolean;
  isCurrent: boolean;
  tipHash: string;
  trackingBranch?: string;
  aheadCount?: number;
  behindCount?: number;
}

export interface TagInfo {
  name: string;
  hash: string;
  isAnnotated: boolean;
  message?: string;
}

export interface RepositoryStatus {
  currentBranch: string;
  detachedHead: boolean;
  headHash: string;
  staged: ChangedFile[];
  unstaged: ChangedFile[];
  untracked: string[];
  conflicted: string[];
  isRebasing: boolean;
  isMerging: boolean;
  isCherryPicking: boolean;
}

export interface ChangedFile {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | 'C' | '?';
  oldPath?: string;
}

/**
 * A single conflict hunk extracted from a file.
 * Conflict markers are stripped — only the actual code lines are stored.
 */
export interface ConflictHunk {
  id: string;
  /** 0-based line index in the ours-view file where this hunk starts */
  oursStartLine: number;
  /** Lines from HEAD (current branch) — no conflict markers */
  oursLines: string[];
  /** Lines from the incoming branch — no conflict markers */
  theirsLines: string[];
  /** 0-based line index in the theirs-view file where this hunk starts */
  theirsStartLine: number;
}

/**
 * A conflicted file with all three representations pre-computed:
 * - oursView: full file content showing ours lines in place of conflict markers
 * - theirsView: full file content showing theirs lines in place of conflict markers
 * - hunks: metadata for highlighting the conflicting regions
 */
export interface ConflictFile {
  path: string;
  /** Full file content with ours lines substituted (no conflict markers) */
  oursView: string;
  /** Full file content with theirs lines substituted (no conflict markers) */
  theirsView: string;
  hunks: ConflictHunk[];
  /** Pre-computed resolutions — populated async on detection */
  resolutions?: ConflictResolutions;
}

/**
 * All three resolution options pre-computed as full file content strings.
 * Generated in-memory (string processing only, no worktree needed).
 */
export interface ConflictResolutions {
  acceptCurrent: string;
  acceptIncoming: string;
  acceptBoth: string;
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  isBinary: boolean;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface RebaseEntry {
  action: 'pick' | 'squash' | 'fixup' | 'reword' | 'drop' | 'edit';
  hash: string;
  subject: string;
}

export interface RebaseState {
  entries: RebaseEntry[];
  ontoRef: string;
  inProgress: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export interface ProcessOutput {
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export interface WorktreeInfo {
  id: string;
  path: string;
  branch: string;
  repoPath: string;
}

export interface GraphOptions {
  maxCount: number;
  allBranches: boolean;
  searchQuery?: string;
  filterAuthor?: string;
}
