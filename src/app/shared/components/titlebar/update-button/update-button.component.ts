import {
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectronApiService } from '../../../../core/services/electron-api.service';
import { SettingsService } from '../../../../core/services/settings.service';
import type { UpdateEvent } from '../../../../../../shared/ipc-api.types';

type UpdateState = UpdateEvent['type'] | 'idle';

@Component({
  selector: 'rl-update-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './update-button.component.html',
  styleUrl: './update-button.component.scss',
})
export class UpdateButtonComponent implements OnInit, OnDestroy {
  private readonly api      = inject(ElectronApiService);
  private readonly ngZone   = inject(NgZone);
  protected readonly settings = inject(SettingsService);
  private sub?: Subscription;

  protected readonly state   = signal<UpdateState>('idle');
  protected readonly percent = signal(0);

  protected readonly RELEASES_URL = 'https://github.com/theadityachoudhury/RefLens/releases/latest';

  ngOnInit(): void {
    this.sub = this.api.onUpdateEvent().subscribe((event) => {
      this.ngZone.run(() => {
        if (this.state() === 'downloaded' && event.type === 'error') return;
        this.state.set(event.type);
        if (event.type === 'downloading') this.percent.set(Math.round(event.percent));
      });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  download(): void {
    this.api.downloadUpdate().subscribe();
  }

  install(): void {
    if (this.settings.isMac()) {
      this.api.openExternal(this.RELEASES_URL).subscribe();
    } else {
      this.api.installUpdate().subscribe();
    }
  }
}
