import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

@Component({
  selector: 'rl-settings-application-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './application-tab.component.html',
  styleUrl: './application-tab.component.scss',
})
export class SettingsApplicationTabComponent {
  protected readonly s = inject(SettingsService);

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.s.update({ [key]: value } as Partial<AppSettings>);
  }

  toggle(key: 'restoreLastRepo' | 'openDevTools' | 'autoStageAfterResolve'): void {
    this.s.update({ [key]: !this.s.snapshot[key] } as Partial<AppSettings>);
  }
}
