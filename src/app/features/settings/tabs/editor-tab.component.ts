import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { AppSettings } from '../../../../../shared/settings.types';

@Component({
  selector: 'rl-settings-editor-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <h2 class="settings-section__title">Monaco Editor</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Font size</div>
          <div class="settings-row__hint">Applies to conflict viewer and resolution preview editors</div>
        </div>
        <div class="settings-row__control">
          <input
            class="number-input"
            type="number" min="10" max="18"
            [value]="s.editorFontSize()"
            (change)="set('editorFontSize', +$any($event.target).value)"
          />
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Word wrap</div>
          <div class="settings-row__hint">Wrap long lines in the editor</div>
        </div>
        <div class="settings-row__control">
          <label class="toggle" [class.toggle--on]="s.editorWordWrap()">
            <input type="checkbox" [checked]="s.editorWordWrap()" (change)="toggle('editorWordWrap')" />
            <span class="toggle__track"></span>
            <span class="toggle__thumb"></span>
          </label>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Line numbers</div>
          <div class="settings-row__hint">Show line numbers in the editor gutter</div>
        </div>
        <div class="settings-row__control">
          <label class="toggle" [class.toggle--on]="s.editorLineNumbers()">
            <input type="checkbox" [checked]="s.editorLineNumbers()" (change)="toggle('editorLineNumbers')" />
            <span class="toggle__track"></span>
            <span class="toggle__thumb"></span>
          </label>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Minimap</div>
          <div class="settings-row__hint">Show the minimap overview on the right side of the editor</div>
        </div>
        <div class="settings-row__control">
          <label class="toggle" [class.toggle--on]="s.editorMinimap()">
            <input type="checkbox" [checked]="s.editorMinimap()" (change)="toggle('editorMinimap')" />
            <span class="toggle__track"></span>
            <span class="toggle__thumb"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Diff View</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Diff layout</div>
          <div class="settings-row__hint">How changes are displayed in the resolution preview</div>
        </div>
        <div class="settings-row__control">
          <div class="radio-group">
            @for (opt of diffLayoutOptions; track opt.value) {
              <button
                class="radio-group__btn"
                [class.radio-group__btn--active]="s.editorDiffLayout() === opt.value"
                (click)="set('editorDiffLayout', opt.value)"
              >{{ opt.label }}</button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
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
