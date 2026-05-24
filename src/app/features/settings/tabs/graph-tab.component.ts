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
  template: `
    <div class="settings-section">
      <h2 class="settings-section__title">Display</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Graph density</div>
          <div class="settings-row__hint">Controls the vertical spacing between commits</div>
        </div>
        <div class="settings-row__control">
          <div class="radio-group">
            @for (opt of densityOptions; track opt.value) {
              <button
                class="radio-group__btn"
                [class.radio-group__btn--active]="s.snapshot.graphDensity === opt.value"
                (click)="set('graphDensity', opt.value)"
              >{{ opt.label }}</button>
            }
          </div>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Commit dot size</div>
          <div class="settings-row__hint">Radius of the dot drawn on each commit node ({{ s.commitRadius() }}px)</div>
        </div>
        <div class="settings-row__control">
          <input
            type="range" min="3" max="8"
            [value]="s.commitRadius()"
            (input)="set('graphCommitDotSize', +$any($event.target).value)"
          />
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Max commits to load</div>
          <div class="settings-row__hint">Higher values may slow down large repositories</div>
        </div>
        <div class="settings-row__control">
          <input
            class="number-input"
            type="number" min="100" max="2000" step="50"
            [value]="s.graphMaxCommits()"
            (change)="set('graphMaxCommits', +$any($event.target).value)"
          />
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Show all branches</div>
          <div class="settings-row__hint">Include all local and remote branches in the graph</div>
        </div>
        <div class="settings-row__control">
          <label class="toggle" [class.toggle--on]="s.graphShowAllBranches()">
            <input type="checkbox" [checked]="s.graphShowAllBranches()" (change)="toggleAllBranches()" />
            <span class="toggle__track"></span>
            <span class="toggle__thumb"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Lane Colors</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Color palette</div>
          <div class="settings-row__hint">Color set used for graph lanes and edges</div>
        </div>
        <div class="settings-row__control">
          <div class="palette-swatches">
            @for (entry of paletteEntries; track entry.id) {
              <button
                class="palette-swatch"
                [class.palette-swatch--active]="s.laneColorPalette() === entry.id"
                (click)="set('graphLaneColorPalette', entry.id)"
              >
                <div class="palette-swatch__dots">
                  @for (color of entry.colors; track color) {
                    <span class="palette-swatch__dot" [style.background]="color"></span>
                  }
                </div>
                <span class="palette-swatch__label">{{ entry.label }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
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
