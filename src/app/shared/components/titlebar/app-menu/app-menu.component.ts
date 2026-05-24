import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ElectronApiService } from '../../../../core/services/electron-api.service';
import { SettingsService } from '../../../../core/services/settings.service';

type MenuEntry =
  | { kind: 'separator' }
  | { kind: 'item'; label: string; shortcut?: string; action: () => void };

interface AppMenu {
  label: string;
  items: MenuEntry[];
}

@Component({
  selector: 'rl-app-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-menu.component.html',
  styleUrl: './app-menu.component.scss',
})
export class AppMenuComponent {
  protected readonly settings = inject(SettingsService);
  private readonly api = inject(ElectronApiService);

  protected readonly openMenu = signal<string | null>(null);

  protected readonly menus: AppMenu[] = [
    {
      label: 'File',
      items: [
        {
          kind: 'item',
          label: 'New Window',
          shortcut: 'Ctrl+N',
          action: () => this.api.openNewWindow().subscribe(),
        },
      ],
    },
    {
      label: 'Edit',
      items: [
        { kind: 'item', label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { kind: 'item', label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
        { kind: 'separator' },
        { kind: 'item', label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
        { kind: 'item', label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { kind: 'item', label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
        { kind: 'item', label: 'Select All', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') },
      ],
    },
  ];

  protected toggle(event: MouseEvent, label: string): void {
    event.stopPropagation();
    this.openMenu.update(current => current === label ? null : label);
  }

  protected run(entry: MenuEntry): void {
    if (entry.kind === 'item') entry.action();
    this.openMenu.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenu.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenu.set(null);
  }
}
