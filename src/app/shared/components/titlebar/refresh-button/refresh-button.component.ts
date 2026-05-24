import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RepositoryService } from '../../../../core/services/repository.service';
import { RefreshService } from '../../../../core/services/refresh.service';

@Component({
  selector: 'rl-refresh-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './refresh-button.component.html',
  styleUrl: './refresh-button.component.scss',
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
