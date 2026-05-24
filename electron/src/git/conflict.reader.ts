import fs from 'fs';
import path from 'path';
import { ConflictFile, ConflictHunk, ConflictResolutions } from '../../../shared/git.types';
import { getGit } from './git.service';

/**
 * Reads all conflicted files in the repo, strips conflict markers,
 * and pre-computes both view representations and all three resolutions.
 */
export async function readConflictFiles(repoPath: string): Promise<ConflictFile[]> {
  const git = getGit(repoPath);

  // Get list of conflicted files
  const status = await git.status();
  const conflictedPaths = status.conflicted;

  return Promise.all(conflictedPaths.map((filePath) => parseConflictFile(repoPath, filePath)));
}

async function parseConflictFile(repoPath: string, filePath: string): Promise<ConflictFile> {
  const fullPath = path.join(repoPath, filePath);
  const rawContent = fs.readFileSync(fullPath, 'utf-8');
  const lines = rawContent.split('\n');

  const hunks: ConflictHunk[] = [];
  const oursViewLines: string[] = [];
  const theirsViewLines: string[] = [];

  let state: 'normal' | 'ours' | 'theirs' = 'normal';
  let currentHunkId = 0;
  let oursLines: string[] = [];
  let theirsLines: string[] = [];
  let oursStartInView = 0;
  let theirsStartInView = 0;

  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      state = 'ours';
      oursLines = [];
      theirsLines = [];
      oursStartInView = oursViewLines.length;
      theirsStartInView = theirsViewLines.length;
      continue;
    }

    if (line.startsWith('=======') && state === 'ours') {
      state = 'theirs';
      continue;
    }

    if (line.startsWith('>>>>>>>') && state === 'theirs') {
      // End of conflict block — record the hunk
      const hunk: ConflictHunk = {
        id: `hunk-${currentHunkId++}`,
        oursStartLine: oursStartInView,
        oursLines: [...oursLines],
        theirsLines: [...theirsLines],
        theirsStartLine: theirsStartInView,
      };
      hunks.push(hunk);

      // Add the respective lines to each view
      oursViewLines.push(...oursLines);
      theirsViewLines.push(...theirsLines);
      state = 'normal';
      continue;
    }

    if (state === 'ours') {
      oursLines.push(line);
    } else if (state === 'theirs') {
      theirsLines.push(line);
    } else {
      // Context line — same in both views
      oursViewLines.push(line);
      theirsViewLines.push(line);
    }
  }

  return {
    path: filePath,
    oursView: oursViewLines.join('\n'),
    theirsView: theirsViewLines.join('\n'),
    hunks,
    resolutions: computeResolutions(oursViewLines, theirsViewLines, hunks),
  };
}

/**
 * Pre-computes all three resolution options in memory (pure string ops, no I/O).
 * acceptCurrent  → keep ours lines for every hunk
 * acceptIncoming → keep theirs lines for every hunk
 * acceptBoth     → ours lines followed by theirs lines for every hunk
 *
 * The result for each option is already the oursView / theirsView since they
 * are built with the respective lines substituted. Accept-both needs its own pass.
 */
function computeResolutions(
  oursViewLines: string[],
  theirsViewLines: string[],
  hunks: ConflictHunk[],
): ConflictResolutions {
  // acceptCurrent is exactly oursView
  const acceptCurrent = oursViewLines.join('\n');

  // acceptIncoming is exactly theirsView
  const acceptIncoming = theirsViewLines.join('\n');

  // acceptBoth: for each hunk region in oursView, replace with ours+theirs lines
  // We rebuild the file, swapping hunk regions with the combined content.
  // Strategy: walk oursViewLines, when we hit a hunk's ours region, emit ours+theirs.
  const acceptBothLines = buildAcceptBoth(oursViewLines, hunks);
  const acceptBoth = acceptBothLines.join('\n');

  return { acceptCurrent, acceptIncoming, acceptBoth };
}

function buildAcceptBoth(oursViewLines: string[], hunks: ConflictHunk[]): string[] {
  const result: string[] = [];
  let i = 0;

  // Sort hunks by start line
  const sorted = [...hunks].sort((a, b) => a.oursStartLine - b.oursStartLine);
  let hunkIdx = 0;

  while (i < oursViewLines.length) {
    const hunk = sorted[hunkIdx];
    if (hunk && i === hunk.oursStartLine) {
      // Emit ours then theirs
      result.push(...hunk.oursLines);
      result.push(...hunk.theirsLines);
      i += hunk.oursLines.length;
      hunkIdx++;
    } else {
      result.push(oursViewLines[i]);
      i++;
    }
  }

  return result;
}
