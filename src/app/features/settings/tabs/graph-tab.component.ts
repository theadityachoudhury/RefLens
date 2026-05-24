import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

const PALETTES: Record<AppSettings['graphLaneColorPalette'], string[]> = {
  github:     ['#58a6ff', '#3fb950', '#f78166', '#d2a8ff', '#ffa657'],
  dracula:    ['#bd93f9', '#50fa7b', '#ff5555', '#ffb86c', '#8be9fd'],
  solarized:  ['#268bd2', '#859900', '#dc322f', '#b58900', '#2aa198'],
  monochrome: ['#8b949e', '#6e7681', '#c9d1d9', '#484f58', '#e6edf3'],
};

@Component({
  selector: 'rl-settings-graph-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './graph-tab.component.html',
  styleUrl: './graph-tab.component.scss',
})
export class SettingsGraphTabComponent {
  protected readonly s = inject(SettingsService);

  protected readonly densityOptions: { value: AppSettings['graphDensity']; label: string }[] = [
    { value: 'compact',  label: 'Compact'  },
    { value: 'normal',   label: 'Normal'   },
    { value: 'spacious', label: 'Spacious' },
  ];

  protected readonly paletteEntries = Object.entries(PALETTES).map(([id, colors]) => ({
    id: id as AppSettings['graphLaneColorPalette'],
    label: id.charAt(0).toUpperCase() + id.slice(1),
    colors: colors.slice(0, 5),
  }));

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.s.update({ [key]: value } as Partial<AppSettings>);
  }

  toggleAllBranches(): void {
    this.s.update({ graphShowAllBranches: !this.s.graphShowAllBranches() });
  }
}
