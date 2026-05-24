import { Component } from '@angular/core';
import { ElectronApiService } from '../../../../core/services/electron-api.service';

@Component({
  selector: 'rl-new-window-button',
  standalone: true,
  templateUrl: './new-window-button.component.html',
  styleUrl: './new-window-button.component.scss',
})
export class NewWindowButtonComponent {
  constructor(private api: ElectronApiService) {}

  newWindow(): void {
    this.api.openNewWindow().subscribe();
  }
}
