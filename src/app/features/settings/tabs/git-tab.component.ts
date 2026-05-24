import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

@Component({
  selector: 'rl-settings-git-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './git-tab.component.html',
  styleUrl: './git-tab.component.scss',
})
export class SettingsGitTabComponent {
  protected readonly s = inject(SettingsService);

  protected readonly refreshOptions: { value: number; label: string }[] = [
    { value: 1000,  label: '1s'     },
    { value: 3000,  label: '3s'     },
    { value: 5000,  label: '5s'     },
    { value: 10000, label: '10s'    },
    { value: 0,     label: 'Manual' },
  ];

  protected readonly recentLimitOptions = [5, 10, 20, 50];
  protected readonly rebaseDepthOptions = [10, 20, 50, 100];

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.s.update({ [key]: value } as Partial<AppSettings>);
  }
}
