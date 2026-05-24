import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

type Theme = AppSettings['theme'];
type FontSize = AppSettings['uiFontSize'];
type AccentColor = AppSettings['accentColor'];

@Component({
  selector: 'rl-settings-appearance-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2 class="settings-section__title">Theme</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Color theme</div>
          <div class="settings-row__hint">
            Controls the overall look of the application
          </div>
        </div>
        <div class="settings-row__control">
          <div class="radio-group">
            @for (opt of themeOptions; track opt.value) {
              <button
                class="radio-group__btn"
                [class.radio-group__btn--active]="s.theme() === opt.value"
                (click)="set('theme', opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Accent color</div>
          <div class="settings-row__hint">
            Used for selections, active states, and interactive elements
          </div>
        </div>
        <div class="settings-row__control">
          <div class="color-swatches">
            @for (swatch of accentSwatches; track swatch.value) {
              <button
                class="color-swatch"
                [class.color-swatch--active]="
                  s.snapshot.accentColor === swatch.value
                "
                [style.background]="swatch.color"
                [title]="swatch.label"
                (click)="set('accentColor', swatch.value)"
              ></button>
            }
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Typography</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">UI font size</div>
          <div class="settings-row__hint">
            Applies to all text in the application interface
          </div>
        </div>
        <div class="settings-row__control">
          <div class="radio-group">
            @for (opt of fontSizeOptions; track opt.value) {
              <button
                class="radio-group__btn"
                [class.radio-group__btn--active]="
                  s.snapshot.uiFontSize === opt.value
                "
                (click)="set('uiFontSize', opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsAppearanceTabComponent {
  protected readonly s = inject(SettingsService);

  protected readonly themeOptions: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ];

  protected readonly fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Small (13px)' },
    { value: 'medium', label: 'Medium (14px)' },
    { value: 'large', label: 'Large (16px)' },
  ];

  protected readonly accentSwatches: {
    value: AccentColor;
    label: string;
    color: string;
  }[] = [
    { value: 'blue', label: 'Blue', color: '#58a6ff' },
    { value: 'purple', label: 'Purple', color: '#d2a8ff' },
    { value: 'green', label: 'Green', color: '#3fb950' },
    { value: 'teal', label: 'Teal', color: '#4fc1e9' },
    { value: 'pink', label: 'Pink', color: '#ff7b9c' },
  ];

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.s.update({ [key]: value } as Partial<AppSettings>);
  }
}
