import { Injectable, signal, computed } from '@angular/core';
import { ElectronApiService } from '../../core/services/electron-api.service';
import { RepositoryService } from '../../core/services/repository.service';
import type { ConflictFile } from '../../../../shared/git.types';

export type ResolutionOption = 'acceptCurrent' | 'acceptIncoming' | 'acceptBoth' | 'manual';

@Injectable({ providedIn: 'root' })
export class ConflictService {
  readonly files = signal<ConflictFile[]>([]);
  readonly loading = signal(false);
  readonly resolvedMap = signal<Record<string, string>>({});

  readonly allResolved = computed(() => {
    const files = this.files();
    const resolved = this.resolvedMap();
    return files.length > 0 && files.every((f) => resolved[f.path] !== undefined);
  });

  constructor(
    private api: ElectronApiService,
    private repoService: RepositoryService,
  ) {}

  load(): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.loading.set(true);
    this.api.getConflictFiles(repo.path).subscribe({
      next: (files) => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getResolutionContent(file: ConflictFile, option: ResolutionOption): string | null {
    if (!file.resolutions) return null;
    if (option === 'acceptCurrent') return file.resolutions.acceptCurrent;
    if (option === 'acceptIncoming') return file.resolutions.acceptIncoming;
    if (option === 'acceptBoth') return file.resolutions.acceptBoth;
    return null;
  }

  confirmResolution(filePath: string, content: string): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.api.writeResolvedFile(repo.path, filePath, content).subscribe(() => {
      this.api.stageFile(repo.path, filePath).subscribe(() => {
        this.resolvedMap.update((m) => ({ ...m, [filePath]: content }));
      });
    });
  }

  abort(): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    const status = this.repoService.currentStatus;
    if (status?.isRebasing) {
      this.api.abortRebase(repo.path).subscribe();
    } else {
      this.api.abortMerge(repo.path).subscribe();
    }
    this.files.set([]);
    this.resolvedMap.set({});
  }

  completeMerge(message: string): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.api.completeMerge(repo.path, message).subscribe(() => {
      this.files.set([]);
      this.resolvedMap.set({});
      this.repoService.refreshStatus();
    });
  }
}
