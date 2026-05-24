import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ElectronApiService } from '../../core/services/electron-api.service';
import { RepositoryService } from '../../core/services/repository.service';
import type { RebaseEntry } from '../../../../shared/git.types';

type RebaseAction = RebaseEntry['action'];
const ACTIONS: RebaseAction[] = ['pick', 'reword', 'edit', 'squash', 'fixup', 'drop'];

@Component({
  selector: 'rl-rebase',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './rebase.component.html',
  styleUrl: './rebase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RebaseComponent implements OnInit {
  private api = inject(ElectronApiService);
  private repoService = inject(RepositoryService);
  private router = inject(Router);

  entries = signal<RebaseEntry[]>([]);
  ontoRef = signal('HEAD~10');
  loading = signal(true);
  executing = signal(false);
  error = signal<string | null>(null);
  readonly actions = ACTIONS;

  ngOnInit(): void {
    this.loadRebaseState();
  }

  private loadRebaseState(): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.api.getRebaseState(repo.path).subscribe({
      next: (state) => {
        this.entries.set(state.entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  drop(event: CdkDragDrop<RebaseEntry[]>): void {
    const updated = [...this.entries()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.entries.set(updated);
  }

  setAction(index: number, action: RebaseAction): void {
    this.entries.update((list) =>
      list.map((e, i) => (i === index ? { ...e, action } : e)),
    );
  }

  execute(): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.executing.set(true);
    this.error.set(null);
    this.api.startInteractiveRebase(repo.path, this.ontoRef(), this.entries()).subscribe({
      next: () => {
        this.executing.set(false);
        this.repoService.refreshStatus();
        this.router.navigate(['/graph']);
      },
      error: (err: Error) => {
        this.executing.set(false);
        this.error.set(err.message ?? 'Rebase failed');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/graph']);
  }
}
