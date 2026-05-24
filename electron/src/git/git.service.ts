import simpleGit, { SimpleGit } from 'simple-git';

const instances = new Map<string, SimpleGit>();

export function getGit(repoPath: string): SimpleGit {
  if (!instances.has(repoPath)) {
    instances.set(repoPath, simpleGit(repoPath));
  }
  return instances.get(repoPath)!;
}

export function clearGitInstance(repoPath: string): void {
  instances.delete(repoPath);
}
