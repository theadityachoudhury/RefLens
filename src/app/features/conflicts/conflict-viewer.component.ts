import {
  Component, OnInit, OnDestroy, input, computed,
  signal, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule } from '@angular/forms';
import { ConflictService, ResolutionOption } from './conflict.service';
import { SettingsService } from '../../core/services/settings.service';
import type { ConflictFile, ConflictHunk } from '../../../../shared/git.types';

declare const monaco: typeof import('monaco-editor');

interface EditorDecoration {
  range: { startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number };
  options: { inlineClassName?: string; isWholeLine?: boolean; className?: string };
}

@Component({
  selector: 'rl-conflict-viewer',
  standalone: true,
  imports: [CommonModule, MonacoEditorModule, FormsModule],
  templateUrl: './conflict-viewer.component.html',
  styleUrl: './conflict-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConflictViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public conflictService = inject(ConflictService);
  private settings = inject(SettingsService);

  fileIndex = signal(0);
  file = computed<ConflictFile | null>(() => {
    const files = this.conflictService.files();
    const idx = this.fileIndex();
    return files[idx] ?? null;
  });

  oursEditor: unknown = null;
  theirsEditor: unknown = null;

  get editorOptions() {
    return {
      theme: this.settings.monacoTheme(),
      language: this.fileLanguage,
      readOnly: true,
      minimap: { enabled: this.settings.editorMinimap() },
      scrollBeyondLastLine: false,
      fontSize: this.settings.editorFontSize(),
      lineNumbers: (this.settings.editorLineNumbers() ? 'on' : 'off') as 'on' | 'off',
      renderLineHighlight: 'none' as const,
      scrollbar: { vertical: 'auto' as const },
      wordWrap: (this.settings.editorWordWrap() ? 'on' : 'off') as 'on' | 'off',
    };
  }

  ngOnInit(): void {
    const idx = Number(this.route.snapshot.paramMap.get('fileIndex') ?? '0');
    this.fileIndex.set(idx);
    if (this.conflictService.files().length === 0) {
      this.conflictService.load();
    }
  }

  onOursEditorInit(editor: unknown): void {
    this.oursEditor = editor;
    this.applyHunkDecorations(editor, 'ours');
  }

  onTheirsEditorInit(editor: unknown): void {
    this.theirsEditor = editor;
    this.applyHunkDecorations(editor, 'theirs');
  }

  private applyHunkDecorations(editor: unknown, side: 'ours' | 'theirs'): void {
    const file = this.file();
    if (!file || !editor) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monacoEditor = editor as any;
    const decorations: EditorDecoration[] = file.hunks.map((hunk) => {
      const startLine = (side === 'ours' ? hunk.oursStartLine : hunk.theirsStartLine) + 1;
      const lineCount = (side === 'ours' ? hunk.oursLines : hunk.theirsLines).length;
      const endLine = startLine + lineCount - 1;
      return {
        range: {
          startLineNumber: startLine,
          endLineNumber: Math.max(startLine, endLine),
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER,
        },
        options: {
          isWholeLine: true,
          className: side === 'ours' ? 'hunk-ours' : 'hunk-theirs',
        },
      };
    });

    monacoEditor.deltaDecorations([], decorations);
  }

  selectOption(option: ResolutionOption): void {
    const idx = this.fileIndex();
    this.router.navigate(['/conflicts/preview', idx, option]);
  }

  editManually(): void {
    const idx = this.fileIndex();
    this.router.navigate(['/conflicts/preview', idx, 'manual']);
  }

  goBack(): void {
    this.router.navigate(['/conflicts']);
  }

  get fileLanguage(): string {
    const file = this.file();
    if (!file) return 'plaintext';
    const ext = file.path.split('.').pop() ?? '';
    const map: Record<string, string> = {
      ts: 'typescript', js: 'javascript', py: 'python',
      java: 'java', go: 'go', rb: 'ruby', rs: 'rust',
      cs: 'csharp', cpp: 'cpp', c: 'c', json: 'json',
      html: 'html', css: 'css', scss: 'scss', md: 'markdown',
    };
    return map[ext] ?? 'plaintext';
  }
}
