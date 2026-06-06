import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import { WebContents } from "electron";
import { getGit } from "./git.service";
import type { RepositoryStatus } from "../../../shared/git.types";

const watchers = new Map<number, FSWatcher>();
const debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

async function fetchStatus(repoPath: string): Promise<RepositoryStatus> {
	const git = getGit(repoPath);
	const [status, log] = await Promise.all([
		git.status(),
		git.log(["-1", "--format=%H"]),
	]);
	return {
		currentBranch: status.current ?? "HEAD",
		detachedHead: !status.current,
		headHash: log.latest?.hash ?? "",
		staged: status.staged.map((f) => ({ path: f, status: "M" as const })),
		unstaged: status.modified.map((f) => ({ path: f, status: "M" as const })),
		untracked: status.not_added,
		conflicted: status.conflicted,
		isRebasing: false,
		isMerging: status.conflicted.length > 0,
		isCherryPicking: false,
	};
}

export async function startWatch(
	windowId: number,
	repoPath: string,
	sender: WebContents,
): Promise<void> {
	stopWatch(windowId);

	const gitDir = path.join(repoPath, ".git");
	const watcher = chokidar.watch(gitDir, {
		ignoreInitial: true,
		persistent: true,
		// objects/ is written heavily during fetch/pack — not relevant to status display
		ignored: [path.join(gitDir, "objects"), path.join(gitDir, "logs")],
		awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
	});

	const notify = () => {
		const existing = debounceTimers.get(windowId);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(async () => {
			debounceTimers.delete(windowId);
			if (sender.isDestroyed()) return;
			try {
				const status = await fetchStatus(repoPath);
				console.log(`Notifying window ${windowId} of status change:`, status);
				if (!sender.isDestroyed()) sender.send("repo:statusChanged", status);
			} catch {
				// repo may be in a transient state during a git operation — skip silently
			}
		}, 300);

		debounceTimers.set(windowId, timer);
	};

	watcher.on("all", notify);
	watchers.set(windowId, watcher);
}

export function stopWatch(windowId: number): void {
	const timer = debounceTimers.get(windowId);
	if (timer) {
		clearTimeout(timer);
		debounceTimers.delete(windowId);
	}
	const watcher = watchers.get(windowId);
	if (watcher) {
		watcher.close();
		watchers.delete(windowId);
	}
}
