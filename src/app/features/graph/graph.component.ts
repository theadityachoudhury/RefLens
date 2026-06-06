import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, distinctUntilChanged, map, skip, takeUntil } from 'rxjs';
import { ElectronApiService } from '../../core/services/electron-api.service';
import { RepositoryService } from '../../core/services/repository.service';
import { RefreshService } from '../../core/services/refresh.service';
import { SettingsService } from '../../core/services/settings.service';
import { ShortcutService } from '../../core/services/shortcut.service';
import { CanvasRendererService } from './canvas-renderer.service';
import { CommitGraph } from '../../../../shared/commit-graph';
import type { CommitNode, BranchInfo, DiffFile } from '../../../../shared/git.types';

@Component({
  selector: 'rl-graph',
  standalone: true,
  imports: [CommonModule],
  providers: [CanvasRendererService],
  templateUrl: './graph.component.html',
  styleUrl: './graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;

  graph: CommitGraph | null = null;
  branches: BranchInfo[] = [];
  selectedCommit: CommitNode | null = null;
  commitFiles: (DiffFile & { status: string })[] | null = null;
  commitBody: string | null = null;
  detailLoading = false;
  cherryPickQueue: CommitNode[] = [];
  loading = true;

  private destroy$ = new Subject<void>();
  private resizeObserver!: ResizeObserver;

  constructor(
    private api: ElectronApiService,
    public repoService: RepositoryService,
    public renderer: CanvasRendererService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private refreshService: RefreshService,
    private settingsService: SettingsService,
    private shortcutService: ShortcutService,
  ) {}

  get repoPath(): string {
    return this.repoService.activeRepo?.path ?? '';
  }

  ngOnInit(): void {
    this.loadGraph();
    this.loadBranches();

    this.repoService.status$.pipe(takeUntil(this.destroy$)).subscribe((status) => {
      if (status?.conflicted.length && (status.isMerging || status.isCherryPicking)) {
        this.router.navigate(['/conflicts']);
      }
    });

    // Reload graph when HEAD or branch changes externally (terminal branch switch, new commit, etc.)
    this.repoService.status$.pipe(
      takeUntil(this.destroy$),
      map((s) => `${s?.headHash ?? ''}:${s?.currentBranch ?? ''}`),
      distinctUntilChanged(),
      skip(1), // skip the initial BehaviorSubject replay — already loading on init
    ).subscribe(() => this.refreshGraph());

    this.refreshService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshGraph());

    // Escape: close detail panel if open, otherwise handled by AppComponent
    this.shortcutService.goBack$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.selectedCommit) {
        this.closeDetail();
      }
    });


    this.renderer.commitClick$.pipe(takeUntil(this.destroy$)).subscribe(({ commit, ctrlOrCmd }) => {
      if (ctrlOrCmd) {
        this.toggleCherryPick(commit);
      } else {
        this.selectCommit(commit);
      }
    });
  }

  ngAfterViewInit(): void {
    this.renderer.initialize(this.canvasRef.nativeElement);

    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this.renderer.setViewportSize(width, height);
    });
    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }

  private loadGraph(): void {
    this.loading = true;
    this.api.getCommitGraph(this.repoPath, {
      maxCount: this.settingsService.graphMaxCommits(),
      allBranches: this.settingsService.graphShowAllBranches(),
    }).subscribe({
      next: (commits) => {
        this.graph = CommitGraph.from(commits);
        this.loading = false;
        this.cdr.markForCheck();
        setTimeout(() => this.renderer.render(this.graph!, this.selectedCommit?.hash ?? null));
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
    this.commitFiles = null;
    this.commitBody = null;
    this.detailLoading = true;
    this.renderer.selectCommit(commit.hash);
    this.cdr.markForCheck();

    this.api.getCommitDetail(this.repoPath, commit.hash).subscribe({
      next: (detail) => {
        this.commitFiles = detail.diff as (DiffFile & { status: string })[];
        this.commitBody = detail.body || null;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetail(): void {
    this.selectedCommit = null;
    this.commitFiles = null;
    this.commitBody = null;
    this.renderer.selectCommit(null);
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
