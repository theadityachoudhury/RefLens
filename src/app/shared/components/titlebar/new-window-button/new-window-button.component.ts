import { Component } from '@angular/core';
import { ElectronApiService } from '../../../../core/services/electron-api.service';

@Component({
  selector: 'rl-new-window-button',
  standalone: true,
  template: `
    <button class="titlebar-btn titlebar-btn--icon" (click)="newWindow()" title="New Window">
      <span class="icon icon-new-window"></span>
    </button>
  `,
})
export class NewWindowButtonComponent {
  constructor(private api: ElectronApiService) {}

  newWindow(): void {
    this.api.openNewWindow().subscribe();
  }
}
