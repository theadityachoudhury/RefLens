import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ElectronApiService } from '../../core/services/electron-api.service';
import { RepositoryService } from '../../core/services/repository.service';
import type { CommitNode } from '../../../../shared/git.types';

@Component({
  selector: 'rl-cherry-pick',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './cherry-pick.component.html',
  styleUrl: './cherry-pick.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CherryPickComponent implements OnInit {
  private api = inject(ElectronApiService);
  private repoService = inject(RepositoryService);
  private router = inject(Router);

  // Commits passed via navigation state from GraphComponent
  queue = signal<CommitNode[]>([]);
  executing = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const state = window.history.state as { queue?: CommitNode[] };
    if (state?.queue) this.queue.set(state.queue);
  }

  drop(event: CdkDragDrop<CommitNode[]>): void {
    const updated = [...this.queue()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.queue.set(updated);
  }

  remove(hash: string): void {
    this.queue.update((q) => q.filter((c) => c.hash !== hash));
  }

  execute(): void {
    const repo = this.repoService.activeRepo;
    if (!repo || this.queue().length === 0) return;
    this.executing.set(true);
    this.error.set(null);
    const hashes = this.queue().map((c) => c.hash);
    this.api.cherryPick(repo.path, hashes).subscribe({
      next: () => {
        this.executing.set(false);
        this.repoService.refreshStatus();
        this.router.navigate(['/graph']);
      },
      error: (err: Error) => {
        this.executing.set(false);
        this.error.set(err.message ?? 'Cherry-pick failed');
        this.repoService.refreshStatus();
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/graph']);
  }
}
