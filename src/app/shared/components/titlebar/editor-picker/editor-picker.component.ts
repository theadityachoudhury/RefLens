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
  template: `
    <div class="editor-picker" *ngIf="activeRepo$ | async">

      <button class="titlebar-btn" (click)="toggle($event)">
        <img
          *ngIf="defaultEditor?.icon"
          class="editor-btn-icon"
          [src]="defaultEditor!.icon"
          width="14"
          height="14"
          [alt]="defaultEditor!.name"
        />
        Open In
        <span class="icon icon-chevron-down"></span>
      </button>

      <div class="editor-menu" *ngIf="open">

        <!-- No editors installed -->
        <ng-container *ngIf="editors.length === 0">
          <p class="editor-menu__no-editors">No editors installed</p>
          <p class="editor-menu__hint">Install VS Code, Cursor, or another editor to continue</p>
        </ng-container>

        <!-- Editor list (default first) -->
        <button
          *ngFor="let editor of orderedEditors"
          class="editor-menu__item"
          [class.editor-menu__item--active]="editor.id === defaultEditorId"
          (click)="openIn(editor.id)"
        >
          <img *ngIf="editor.icon" class="editor-menu-icon" [src]="editor.icon" [alt]="editor.name" />
          <span *ngIf="!editor.icon" class="editor-menu__icon-placeholder"></span>
          <span class="editor-menu__name">{{ editor.name }}</span>
          <span *ngIf="editor.id === defaultEditorId" class="editor-menu__check">✓</span>
        </button>

      </div>
    </div>
  `,
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
