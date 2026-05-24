import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronApiService } from '../../../../core/services/electron-api.service';
import { RepositoryService } from '../../../../core/services/repository.service';
import type { EditorInfo } from '../../../../../../shared/ipc-api.types';

const STORAGE_KEY = 'reflens:lastEditor';

@Component({
  selector: 'rl-editor-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-picker.component.html',
  styleUrl: './editor-picker.component.scss',
})
export class EditorPickerComponent implements OnInit {
  editors: EditorInfo[] = [];
  defaultEditorId: string | null = null;
  open = false;
  readonly activeRepo$ = this.repoService.activeRepo$;

  constructor(
    private api: ElectronApiService,
    private repoService: RepositoryService,
  ) {}

  ngOnInit(): void {
    this.api.getAvailableEditors().subscribe((eds) => {
      this.editors = eds;
      this.resolveDefault();
    });
  }

  get defaultEditor(): EditorInfo | null {
    return this.editors.find((e) => e.id === this.defaultEditorId) ?? null;
  }

  get orderedEditors(): EditorInfo[] {
    if (!this.defaultEditorId) return this.editors;
    return [
      ...this.editors.filter((e) => e.id === this.defaultEditorId),
      ...this.editors.filter((e) => e.id !== this.defaultEditorId),
    ];
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  openIn(editorId: string): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.api.openInEditor(repo.path, editorId).subscribe();
    this.setDefault(editorId);
    this.open = false;
  }

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }

  private resolveDefault(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && this.editors.some((e) => e.id === saved)) {
      this.defaultEditorId = saved;
    } else if (this.editors.length >= 1) {
      this.defaultEditorId = this.editors[0].id;
    }
  }

  private setDefault(editorId: string): void {
    this.defaultEditorId = editorId;
    localStorage.setItem(STORAGE_KEY, editorId);
  }
}
