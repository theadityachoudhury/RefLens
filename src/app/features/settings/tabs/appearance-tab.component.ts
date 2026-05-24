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
  templateUrl: './appearance-tab.component.html',
  styleUrl: './appearance-tab.component.scss',
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
