import { Injectable, Injector, NgZone, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Subscription,
  filter,
  switchMap,
  take,
  timer,
} from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { ElectronApiService } from './electron-api.service';
import { SettingsService } from './settings.service';
import type { RepoInfo } from '../../../../shared/ipc-api.types';
import type { RepositoryStatus } from '../../../../shared/git.types';

@Injectable({ providedIn: 'root' })
export class RepositoryService implements OnDestroy {
  private readonly api = inject(ElectronApiService);
  private readonly settings = inject(SettingsService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly _activeRepo = new BehaviorSubject<RepoInfo | null>(null);
  readonly activeRepo$ = this._activeRepo.asObservable();

  private readonly _status = new BehaviorSubject<RepositoryStatus | null>(null);
  readonly status$ = this._status.asObservable();

  private readonly _loading = new BehaviorSubject(false);
  readonly loading$ = this._loading.asObservable();

  private statusSub: Subscription | null = null;
  private statusChangedSub: Subscription | null = null;

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

  tryRestoreLastRepo(): void {
    // Gate on settings.ready$ so the restoreLastRepo flag is read from persisted
    // settings, not DEFAULT_SETTINGS (which has it false). Safe to call at any
    // time — the ready$ ReplaySubject replays immediately if settings are loaded.
    this.settings.ready$.pipe(
      take(1),
      filter(() => this.settings.restoreLastRepo()),
      switchMap(() => this.api.getRecentRepositories()),
    ).subscribe((repos) => {
      if (repos[0]) {
        this.openRecentRepository(repos[0]);
        this.router.navigate(['/graph']);
      }
    });
  }

  private startStatusPolling(repoPath: string): void {
    this.statusSub?.unsubscribe();
    this.statusChangedSub?.unsubscribe();

    this.statusSub = toObservable(this.settings.refreshInterval, { injector: this.injector }).pipe(
      switchMap((interval) => {
        if (interval === 0) {
          // No periodic polling requested — fetch status once immediately.
          return this.api.getRepositoryStatus(repoPath);
        }
        // Poll on an interval, with an immediate first tick.
        return timer(0, interval).pipe(
          switchMap(() => this.api.getRepositoryStatus(repoPath)),
        );
      }),
    ).subscribe((status) => this._status.next(status));

    this.api.watchRepository(repoPath).subscribe();

    this.statusChangedSub = this.api.onStatusChanged()
      .subscribe((status) => this.ngZone.run(() => this._status.next(status)));
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
