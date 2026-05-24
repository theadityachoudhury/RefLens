import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronApiService } from '../../../../core/services/electron-api.service';
import type { UpdateEvent } from '../../../../../../shared/ipc-api.types';

type UpdateState = UpdateEvent['type'] | 'idle';

@Component({
  selector: 'rl-update-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state() === 'available') {
      <button class="titlebar-btn titlebar-btn--icon update-btn" (click)="download()" title="Update available — click to download">
        <span class="icon icon-update"></span>
      </button>
    } @else if (state() === 'downloading') {
      <button class="titlebar-btn titlebar-btn--icon update-btn update-btn--progress" disabled [title]="'Downloading update… ' + percent() + '%'">
        <span class="update-btn__percent">{{ percent() }}%</span>
      </button>
    } @else if (state() === 'downloaded') {
      <button class="titlebar-btn titlebar-btn--icon update-btn update-btn--ready" (click)="install()" title="Restart to install update">
        <span class="icon icon-update"></span>
      </button>
    }
  `,
  styles: [`
    .update-btn {
      color: var(--accent);
    }
    .update-btn--ready {
      animation: update-pulse 2s ease-in-out infinite;
    }
    .update-btn__percent {
      font-size: 9px;
      font-weight: 600;
      line-height: 1;
      color: var(--accent);
    }
    @keyframes update-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
  `],
})
export class UpdateButtonComponent implements OnInit, OnDestroy {
  private readonly api = inject(ElectronApiService);
  private sub?: Subscription;

  protected readonly state = signal<UpdateState>('idle');
  protected readonly percent = signal(0);

  ngOnInit(): void {
    this.sub = this.api.onUpdateEvent().subscribe((event) => {
      this.state.set(event.type);
      if (event.type === 'downloading') this.percent.set(Math.round(event.percent));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  download(): void {
    this.api.downloadUpdate().subscribe();
  }

  install(): void {
    this.api.installUpdate().subscribe();
  }
}
