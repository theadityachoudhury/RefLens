import { Injectable, computed, inject, signal } from '@angular/core';
import { ElectronApiService } from './electron-api.service';
import { AppSettings, DEFAULT_SETTINGS } from '../../../../shared/settings.types';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ElectronApiService);
  private readonly _settings = signal<AppSettings>(DEFAULT_SETTINGS);

  // Computed selectors
  readonly theme             = computed(() => this._settings().theme);
  readonly monacoTheme       = computed(() => this.resolvedTheme() === 'light' ? 'vs' : 'vs-dark');
  readonly rowHeight         = computed(() => ({ compact: 22, normal: 28, spacious: 36 })[this._settings().graphDensity]);
  readonly commitRadius      = computed(() => this._settings().graphCommitDotSize);
  readonly laneColorPalette  = computed(() => this._settings().graphLaneColorPalette);
  readonly graphMaxCommits   = computed(() => this._settings().graphMaxCommits);
  readonly graphShowAllBranches = computed(() => this._settings().graphShowAllBranches);
  readonly editorFontSize    = computed(() => this._settings().editorFontSize);
  readonly editorWordWrap    = computed(() => this._settings().editorWordWrap);
  readonly editorLineNumbers = computed(() => this._settings().editorLineNumbers);
  readonly editorMinimap     = computed(() => this._settings().editorMinimap);
  readonly editorDiffLayout  = computed(() => this._settings().editorDiffLayout);
  readonly refreshInterval   = computed(() => this._settings().statusRefreshInterval);
  readonly restoreLastRepo   = computed(() => this._settings().restoreLastRepo);
  readonly autoStage         = computed(() => this._settings().autoStageAfterResolve);

  private readonly _sysDark = window.matchMedia('(prefers-color-scheme: dark)');

  readonly resolvedTheme = computed<'dark' | 'light'>(() => {
    const t = this._settings().theme;
    if (t !== 'system') return t;
    return this._sysDark.matches ? 'dark' : 'light';
  });

  constructor() {
    this.api.getSettings().subscribe(s => {
      this._settings.set(s);
      this.applyToDOM(s);
    });

    this._sysDark.addEventListener('change', () => this.applyToDOM(this._settings()));
  }

  get snapshot(): AppSettings {
    return this._settings();
  }

  update(patch: Partial<AppSettings>): void {
    this.api.setSettings(patch).subscribe(updated => {
      this._settings.set(updated);
      this.applyToDOM(updated);
    });
  }

  reset(): void {
    this.api.resetSettings().subscribe(updated => {
      this._settings.set(updated);
      this.applyToDOM(updated);
    });
  }

  private applyToDOM(s: AppSettings): void {
    const isDark = s.theme === 'dark' ||
      (s.theme === 'system' && this._sysDark.matches);

    document.body.classList.toggle('theme-light', !isDark);

    // Accent classes
    (['purple', 'green', 'teal', 'pink'] as const).forEach(c =>
      document.body.classList.remove(`accent-${c}`),
    );
    if (s.accentColor !== 'blue') {
      document.body.classList.add(`accent-${s.accentColor}`);
    }

    // Font size class
    (['small', 'medium', 'large'] as const).forEach(c =>
      document.body.classList.remove(`font-${c}`),
    );
    document.body.classList.add(`font-${s.uiFontSize}`);

    // Monaco global theme
    const monaco = (window as unknown as { monaco?: { editor: { setTheme(t: string): void } } }).monaco;
    monaco?.editor.setTheme(isDark ? 'vs-dark' : 'vs');
  }
}
