import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Location, NgClass } from '@angular/common';
import { SettingsService } from '../../core/services/settings.service';
import { SettingsAppearanceTabComponent } from './tabs/appearance-tab.component';
import { SettingsGraphTabComponent } from './tabs/graph-tab.component';
import { SettingsEditorTabComponent } from './tabs/editor-tab.component';
import { SettingsGitTabComponent } from './tabs/git-tab.component';
import { SettingsApplicationTabComponent } from './tabs/application-tab.component';
import { SettingsKeyboardTabComponent } from './tabs/keyboard-tab.component';
import { SettingsAboutTabComponent } from './tabs/about-tab.component';

type SettingsTab = 'appearance' | 'graph' | 'editor' | 'git' | 'application' | 'keyboard' | 'about';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'appearance',  label: 'Appearance'  },
  { id: 'graph',       label: 'Graph'       },
  { id: 'editor',      label: 'Editor'      },
  { id: 'git',         label: 'Git'         },
  { id: 'application', label: 'Application' },
  { id: 'keyboard',    label: 'Keyboard'    },
  { id: 'about',       label: 'About'       },
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
    SettingsKeyboardTabComponent,
    SettingsAboutTabComponent,
  ],
  templateUrl: './settings.component.html',
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
