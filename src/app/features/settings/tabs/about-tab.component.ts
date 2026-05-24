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
  templateUrl: './about-tab.component.html',
  styleUrl: './about-tab.component.scss',
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
