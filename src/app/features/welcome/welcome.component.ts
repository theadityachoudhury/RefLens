import { Component, computed, OnInit, signal } from '@angular/core';
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
  recentRepos = signal<RepoInfo[]>([]);
  recentReposLength = computed(() => this.recentRepos().length);
  loading = signal(false);
  repoError = signal<string | null>(null);

  constructor(
    private repoService: RepositoryService,
    private api: ElectronApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.api
      .getRecentRepositories()
      .subscribe((repos) => this.recentRepos.set(repos));
  }

  openRepository(): void {
    this.loading.set(true);
    this.api.openRepository().subscribe({
      next: (repo) => this.openRecent(repo),
      error: (err) => {
        this.loading.set(false);
        this.repoError.set(err.message || 'Failed to open repository');
      },
      complete: () => this.loading.set(false),
    });
  }

  openRecent(repo: RepoInfo): void {
    this.repoError.set(null);
    this.repoService.openRecentRepository(repo);
    this.router.navigate(['/graph']);
  }
}
