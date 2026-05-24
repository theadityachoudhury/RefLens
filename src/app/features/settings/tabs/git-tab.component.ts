import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

@Component({
  selector: 'rl-settings-git-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2 class="settings-section__title">Status Monitoring</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Auto-refresh interval</div>
          <div class="settings-row__hint">How often to poll the repository for status changes</div>
        </div>
        <div class="settings-row__control">
          <div class="segmented">
            @for (opt of refreshOptions; track opt.value) {
              <button
                class="segmented__btn"
                [class.segmented__btn--active]="s.refreshInterval() === opt.value"
                (click)="set('statusRefreshInterval', opt.value)"
              >{{ opt.label }}</button>
            }
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">History</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Recent repositories limit</div>
          <div class="settings-row__hint">Maximum number of recent repositories to remember</div>
        </div>
        <div class="settings-row__control">
          <select
            class="settings-select"
            [value]="s.snapshot.recentReposLimit"
            (change)="set('recentReposLimit', +$any($event.target).value)"
          >
            @for (opt of recentLimitOptions; track opt) {
              <option [value]="opt">{{ opt }} repositories</option>
            }
          </select>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Interactive rebase depth</div>
          <div class="settings-row__hint">Number of commits to show in the rebase commit list</div>
        </div>
        <div class="settings-row__control">
          <select
            class="settings-select"
            [value]="s.snapshot.rebaseDepth"
            (change)="set('rebaseDepth', +$any($event.target).value)"
          >
            @for (opt of rebaseDepthOptions; track opt) {
              <option [value]="opt">{{ opt }} commits</option>
            }
          </select>
        </div>
      </div>
    </div>
  `,
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
