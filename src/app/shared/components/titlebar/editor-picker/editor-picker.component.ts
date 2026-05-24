import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronApiService } from '../../../../core/services/electron-api.service';
import { RepositoryService } from '../../../../core/services/repository.service';
import type { EditorInfo } from '../../../../../../shared/ipc-api.types';

@Component({
  selector: 'rl-editor-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-picker" *ngIf="activeRepo$ | async">
      <button class="titlebar-btn" (click)="toggle($event)">
        Open In
        <span class="icon icon-chevron-down"></span>
      </button>
      <div class="editor-menu" *ngIf="open">
        <button
          *ngFor="let editor of editors"
          class="editor-menu__item"
          (click)="openIn(editor.id)"
        >
          <img
            *ngIf="editor.icon"
            [src]="editor.icon"
            width="16"
            height="16"
            [alt]="editor.name"
          />
          <span
            *ngIf="!editor.icon"
            class="editor-menu__icon-placeholder"
          ></span>
          {{ editor.name }}
        </button>
        <div *ngIf="editors.length === 0" class="editor-menu__empty">
          No editors detected
        </div>
      </div>
    </div>
  `,
  styleUrl: './editor-picker.component.scss',
})
export class EditorPickerComponent implements OnInit {
  editors: EditorInfo[] = [];
  open = false;
  readonly activeRepo$ = this.repoService.activeRepo$;

  constructor(
    private api: ElectronApiService,
    private repoService: RepositoryService,
  ) {}

  ngOnInit(): void {
    this.api.getAvailableEditors().subscribe((eds) => (this.editors = eds));
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  openIn(editorId: string): void {
    const repo = this.repoService.activeRepo;
    if (!repo) return;
    this.api.openInEditor(repo.path, editorId).subscribe();
    this.open = false;
  }

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }
}
