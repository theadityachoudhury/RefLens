import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EditorPickerComponent } from './shared/components/titlebar/editor-picker/editor-picker.component';
import { RefreshButtonComponent } from './shared/components/titlebar/refresh-button/refresh-button.component';
import { NewWindowButtonComponent } from './shared/components/titlebar/new-window-button/new-window-button.component';
import { SettingsButtonComponent } from './shared/components/titlebar/settings-button/settings-button.component';
import { RepositoryService } from './core/services/repository.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    EditorPickerComponent,
    RefreshButtonComponent,
    NewWindowButtonComponent,
    SettingsButtonComponent,
  ],
  template: `
    <div class="titlebar">
      <div class="titlebar__actions">
        <rl-editor-picker />
        <rl-refresh-button />
        <rl-new-window-button />
        <rl-settings-button />
      </div>
    </div>
    <div class="content"><router-outlet /></div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly repoService = inject(RepositoryService);

  ngOnInit(): void {
    this.repoService.tryRestoreLastRepo();
  }
}
