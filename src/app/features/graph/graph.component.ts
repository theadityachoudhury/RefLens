import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, switchMap, combineLatest } from 'rxjs';
import { ElectronApiService } from '../../core/services/electron-api.service';
import { RepositoryService } from '../../core/services/repository.service';
import { GraphRendererService } from './graph-renderer.service';
import type { CommitNode, BranchInfo } from '../../../../shared/git.types';

@Component({
  selector: 'rl-graph',
  standalone: true,
  imports: [CommonModule],
  providers: [GraphRendererService],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('svgEl') svgRef!: ElementRef<SVGSVGElement>;

  commits: CommitNode[] = [];
  branches: BranchInfo[] = [];
  selectedCommit: CommitNode | null = null;
  cherryPickQueue: CommitNode[] = [];
  loading = true;

  private destroy$ = new Subject<void>();
  private resizeObserver!: ResizeObserver;

  constructor(
    private api: ElectronApiService,
    public repoService: RepositoryService,
    public renderer: GraphRendererService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  get repoPath(): string {
    return this.repoService.activeRepo?.path ?? '';
  }

  ngOnInit(): void {
    this.loadGraph();
    this.loadBranches();

    // Navigate to conflicts if repo enters conflicted state
    this.repoService.status$.pipe(takeUntil(this.destroy$)).subscribe((status) => {
      if (status?.conflicted.length && (status.isMerging || status.isCherryPicking)) {
        this.router.navigate(['/conflicts']);
      }
    });

    // Respond to commit clicks from D3
    this.renderer.commitClick$.pipe(takeUntil(this.destroy$)).subscribe(({ commit, ctrlOrCmd }) => {
      if (ctrlOrCmd) {
        this.toggleCherryPick(commit);
      } else {
        this.selectCommit(commit);
      }
    });
  }

  ngAfterViewInit(): void {
    this.renderer.initialize(this.svgRef.nativeElement);

    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this.renderer.setViewportSize(width, height);
    });
    this.resizeObserver.observe(this.svgRef.nativeElement);
  }

  private loadGraph(): void {
    this.loading = true;
    this.api.getCommitGraph(this.repoPath, { maxCount: 500, allBranches: true }).subscribe({
      next: (commits) => {
        this.commits = commits;
        this.loading = false;
        this.cdr.markForCheck();
        // Render after view update
        setTimeout(() => this.renderer.render(commits, this.selectedCommit?.hash ?? null));
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadBranches(): void {
    this.api.getBranches(this.repoPath).subscribe((branches) => {
      this.branches = branches;
      this.cdr.markForCheck();
    });
  }

  selectCommit(commit: CommitNode): void {
    this.selectedCommit = commit;
    this.renderer.selectCommit(commit.hash);
    this.cdr.markForCheck();
  }

  toggleCherryPick(commit: CommitNode): void {
    const idx = this.cherryPickQueue.findIndex((c) => c.hash === commit.hash);
    if (idx === -1) this.cherryPickQueue.push(commit);
    else this.cherryPickQueue.splice(idx, 1);
    this.cdr.markForCheck();
  }

  navigateToCherryPick(): void {
    this.router.navigate(['/cherry-pick'], { state: { queue: this.cherryPickQueue } });
  }

  checkoutBranch(name: string): void {
    this.api.checkoutBranch(this.repoPath, name).subscribe(() => {
      this.loadGraph();
      this.loadBranches();
      this.repoService.refreshStatus();
    });
  }

  refreshGraph(): void {
    this.loadGraph();
    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
  }
}
