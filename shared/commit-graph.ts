import type { CommitNode } from './git.types';

export class CommitGraph {
  private nodeMap = new Map<string, CommitNode>();
  private childrenMap = new Map<string, string[]>();
  private _nodes: CommitNode[];

  constructor(commits: CommitNode[]) {
    this._nodes = commits;
    for (const commit of commits) {
      this.nodeMap.set(commit.hash, commit);
    }
    for (const commit of commits) {
      for (const parentHash of commit.parents) {
        const children = this.childrenMap.get(parentHash);
        if (children) {
          children.push(commit.hash);
        } else {
          this.childrenMap.set(parentHash, [commit.hash]);
        }
      }
    }
  }

  static from(commits: CommitNode[]): CommitGraph {
    return new CommitGraph(commits);
  }

  get nodes(): ReadonlyArray<CommitNode> {
    return this._nodes;
  }

  get size(): number {
    return this._nodes.length;
  }

  getNode(hash: string): CommitNode | undefined {
    return this.nodeMap.get(hash);
  }

  getParents(hash: string): CommitNode[] {
    const node = this.nodeMap.get(hash);
    if (!node) return [];
    return node.parents
      .map((h) => this.nodeMap.get(h))
      .filter((n): n is CommitNode => n !== undefined);
  }

  getChildren(hash: string): CommitNode[] {
    return (this.childrenMap.get(hash) ?? [])
      .map((h) => this.nodeMap.get(h))
      .filter((n): n is CommitNode => n !== undefined);
  }

  // BFS from descendant toward its parents; returns true if ancestorHash is reachable
  isAncestor(ancestorHash: string, descendantHash: string): boolean {
    if (ancestorHash === descendantHash) return true;
    const visited = new Set<string>();
    const queue = [descendantHash];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const node = this.nodeMap.get(current);
      if (!node) continue;
      for (const parentHash of node.parents) {
        if (parentHash === ancestorHash) return true;
        if (!visited.has(parentHash)) queue.push(parentHash);
      }
    }
    return false;
  }

  // LCA: find the closest common ancestor of two commits
  getMergeBase(hashA: string, hashB: string): CommitNode | undefined {
    const ancestorsA = this.collectAncestors(hashA);
    // Walk B's ancestry in generation order (lower generation = newer commit, so
    // iterating newest-first naturally finds the closest common ancestor first).
    const queue: string[] = [hashB];
    const visited = new Set<string>();
    while (queue.length > 0) {
      queue.sort((a, b) => {
        const ga = this.nodeMap.get(a)?.generation ?? Infinity;
        const gb = this.nodeMap.get(b)?.generation ?? Infinity;
        return ga - gb;
      });
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (ancestorsA.has(current)) return this.nodeMap.get(current);
      const node = this.nodeMap.get(current);
      if (node) {
        for (const parentHash of node.parents) {
          if (!visited.has(parentHash)) queue.push(parentHash);
        }
      }
    }
    return undefined;
  }

  // DFS from each start hash down through parents; returns all reachable hashes
  getReachableFrom(startHashes: string[]): Set<string> {
    const reachable = new Set<string>();
    const stack = [...startHashes];
    while (stack.length > 0) {
      const hash = stack.pop()!;
      if (reachable.has(hash)) continue;
      reachable.add(hash);
      const node = this.nodeMap.get(hash);
      if (node) {
        for (const parentHash of node.parents) {
          if (!reachable.has(parentHash)) stack.push(parentHash);
        }
      }
    }
    return reachable;
  }

  serialize(): CommitNode[] {
    return this._nodes;
  }

  private collectAncestors(hash: string): Set<string> {
    const ancestors = new Set<string>();
    const stack = [hash];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (ancestors.has(current)) continue;
      ancestors.add(current);
      const node = this.nodeMap.get(current);
      if (node) {
        for (const parentHash of node.parents) {
          if (!ancestors.has(parentHash)) stack.push(parentHash);
        }
      }
    }
    return ancestors;
  }
}
