import { CommitNode, GraphEdge, GraphOptions } from '../../../shared/git.types';
import { getGit } from './git.service';

const LANE_COLORS = [
  '#58a6ff', '#3fb950', '#f78166', '#d2a8ff', '#ffa657',
  '#79c0ff', '#56d364', '#ff7b72', '#bc8cff', '#e3b341',
  '#4fc1e9', '#a8e6cf', '#ffd3b6', '#ffaaa5', '#a29bfe',
];

const LOG_SEP = '---REFLENS---';
const FIELD_SEP = '\x1F';

const LOG_FORMAT = [
  '%H',   // full hash
  '%h',   // short hash
  '%P',   // parent hashes (space-separated)
  '%s',   // subject
  '%an',  // author name
  '%ae',  // author email
  '%aI',  // author date ISO
  '%cI',  // committer date ISO
  '%D',   // ref names
].join(FIELD_SEP) + '\n' + LOG_SEP;

export async function buildCommitGraph(
  repoPath: string,
  options: GraphOptions,
): Promise<CommitNode[]> {
  const git = getGit(repoPath);

  const args: string[] = [
    '--topo-order',
    `--max-count=${options.maxCount}`,
    `--format=${LOG_FORMAT}`,
  ];

  if (options.allBranches) args.push('--all');
  if (options.filterAuthor) args.push(`--author=${options.filterAuthor}`);
  if (options.searchQuery) args.push(`--grep=${options.searchQuery}`);

  const raw = await git.raw(['log', ...args]);
  const commits = parseRawLog(raw);
  assignLanes(commits);
  buildEdges(commits);
  return commits;
}

function parseRawLog(raw: string): CommitNode[] {
  return raw
    .split(LOG_SEP)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [hash, shortHash, parentsStr, subject, authorName, authorEmail, authorDate, committerDate, refsStr] =
        block.split(FIELD_SEP);

      const parents = parentsStr?.trim() ? parentsStr.trim().split(' ') : [];
      const refs = refsStr?.trim()
        ? refsStr.trim().split(',').map((r) => r.trim()).filter(Boolean)
        : [];

      return {
        hash: hash?.trim() ?? '',
        shortHash: shortHash?.trim() ?? '',
        subject: subject?.trim() ?? '',
        body: '',
        authorName: authorName?.trim() ?? '',
        authorEmail: authorEmail?.trim() ?? '',
        authorDate: authorDate?.trim() ?? '',
        committerDate: committerDate?.trim() ?? '',
        parents,
        refs,
        lane: 0,
        generation: 0,
        laneColor: LANE_COLORS[0],
        edgesToParents: [],
      } satisfies CommitNode;
    });
}

function assignLanes(commits: CommitNode[]): void {
  // commits are in newest-first topological order
  // laneMap: parent hash → pre-assigned lane
  const laneMap = new Map<string, number>();
  // activeLanes[i] = hash currently "occupying" lane i (null = free)
  const activeLanes: (string | null)[] = [];

  commits.forEach((commit, generation) => {
    commit.generation = generation;

    let lane: number;
    if (laneMap.has(commit.hash)) {
      lane = laneMap.get(commit.hash)!;
    } else {
      // First free slot, or extend
      const free = activeLanes.indexOf(null);
      lane = free === -1 ? activeLanes.length : free;
      if (lane === activeLanes.length) activeLanes.push(null);
    }

    commit.lane = lane;
    commit.laneColor = LANE_COLORS[lane % LANE_COLORS.length];
    activeLanes[lane] = null; // this slot is consumed by this commit

    // Assign lanes to parents
    commit.parents.forEach((parentHash, idx) => {
      if (!laneMap.has(parentHash)) {
        if (idx === 0) {
          // First parent inherits same lane
          laneMap.set(parentHash, lane);
          activeLanes[lane] = parentHash;
        } else {
          // Additional parents (merges) open a new lane
          const free = activeLanes.indexOf(null);
          const newLane = free === -1 ? activeLanes.length : free;
          if (newLane === activeLanes.length) activeLanes.push(null);
          laneMap.set(parentHash, newLane);
          activeLanes[newLane] = parentHash;
        }
      }
    });
  });
}

function buildEdges(commits: CommitNode[]): void {
  const posMap = new Map<string, CommitNode>(commits.map((c) => [c.hash, c]));

  for (const commit of commits) {
    commit.edgesToParents = commit.parents
      .map((parentHash, idx): GraphEdge | null => {
        const parent = posMap.get(parentHash);
        if (!parent) return null;
        return {
          fromHash: commit.hash,
          toHash: parentHash,
          fromLane: commit.lane,
          toLane: parent.lane,
          isMerge: idx > 0,
          color: LANE_COLORS[parent.lane % LANE_COLORS.length],
        };
      })
      .filter((e): e is GraphEdge => e !== null);
  }
}
