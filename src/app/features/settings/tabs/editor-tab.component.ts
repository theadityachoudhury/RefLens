import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

@Component({
  selector: 'rl-settings-editor-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-tab.component.html',
  styleUrl: './editor-tab.component.scss',
})
export class SettingsEditorTabComponent {
  protected readonly s = inject(SettingsService);

  protected readonly diffLayoutOptions: { value: AppSettings['editorDiffLayout']; label: string }[] = [
    { value: 'side-by-side', label: 'Side by Side' },
    { value: 'inline',       label: 'Inline'       },
  ];

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.s.update({ [key]: value } as Partial<AppSettings>);
  }

  toggle(key: 'editorWordWrap' | 'editorLineNumbers' | 'editorMinimap'): void {
    this.s.update({ [key]: !this.s.snapshot[key] } as Partial<AppSettings>);
  }
}
