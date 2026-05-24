import { Component, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { EditorPickerComponent } from './shared/components/titlebar/editor-picker/editor-picker.component';
import { RefreshButtonComponent } from './shared/components/titlebar/refresh-button/refresh-button.component';
import { NewWindowButtonComponent } from './shared/components/titlebar/new-window-button/new-window-button.component';
import { SettingsButtonComponent } from './shared/components/titlebar/settings-button/settings-button.component';
import { RepositoryService } from './core/services/repository.service';
import { SettingsService } from './core/services/settings.service';
import { ShortcutService } from './core/services/shortcut.service';

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
  private readonly settings    = inject(SettingsService);
  private readonly shortcuts   = inject(ShortcutService);
  private readonly location    = inject(Location);
  private readonly router      = inject(Router);

  ngOnInit(): void {
    // Wait for persisted settings before checking restoreLastRepo.
    // Without this gate, the signal still holds DEFAULT_SETTINGS
    // (restoreLastRepo: false) and the restore is silently skipped.
    this.settings.ready$.pipe(take(1)).subscribe(() => {
      this.repoService.tryRestoreLastRepo();
    });

    // Fallback goBack handler: only fires when no child component consumed the event.
    // graph page handles its own (close detail panel first); other pages just go back.
    this.shortcuts.goBack$.subscribe(() => {
      const url = this.router.url;
      if (url === '/' || url === '/graph') return;
      this.location.back();
    });
  }
}
