# Vision — RefLens

## The Problem

Git is powerful, but its most important operations are also its most opaque. When a merge conflict lands, you're staring at raw `<<<<<<<` markers in a text file, context-switching between your editor, the terminal, and your memory of what each branch was trying to do. When you need to clean up a branch before a PR, interactive rebase means memorizing a todo-file syntax and hoping you don't accidentally drop the wrong commit. Cherry-picking across branches means copying hashes from `git log` and praying the order is right.

None of these operations are fundamentally hard. They're just *invisible*. The data structures are clear — a DAG of commits, a set of text hunks, a sequence of rebase actions — but Git's CLI exposes them as raw text streams designed for scripts, not humans.

**The result:** developers avoid the operations that would make their history cleaner. Merge commits pile up. Conflicts get resolved with "accept all incoming" because it's the path of least friction. Rebase is avoided entirely on shared branches because the mental overhead is too high.

## The Idea

RefLens is built on a single premise: **if you can see the graph, the operations become obvious**.

When a commit DAG is rendered as an actual graph — with lanes, colors, branch labels, and zoom — the structure of your history is immediately legible. You can see which commits are merge bases, which branches have diverged, and where conflicts will arise before they do. The visual representation isn't decoration; it's the primary interface.

This same principle extends to every operation:

- **Conflicts** — instead of raw conflict markers, show two clean editors side by side with the changes highlighted. The human brain is wired for comparison; give it two columns, not one interspersed mess.
- **Rebase** — instead of a text file with cryptic verbs, show a drag-and-drop list. The action of reordering commits should feel like reordering cards on a table.
- **Cherry-pick** — instead of copying hashes, click commits on the graph. The queue builds visually; reorder with drag-and-drop before applying.

## What RefLens Is Not

RefLens is not trying to be a full Git GUI. It does not aim to replace `git commit`, `git push`, `git fetch`, or day-to-day terminal workflows. Developers who are comfortable with Git's CLI for basic operations should stay there.

RefLens is the tool you reach for when something *complex* is happening:
- You're resolving a multi-file merge conflict and want to understand what both sides changed before picking a resolution
- You're cleaning up a feature branch before opening a PR and need to squash, reorder, and drop commits safely
- You're backporting a fix to multiple release branches and want to see exactly which commits to cherry-pick

The goal is not to abstract Git away. It's to make the hard operations *visible* so that good Git hygiene becomes the path of least resistance.

## Simplifying Git Without Hiding It

The design principle is **visual scaffolding, not abstraction**. RefLens shows you Git's actual data structures — the DAG, the hunks, the rebase sequence — rendered in a form your eyes can process quickly. It doesn't invent new concepts or hide what Git is doing.

When you resolve a conflict in RefLens, the output is a real staged file that `git status` will confirm. When you run an interactive rebase, it's `git rebase --interactive` executing under the hood — RefLens just bypasses the text editor with a pre-written todo file. When you cherry-pick a queue of commits, each one is a real `git cherry-pick` call.

Power users who want to drop back to the terminal mid-operation can do so at any point. RefLens is a lens on Git's internals, not a wall in front of them.

## The "Run & Test" Idea

One of the most underrated problems in conflict resolution is: *how do you know the resolution is correct?* Accepting "incoming" is safe syntactically but may break semantics. The only way to know is to run the code.

RefLens's "Run & Test" panel addresses this directly. Before confirming a resolution, you can spin up a Git worktree in a temporary directory, write your proposed resolution into it, and run any command — build, test, lint, type-check — against the result. The output streams in real time. Only when you're confident do you confirm, which writes the resolution back to the real working tree and stages it.

This turns conflict resolution from a guess into a verified operation. It's the same workflow a careful developer would do manually, automated into a single panel.

## Long-term Direction

The visual-first approach opens doors that CLI-only tools cannot enter:

- **Conflict intelligence** — highlight which hunks are purely additive (low risk) vs. overlapping edits (high risk), before the user even looks at the code
- **Graph-based branch management** — create, rename, delete, and push branches directly from the DAG with drag interactions
- **Stash visualization** — show stashes as dangling commits on the graph so their relationship to the current branch is clear
- **Blame integration** — click a line in a conflict viewer to see its `git blame` history inline, so you understand *why* the change was made before deciding how to resolve it
- **AI-assisted resolution suggestions** — propose resolutions for common conflict patterns (import reordering, version bumps, simple additions) with a one-click accept
- **Team collaboration layer** — surface who made which conflicting change and link to the PR or issue that introduced it, so resolution decisions have full context

The thread running through all of these is the same: take something Git knows but doesn't show you, and make it visible.
