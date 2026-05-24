import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConflictService } from './conflict.service';
import { RepositoryService } from '../../core/services/repository.service';

@Component({
  selector: 'rl-conflict-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conflict-list.component.html',
  styleUrl: './conflict-list.component.scss',
})
export class ConflictListComponent implements OnInit {
  constructor(
    public conflictService: ConflictService,
    public repoService: RepositoryService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.conflictService.load();
  }

  openFile(index: number): void {
    this.router.navigate(['/conflicts/resolve', index]);
  }

  isResolved(path: string): boolean {
    return this.conflictService.resolvedMap()[path] !== undefined;
  }

  abort(): void {
    this.conflictService.abort();
    this.router.navigate(['/graph']);
  }

  completeMerge(): void {
    const msg = `Merge branch '${this.repoService.currentStatus?.currentBranch ?? ''}'`;
    this.conflictService.completeMerge(msg);
    this.router.navigate(['/graph']);
  }
}
