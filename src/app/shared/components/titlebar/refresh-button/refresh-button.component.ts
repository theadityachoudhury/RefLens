import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepositoryService } from '../../../../core/services/repository.service';
import { RefreshService } from '../../../../core/services/refresh.service';

@Component({
  selector: 'rl-refresh-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      *ngIf="activeRepo$ | async"
      class="titlebar-btn titlebar-btn--icon"
      (click)="refresh()"
      title="Refresh"
    >
      <span class="icon icon-refresh"></span>
    </button>
  `,
})
export class RefreshButtonComponent {
  readonly activeRepo$ = this.repoService.activeRepo$;

  constructor(
    private repoService: RepositoryService,
    private refreshService: RefreshService,
  ) {}

  refresh(): void {
    this.refreshService.trigger();
  }
}
