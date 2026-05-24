import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MonacoEditorModule, DiffEditorModel } from 'ngx-monaco-editor-v2';
import { ConflictService, ResolutionOption } from './conflict.service';
import { ElectronApiService } from '../../core/services/electron-api.service';
import { RepositoryService } from '../../core/services/repository.service';
import { SettingsService } from '../../core/services/settings.service';
import type { ConflictFile, WorktreeInfo } from '../../../../shared/git.types';

@Component({
  selector: 'rl-resolution-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule],
  templateUrl: './resolution-preview.component.html',
  styleUrl: './resolution-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolutionPreviewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ElectronApiService);
  private repoService = inject(RepositoryService);
  public conflictService = inject(ConflictService);
  private settings = inject(SettingsService);

  fileIndex = signal(0);
  option = signal<ResolutionOption>('acceptCurrent');
  resolvedContent = signal('');
  isManual = signal(false);

  // Monaco diff models (before → after)
  originalModel = signal<DiffEditorModel>({ code: '', language: 'plaintext' });
  modifiedModel = signal<DiffEditorModel>({ code: '', language: 'plaintext' });

  // Run & Test state
  runCommand = signal('');
  processOutput = signal<string[]>([]);
  isRunning = signal(false);
  activeWorktree = signal<WorktreeInfo | null>(null);
  worktreeLoading = signal(false);
  processId = `preview-${Date.now()}`;

  file = computed<ConflictFile | null>(() => {
    const files = this.conflictService.files();
    return files[this.fileIndex()] ?? null;
  });

  get diffEditorOptions() {
    return {
      theme: this.settings.monacoTheme(),
      readOnly: true,
      renderSideBySide: this.settings.editorDiffLayout() === 'side-by-side',
      minimap: { enabled: this.settings.editorMinimap() },
      fontSize: this.settings.editorFontSize(),
      scrollBeyondLastLine: false,
      enableSplitViewResizing: true,
    };
  }

  get manualEditorOptions() {
    return {
      theme: this.settings.monacoTheme(),
      minimap: { enabled: this.settings.editorMinimap() },
      fontSize: this.settings.editorFontSize(),
      scrollBeyondLastLine: false,
      language: 'plaintext',
    };
  }

  constructor() {
    // Recompute diff models whenever file or resolved content changes
    effect(() => {
      const f = this.file();
      const resolved = this.resolvedContent();
      if (!f) return;
      const lang = this.languageFromPath(f.path);
      this.originalModel.set({ code: f.oursView, language: lang });
      this.modifiedModel.set({ code: resolved, language: lang });
    });
  }

  ngOnInit(): void {
    const idx = Number(this.route.snapshot.paramMap.get('fileIndex') ?? '0');
    const opt = this.route.snapshot.paramMap.get('option') as ResolutionOption;
    this.fileIndex.set(idx);
    this.option.set(opt);
    this.isManual.set(opt === 'manual');

    if (this.conflictService.files().length === 0) {
      // Load then set content once files arrive
      this.conflictService.load();
      const stopEffect = effect(() => {
        const f = this.file();
        if (!f) return;
        this.setResolvedContent(f, opt);
        stopEffect.destroy();
      });
    } else {
      const f = this.file();
      if (f) this.setResolvedContent(f, opt);
    }
  }

  private setResolvedContent(file: ConflictFile, opt: ResolutionOption): void {
    const content = opt === 'manual'
      ? file.oursView
      : (this.conflictService.getResolutionContent(file, opt) ?? file.oursView);
    this.resolvedContent.set(content);
  }

  private languageFromPath(filePath: string): string {
    const ext = filePath.split('.').pop() ?? '';
    const map: Record<string, string> = {
      ts: 'typescript', js: 'javascript', py: 'python',
      java: 'java', go: 'go', rb: 'ruby', rs: 'rust',
      cs: 'csharp', cpp: 'cpp', c: 'c', json: 'json',
      html: 'html', css: 'css', scss: 'scss', md: 'markdown',
    };
    return map[ext] ?? 'plaintext';
  }

  /** Create a worktree and apply the resolved content to it */
  prepareWorktree(): void {
    const file = this.file();
    const repo = this.repoService.activeRepo;
    if (!file || !repo) return;

    this.worktreeLoading.set(true);
    this.api.createWorktree(repo.path, this.processId).subscribe({
      next: (wt) => {
        this.activeWorktree.set(wt);
        // Write the resolved file into the worktree
        this.api.applyResolutionToWorktree(wt.id, file.path, this.resolvedContent()).subscribe({
          next: () => this.worktreeLoading.set(false),
          error: () => this.worktreeLoading.set(false),
        });
      },
      error: () => this.worktreeLoading.set(false),
    });
  }

  runAndTest(): void {
    const wt = this.activeWorktree();
    const cmd = this.runCommand();
    if (!wt || !cmd.trim()) return;

    this.isRunning.set(true);
    this.processOutput.set([]);

    this.api.spawnProcess(cmd, wt.path, this.processId).subscribe();
    this.api.watchProcessOutput(this.processId).subscribe((data) => {
      if (data.stdout) {
        this.processOutput.update((lines) => [...lines, ...data.stdout.split('\n').filter(Boolean)]);
      }
      if (data.stderr) {
        this.processOutput.update((lines) => [...lines, `[stderr] ${data.stderr.trim()}`]);
      }
      if (data.exitCode !== undefined) {
        this.isRunning.set(false);
        this.processOutput.update((lines) => [...lines, `--- Process exited with code ${data.exitCode} ---`]);
      }
    });
  }

  stopProcess(): void {
    this.api.killProcess(this.processId).subscribe();
    this.isRunning.set(false);
  }

  confirm(): void {
    const file = this.file();
    if (!file) return;
    this.conflictService.confirmResolution(file.path, this.resolvedContent());
    this.cleanupWorktree();
    this.router.navigate(['/conflicts']);
  }

  goBack(): void {
    this.cleanupWorktree();
    this.router.navigate(['/conflicts/resolve', this.fileIndex()]);
  }

  private cleanupWorktree(): void {
    const wt = this.activeWorktree();
    if (wt) {
      this.api.killProcess(this.processId).subscribe();
      this.api.removeWorktree(wt.id).subscribe();
      this.activeWorktree.set(null);
    }
  }

  get optionLabel(): string {
    switch (this.option()) {
      case 'acceptCurrent': return 'Accept Current Change';
      case 'acceptIncoming': return 'Accept Incoming Change';
      case 'acceptBoth': return 'Accept Both Changes';
      case 'manual': return 'Manual Edit';
    }
  }

  ngOnDestroy(): void {
    this.cleanupWorktree();
  }
}
