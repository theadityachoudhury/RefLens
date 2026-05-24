import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'rl-settings-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="titlebar-btn titlebar-btn--icon" (click)="open()" title="Settings (⌘,)">
      <span class="icon icon-settings"></span>
    </button>
  `,
})
export class SettingsButtonComponent {
  private readonly router = inject(Router);

  open(): void {
    this.router.navigate(['/settings']);
  }
}
