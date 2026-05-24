import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ElectronApiService } from './core/services/electron-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="titlebar">
      <button class="titlebar__new-window" (click)="newWindow()" title="New Window">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M1 1h4v1H2v8h8V7h1v4H1V1zm5 0h5v5h-1V2.707L5.354 7.354l-.708-.708L9.293 2H6V1z"/>
        </svg>
      </button>
    </div>
    <div class="content"><router-outlet /></div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private api: ElectronApiService) {}

  newWindow(): void {
    this.api.openNewWindow().subscribe();
  }
}
