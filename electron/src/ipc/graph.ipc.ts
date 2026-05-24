import { ipcMain } from 'electron';
import { getGit } from '../git/git.service';
import { buildCommitGraph } from '../git/graph.builder';
import type { GraphOptions } from '../../../shared/git.types';

export function registerGraphHandlers(): void {
  ipcMain.handle('graph:commits', async (_, repoPath: string, options: GraphOptions) => {
    return buildCommitGraph(repoPath, options);
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
    const git = getGit(repoPath);
    await git.checkout(branchName);
  });

  ipcMain.handle('graph:createBranch', async (_, repoPath: string, name: string, fromHash: string) => {
    const git = getGit(repoPath);
    await git.raw(['branch', name, fromHash]);
  });

  ipcMain.handle('graph:commitDetail', async (_, repoPath: string, hash: string) => {
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
