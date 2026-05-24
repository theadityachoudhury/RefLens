import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RepositoryService } from '../../core/services/repository.service';
import { ElectronApiService } from '../../core/services/electron-api.service';
import type { RepoInfo } from '../../../../shared/ipc-api.types';

@Component({
  selector: 'rl-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent implements OnInit {
  recentRepos: RepoInfo[] = [];
  loading = false;

  constructor(
    private repoService: RepositoryService,
    private api: ElectronApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getRecentRepositories().subscribe((repos) => (this.recentRepos = repos));
  }

  openRepository(): void {
    this.loading = true;
    this.api.openRepository().subscribe({
      next: (repo) => {
        this.repoService.openRecentRepository(repo);
        this.router.navigate(['/graph']);
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  openRecent(repo: RepoInfo): void {
    this.repoService.openRecentRepository(repo);
    this.router.navigate(['/graph']);
  }
}
