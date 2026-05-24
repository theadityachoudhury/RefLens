import { Injectable, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Subscription,
  switchMap,
  tap,
  timer,
  EMPTY,
} from 'rxjs';
import { ElectronApiService } from './electron-api.service';
import type { RepoInfo } from '../../../../shared/ipc-api.types';
import type { RepositoryStatus } from '../../../../shared/git.types';

@Injectable({ providedIn: 'root' })
export class RepositoryService implements OnDestroy {
  private readonly _activeRepo = new BehaviorSubject<RepoInfo | null>(null);
  readonly activeRepo$ = this._activeRepo.asObservable();

  private readonly _status = new BehaviorSubject<RepositoryStatus | null>(null);
  readonly status$ = this._status.asObservable();

  private readonly _loading = new BehaviorSubject(false);
  readonly loading$ = this._loading.asObservable();

  private statusSub: Subscription | null = null;
  private statusChangedSub: Subscription | null = null;

  constructor(private api: ElectronApiService) {}

  get activeRepo(): RepoInfo | null {
    return this._activeRepo.value;
  }

  get currentStatus(): RepositoryStatus | null {
    return this._status.value;
  }

  openRepository(dirPath?: string): void {
    this._loading.next(true);
    this.api.openRepository(dirPath).subscribe({
      next: (repo) => {
        this._activeRepo.next(repo);
        this.startStatusPolling(repo.path);
        this._loading.next(false);
      },
      error: () => this._loading.next(false),
    });
  }

  openRecentRepository(repo: RepoInfo): void {
    this._activeRepo.next(repo);
    this.startStatusPolling(repo.path);
  }

  private startStatusPolling(repoPath: string): void {
    this.statusSub?.unsubscribe();
    this.statusChangedSub?.unsubscribe();

    this.statusSub = timer(0, 3000)
      .pipe(switchMap(() => this.api.getRepositoryStatus(repoPath)))
      .subscribe((status) => this._status.next(status));

    this.statusChangedSub = this.api.onStatusChanged()
      .subscribe((status) => this._status.next(status));
  }

  refreshStatus(): void {
    const repo = this._activeRepo.value;
    if (!repo) return;
    this.api.getRepositoryStatus(repo.path).subscribe((s) => this._status.next(s));
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
    this.statusChangedSub?.unsubscribe();
  }
}
