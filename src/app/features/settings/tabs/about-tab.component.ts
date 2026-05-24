import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronApiService } from '../../../core/services/electron-api.service';
import type { UpdateEvent } from '../../../../../shared/ipc-api.types';

type UpdateState = UpdateEvent['type'] | 'idle';

@Component({
  selector: 'rl-settings-about-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2 class="settings-section__title">Application</h2>

      <div class="about-hero">
        <div class="about-hero__name">RefLens</div>
        <div class="about-hero__version">v{{ version() || '…' }}</div>
        <div class="about-hero__desc">Git Visualizer — visual merge conflicts, rebase, cherry-pick</div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Source code</div>
          <div class="settings-row__hint">View the project on GitHub</div>
        </div>
        <div class="settings-row__control">
          <button class="btn btn--ghost btn--sm" (click)="open('https://github.com/theadityachoudhury/RefLens')">
            GitHub ↗
          </button>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Report an issue</div>
          <div class="settings-row__hint">Found a bug? Open a GitHub issue</div>
        </div>
        <div class="settings-row__control">
          <button class="btn btn--ghost btn--sm" (click)="open('https://github.com/theadityachoudhury/RefLens/issues/new')">
            Open issue ↗
          </button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Updates</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Software update</div>
          <div class="settings-row__hint">{{ statusHint() }}</div>
        </div>
        <div class="settings-row__control">
          @if (updateState() === 'downloaded') {
            <button class="btn btn--accent btn--sm" (click)="install()">Restart &amp; Install</button>
          } @else if (updateState() === 'downloading') {
            <button class="btn btn--ghost btn--sm" disabled>Downloading {{ percent() }}%…</button>
          } @else if (updateState() === 'available') {
            <button class="btn btn--accent btn--sm" (click)="download()">Download Update</button>
          } @else {
            <button class="btn btn--ghost btn--sm" [disabled]="updateState() === 'checking'" (click)="check()">
              {{ updateState() === 'checking' ? 'Checking…' : 'Check for Updates' }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .about-hero {
      padding: 1.5rem 0 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      &__name {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      &__version {
        font-size: 0.8125rem;
        color: var(--text-muted);
        font-family: monospace;
      }
      &__desc {
        font-size: 0.8125rem;
        color: var(--text-muted);
        margin-top: 0.125rem;
      }
    }

    .btn--accent {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.35rem 0.75rem;
      font-family: inherit;
      transition: opacity 0.12s;
      &:hover { opacity: 0.85; }
      &--sm { padding: 0.25rem 0.6rem; font-size: 0.75rem; }
    }

    button[disabled] { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SettingsAboutTabComponent implements OnInit, OnDestroy {
  private readonly api = inject(ElectronApiService);
  private sub?: Subscription;

  protected readonly version     = signal('');
  protected readonly updateState = signal<UpdateState>('idle');
  protected readonly percent     = signal(0);

  protected statusHint(): string {
    switch (this.updateState()) {
      case 'checking':      return 'Checking for updates…';
      case 'available':     return 'A new version is ready to download';
      case 'not-available': return 'You are on the latest version';
      case 'downloading':   return `Downloading update (${this.percent()}%)`;
      case 'downloaded':    return 'Update downloaded — restart to apply';
      case 'error':         return 'Could not check for updates';
      default:              return 'Up to date';
    }
  }

  ngOnInit(): void {
    this.api.getAppVersion().subscribe((v) => this.version.set(v));
    this.sub = this.api.onUpdateEvent().subscribe((event) => {
      this.updateState.set(event.type);
      if (event.type === 'downloading') this.percent.set(Math.round(event.percent));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  check(): void    { this.api.checkForUpdate().subscribe(); }
  download(): void { this.api.downloadUpdate().subscribe(); }
  install(): void  { this.api.installUpdate().subscribe(); }
  open(url: string): void { this.api.openExternal(url).subscribe(); }
}
