import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsService } from '../../../../core/services/settings.service';
import { displayCombo } from '../../../../core/services/shortcut.service';

@Component({
  selector: 'rl-settings-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="titlebar-btn titlebar-btn--icon" (click)="open()" [title]="title()">
      <span class="icon icon-settings"></span>
    </button>
  `,
})
export class SettingsButtonComponent {
  private readonly router   = inject(Router);
  private readonly settings = inject(SettingsService);

  protected readonly title = computed(() => {
    const combo = this.settings.snapshot.keyboardShortcuts.openSettings;
    const label = displayCombo(combo, this.settings.isMac());
    return `Settings (${label})`;
  });

  open(): void {
    this.router.navigate(['/settings']);
  }
}
