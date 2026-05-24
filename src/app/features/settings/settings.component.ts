import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Location, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { SettingsAppearanceTabComponent } from './tabs/appearance-tab.component';
import { SettingsGraphTabComponent } from './tabs/graph-tab.component';
import { SettingsEditorTabComponent } from './tabs/editor-tab.component';
import { SettingsGitTabComponent } from './tabs/git-tab.component';
import { SettingsApplicationTabComponent } from './tabs/application-tab.component';

type SettingsTab = 'appearance' | 'graph' | 'editor' | 'git' | 'application';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'appearance',  label: 'Appearance'  },
  { id: 'graph',       label: 'Graph'       },
  { id: 'editor',      label: 'Editor'      },
  { id: 'git',         label: 'Git'         },
  { id: 'application', label: 'Application' },
];

@Component({
  selector: 'rl-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    SettingsAppearanceTabComponent,
    SettingsGraphTabComponent,
    SettingsEditorTabComponent,
    SettingsGitTabComponent,
    SettingsApplicationTabComponent,
  ],
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <button class="settings-header__back btn btn--ghost btn--sm" (click)="back()">
          ← Back
        </button>
        <h1 class="settings-header__title">Settings</h1>
        <button class="btn btn--ghost btn--sm" (click)="resetAll()">Reset to Defaults</button>
      </div>

      <div class="settings-body">
        <nav class="settings-nav">
          @for (tab of tabs; track tab.id) {
            <button
              class="settings-nav__item"
              [class.settings-nav__item--active]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >{{ tab.label }}</button>
          }
        </nav>

        <div class="settings-content">
          @switch (activeTab()) {
            @case ('appearance')  { <rl-settings-appearance-tab  /> }
            @case ('graph')       { <rl-settings-graph-tab       /> }
            @case ('editor')      { <rl-settings-editor-tab      /> }
            @case ('git')         { <rl-settings-git-tab         /> }
            @case ('application') { <rl-settings-application-tab /> }
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly location = inject(Location);
  protected readonly settings = inject(SettingsService);
  protected readonly tabs = TABS;
  protected readonly activeTab = signal<SettingsTab>('appearance');

  back(): void {
    this.location.back();
  }

  resetAll(): void {
    this.settings.reset();
  }
}
