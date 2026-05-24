/**
 * Shared validation helpers for IPC handlers.
 * All functions return false (or null) on failure — callers throw IpcError.
 */

import path from 'path';

// ---------------------------------------------------------------------------
// Git commit hash — hex string, 4–64 chars (short or full SHA-1/SHA-256)
// ---------------------------------------------------------------------------
export function isGitHash(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{4,64}$/i.test(v);
}

// ---------------------------------------------------------------------------
// Git refname / ontoRef — must not start with '-' (prevents --flag injection),
// must not contain null bytes or newlines, max 255 chars.
// Allows relative refs like HEAD~3, origin/main, v1.0.0, etc.
// ---------------------------------------------------------------------------
export function isGitRef(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= 255 &&
    !v.startsWith('-') &&
    !v.includes('\0') &&
    !v.includes('\n') &&
    !v.includes('\r')
  );
}

// ---------------------------------------------------------------------------
// Git branch name — stricter than a generic refname: no spaces, no `..`,
// no leading `.`, no trailing `.lock`
// ---------------------------------------------------------------------------
export function isGitBranchName(v: unknown): v is string {
  if (!isGitRef(v)) return false;
  if (/\s/.test(v))         return false;  // no whitespace
  if (v.includes('..'))     return false;  // no double-dot
  if (v.startsWith('.'))    return false;  // no leading dot
  if (v.endsWith('.lock'))  return false;  // no .lock suffix (git convention)
  return true;
}

// ---------------------------------------------------------------------------
// Safe path join — resolves relative path inside a base directory and checks
// that the result stays within that base (prevents traversal attacks).
// Returns null if filePath is absolute, contains null bytes, or escapes base.
// ---------------------------------------------------------------------------
export function safeResolveWithin(base: string, filePath: string): string | null {
  if (typeof filePath !== 'string') return null;
  if (path.isAbsolute(filePath))    return null;
  if (filePath.includes('\0'))      return null;

  const resolved = path.resolve(base, filePath);
  const safeBase = path.resolve(base);

  // Must be strictly inside the directory (not the directory itself)
  if (resolved !== safeBase && resolved.startsWith(safeBase + path.sep)) {
    return resolved;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Worktree / process ID — alphanumeric + hyphens only, max 64 chars.
// Prevents path components from being embedded in map keys used in paths.
// ---------------------------------------------------------------------------
export function isSafeId(v: unknown): v is string {
  return typeof v === 'string' && /^[a-zA-Z0-9\-]{1,64}$/.test(v);
}

// ---------------------------------------------------------------------------
// Absolute path — for cwd values passed to spawn().
// ---------------------------------------------------------------------------
export function isAbsolutePath(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && path.isAbsolute(v) && !v.includes('\0');
}

// ---------------------------------------------------------------------------
// Bounded string — non-empty, no null bytes, max length.
// ---------------------------------------------------------------------------
export function isBoundedString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max && !v.includes('\0');
}

// ---------------------------------------------------------------------------
// Rebase action — one of the six git-rebase(1) todo commands.
// ---------------------------------------------------------------------------
const REBASE_ACTIONS = new Set(['pick', 'reword', 'edit', 'squash', 'fixup', 'drop']);

export function isRebaseAction(v: unknown): boolean {
  return typeof v === 'string' && REBASE_ACTIONS.has(v);
}
