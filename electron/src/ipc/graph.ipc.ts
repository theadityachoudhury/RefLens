import { ipcMain } from 'electron';
import { getGit } from '../git/git.service';
import { buildCommitGraph } from '../git/graph.builder';
import { isGitHash, isGitBranchName, isGitRef } from './ipc-guards';
import type { GraphOptions } from '../../../shared/git.types';

function sanitizeGraphOptions(raw: unknown): GraphOptions {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    maxCount: (typeof o['maxCount'] === 'number' && isFinite(o['maxCount']))
      ? Math.min(5000, Math.max(1, Math.round(o['maxCount'])))
      : 500,
    allBranches:   typeof o['allBranches'] === 'boolean' ? o['allBranches'] : true,
    searchQuery:   typeof o['searchQuery'] === 'string'  ? o['searchQuery'].slice(0, 200) : undefined,
    filterAuthor:  typeof o['filterAuthor'] === 'string' ? o['filterAuthor'].slice(0, 200) : undefined,
  };
}

export function registerGraphHandlers(): void {
  ipcMain.handle('graph:commits', async (_, repoPath: string, rawOptions: unknown) => {
    return buildCommitGraph(repoPath, sanitizeGraphOptions(rawOptions));
  });

  ipcMain.handle('graph:branches', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    const result = await git.branch(['-vv', '--all']);

    return Object.values(result.branches).map((b) => ({
      name: b.name.replace(/^remotes\//, ''),
      fullName: b.name,
      isRemote: b.name.startsWith('remotes/'),
      isCurrent: b.current,
      tipHash: b.commit,
      trackingBranch: undefined,
      aheadCount: undefined,
      behindCount: undefined,
    }));
  });

  ipcMain.handle('graph:tags', async (_, repoPath: string) => {
    const git = getGit(repoPath);
    const raw = await git.raw(['tag', '-l', '--format=%(refname:short)\x1F%(objectname:short)\x1F%(objecttype)']);
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, hash, type] = line.split('\x1F');
        return { name, hash, isAnnotated: type === 'tag', message: undefined };
      });
  });

  ipcMain.handle('graph:checkout', async (_, repoPath: string, branchName: string) => {
    if (!isGitRef(branchName)) throw new Error(`Invalid branch name: ${branchName}`);
    const git = getGit(repoPath);
    await git.checkout(branchName);
  });

  ipcMain.handle('graph:createBranch', async (_, repoPath: string, name: string, fromHash: string) => {
    if (!isGitBranchName(name)) throw new Error(`Invalid branch name: ${name}`);
    if (!isGitHash(fromHash))   throw new Error(`Invalid commit hash: ${fromHash}`);
    const git = getGit(repoPath);
    await git.raw(['branch', name, fromHash]);
  });

  ipcMain.handle('graph:commitDetail', async (_, repoPath: string, hash: string) => {
    if (!isGitHash(hash)) throw new Error(`Invalid commit hash: ${hash}`);
    const git = getGit(repoPath);
    const [show, diff] = await Promise.all([
      git.raw(['show', '--format=%H\x1F%h\x1F%P\x1F%s\x1F%b\x1F%an\x1F%ae\x1F%aI\x1F%cI\x1F%D\x1F---', '-s', hash]),
      git.raw(['diff-tree', '--no-commit-id', '-r', '--name-status', hash]),
    ]);

    const fields = show.split('\x1F');
    return {
      hash: fields[0]?.trim(),
      shortHash: fields[1]?.trim(),
      parents: fields[2]?.trim().split(' ').filter(Boolean) ?? [],
      subject: fields[3]?.trim(),
      body: fields[4]?.trim(),
      authorName: fields[5]?.trim(),
      authorEmail: fields[6]?.trim(),
      authorDate: fields[7]?.trim(),
      committerDate: fields[8]?.trim(),
      refs: fields[9]?.trim().split(',').map((r: string) => r.trim()).filter(Boolean) ?? [],
      lane: 0, generation: 0, laneColor: '', edgesToParents: [],
      diff: diff.split('\n').filter(Boolean).map((line) => {
        const [status, ...pathParts] = line.split('\t');
        return { oldPath: pathParts[0], newPath: pathParts[1] ?? pathParts[0], isBinary: false, hunks: [], status };
      }),
    };
  });
}
