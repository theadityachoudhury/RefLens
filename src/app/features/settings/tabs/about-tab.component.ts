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
import { ElectronApiService } from '../../../core/services/electron-api.service';
import { SettingsService } from '../../../core/services/settings.service';
import type { UpdateEvent } from '../../../../../shared/ipc-api.types';

type UpdateState = UpdateEvent['type'] | 'idle';

@Component({
  selector: 'rl-settings-about-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-tab.component.html',
  styleUrl: './about-tab.component.scss',
})
export class SettingsAboutTabComponent implements OnInit, OnDestroy {
  private readonly api     = inject(ElectronApiService);
  private readonly ngZone  = inject(NgZone);
  protected readonly settings = inject(SettingsService);
  private sub?: Subscription;

  protected readonly RELEASES_URL = 'https://github.com/theadityachoudhury/RefLens/releases/latest';

  protected readonly version      = signal('');
  protected readonly updateState  = signal<UpdateState>('idle');
  protected readonly percent      = signal(0);
  protected readonly errorMessage = signal('');

  protected statusHint(): string {
    switch (this.updateState()) {
      case 'checking':      return 'Checking for updates…';
      case 'available':     return 'A new version is ready to download';
      case 'not-available': return 'You are on the latest version';
      case 'downloading':   return `Downloading update (${this.percent()}%)`;
      case 'downloaded':    return 'Update downloaded — restart to apply';
      case 'error':         return this.errorMessage() || 'Could not check for updates';
      default:              return 'Up to date';
    }
  }

  ngOnInit(): void {
    this.api.getAppVersion().subscribe((v) => this.version.set(v));
    this.sub = this.api.onUpdateEvent().subscribe((event) => {
      this.ngZone.run(() => {
        if (this.updateState() === 'downloaded' && event.type === 'error') return;
        this.updateState.set(event.type);
        if (event.type === 'downloading') this.percent.set(Math.round(event.percent));
        if (event.type === 'error') this.errorMessage.set(event.message);
      });
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
