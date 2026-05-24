import {
  ChangeDetectionStrategy, Component, computed, inject, signal,
} from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { eventToCombo, displayCombo, displayParts } from '../../../core/services/shortcut.service';
import { AppSettings, ShortcutMap } from '../../../../../shared/settings.types';

interface ShortcutRow {
  action: keyof ShortcutMap;
  label: string;
  hint: string;
}

interface FixedRow {
  label: string;
  /** Parsed via displayParts() when set. */
  combo?: string;
  /** Raw string shown as a single badge (for mouse combos). */
  binding?: string;
  hint: string;
}

const SHORTCUT_ROWS: ShortcutRow[] = [
  { action: 'refresh',      label: 'Refresh',         hint: 'Reload graph and repository status' },
  { action: 'openSettings', label: 'Open Settings',   hint: 'Navigate to the settings page' },
  { action: 'goBack',       label: 'Go Back / Close', hint: 'Close detail panel or navigate to previous page' },
];

// Cherry-pick queue is excluded from FIXED_ROWS because its modifier key
// is user-configurable (cherryPickModifier setting). It is derived at runtime
// via cherryPickFixedRow computed on the component class.
const FIXED_ROWS: FixedRow[] = [
  { label: 'Run command', combo: 'enter', hint: 'Execute the run command in the worktree preview' },
  { label: 'New Window',  combo: 'mod+n', hint: 'Open a new application window (system menu)' },
];

@Component({
  selector: 'rl-settings-keyboard-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-section">
      <div class="section-header-row">
        <h2 class="section-title">Configurable Shortcuts</h2>
        <span class="os-badge">{{ osBadge() }}</span>
      </div>

      <div class="shortcuts-table">
        @for (row of shortcutRows; track row.action) {
          <div class="shortcut-row" [class.shortcut-row--editing]="editingAction() === row.action">

            <div class="shortcut-row__info">
              <span class="shortcut-row__label">{{ row.label }}</span>
              <span class="shortcut-row__hint">{{ row.hint }}</span>
            </div>

            <div class="shortcut-row__binding">
              @if (editingAction() === row.action) {
                <input
                  class="shortcut-record"
                  [value]="recordingDisplay()"
                  placeholder="Press keys…"
                  readonly
                  autofocus
                  (keydown)="onRecord($event)"
                  (blur)="cancelEdit()"
                />
                <button class="shortcut-btn shortcut-btn--save"
                  [disabled]="!pendingCombo()"
                  (mousedown)="$event.preventDefault()"
                  (click)="saveEdit(row.action)">Save</button>
                <button class="shortcut-btn shortcut-btn--cancel"
                  (mousedown)="$event.preventDefault()"
                  (click)="cancelEdit()">Cancel</button>
              } @else {
                <span class="key-combo">
                  @for (part of parts(s.snapshot.keyboardShortcuts[row.action]); track $index; let last = $last) {
                    <kbd class="key-badge">{{ part }}</kbd>
                    @if (!last) { <span class="key-sep">+</span> }
                  }
                </span>
                <button class="shortcut-btn" (click)="startEdit(row.action)">Edit</button>

              }
            </div>

          </div>
        }
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Cherry-Pick Trigger</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <div class="settings-row__label">Click modifier</div>
          <div class="settings-row__hint">Modifier key held while clicking a commit to queue it for cherry-pick</div>
        </div>
        <div class="settings-row__control">
          <div class="radio-group">
            <button class="radio-group__btn"
              [class.radio-group__btn--active]="s.snapshot.cherryPickModifier === 'ctrlOrMeta'"
              (click)="setModifier('ctrlOrMeta')">Ctrl / ⌘</button>
            <button class="radio-group__btn"
              [class.radio-group__btn--active]="s.snapshot.cherryPickModifier === 'alt'"
              (click)="setModifier('alt')">Alt / ⌥</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Fixed Shortcuts</h2>
      <p class="fixed-note">These bindings are built into the system and cannot be changed.</p>

      <div class="shortcuts-table">
        <!-- Cherry-pick row: derived from cherryPickModifier + platform -->
        <div class="shortcut-row">
          <div class="shortcut-row__info">
            <span class="shortcut-row__label">Cherry-pick queue</span>
            <span class="shortcut-row__hint">Toggle a commit into the cherry-pick queue (mouse)</span>
          </div>
          <div class="shortcut-row__binding">
            <kbd class="key-badge key-badge--fixed key-badge--wide">{{ cherryPickBinding() }}</kbd>
          </div>
        </div>

        @for (row of fixedRows; track row.label) {
          <div class="shortcut-row">
            <div class="shortcut-row__info">
              <span class="shortcut-row__label">{{ row.label }}</span>
              <span class="shortcut-row__hint">{{ row.hint }}</span>
            </div>
            <div class="shortcut-row__binding">
              @if (row.combo) {
                <span class="key-combo key-combo--fixed">
                  @for (part of parts(row.combo); track $index; let last = $last) {
                    <kbd class="key-badge key-badge--fixed">{{ part }}</kbd>
                    @if (!last) { <span class="key-sep">+</span> }
                  }
                </span>
              } @else {
                <kbd class="key-badge key-badge--fixed key-badge--wide">{{ row.binding }}</kbd>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .shortcuts-table { display: flex; flex-direction: column; }

    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-default);
      gap: 2rem;
      &:last-child { border-bottom: none; }
      &--editing {
        background: var(--accent-subtle);
        padding: 0.75rem 0.75rem;
        border-radius: 6px;
        margin: 0 -0.75rem;
        border-bottom: none;
      }
      &__info { flex: 1; }
      &__label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
      &__hint  { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; }
      &__binding { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    }

    /* Key combo wrapper */
    .key-combo {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* Individual key badge */
    .key-badge {
      background: var(--bg-surface);
      border: 1px solid var(--border-muted);
      border-bottom: 2px solid var(--border-subtle);
      border-radius: 5px;
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 0.875rem;
      min-width: 28px;
      padding: 0.2rem 0.5rem;
      text-align: center;
      white-space: nowrap;
      line-height: 1.4;

      &--fixed { color: var(--text-muted); background: var(--bg-overlay); }
      &--wide  { min-width: unset; }
    }

    /* The + separator between badges */
    .key-sep {
      color: var(--text-subtle);
      font-size: 0.75rem;
      user-select: none;
    }

    .shortcut-record {
      background: var(--bg-canvas);
      border: 2px solid var(--accent);
      border-radius: 5px;
      color: var(--text-primary);
      font-family: monospace;
      font-size: 0.8125rem;
      min-width: 120px;
      outline: none;
      padding: 0.25rem 0.6rem;
      text-align: center;
      &::placeholder { color: var(--text-subtle); }
    }

    .shortcut-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border-muted);
      border-radius: 5px;
      color: var(--text-muted);
      cursor: pointer;
      font-family: inherit;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      transition: color 0.1s, border-color 0.1s;
      &:hover { color: var(--text-primary); border-color: var(--text-muted); }
      &--save {
        background: var(--accent-subtle); border-color: var(--accent); color: var(--accent);
        &:hover { background: var(--accent); color: #fff; }
        &:disabled { opacity: 0.4; cursor: default; }
      }
      &--cancel:hover { border-color: var(--danger); color: var(--danger); }
    }

    .section-header-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-default);
    }

    /* Local title — same visual style as settings-section__title but without
       its own border-bottom so the row wrapper owns the single border. */
    .section-title {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin: 0;
    }

    .os-badge {
      background: var(--accent-subtle);
      border: 1px solid var(--accent);
      border-radius: 4px;
      color: var(--accent);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 0.1rem 0.45rem;
      text-transform: uppercase;
    }

    .fixed-note {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0 0 0.75rem;
    }
  `],
})
export class SettingsKeyboardTabComponent {
  protected readonly s = inject(SettingsService);

  protected readonly shortcutRows = SHORTCUT_ROWS;
  protected readonly fixedRows    = FIXED_ROWS;

  protected readonly editingAction = signal<keyof ShortcutMap | null>(null);
  protected readonly pendingCombo  = signal<string>('');

  protected readonly osBadge = computed(() => {
    const p = this.s.platform();
    if (p === 'darwin')  return 'macOS';
    if (p === 'win32')   return 'Windows';
    return 'Linux';
  });

  protected readonly recordingDisplay = computed(() => {
    const c = this.pendingCombo();
    return c ? displayCombo(c, this.s.isMac()) : '';
  });

  parts(combo: string): string[] {
    return displayParts(combo, this.s.isMac());
  }

  /** Derives the cherry-pick mouse-combo label from the current modifier
   *  setting and platform, so it stays correct when the user changes the modifier. */
  protected readonly cherryPickBinding = computed(() => {
    const isMac = this.s.isMac();
    const modifier = this.s.snapshot.cherryPickModifier;
    if (modifier === 'alt') return isMac ? '⌥ + Click' : 'Alt + Click';
    return isMac ? '⌘ + Click' : 'Ctrl + Click';
  });

  startEdit(action: keyof ShortcutMap): void {
    this.pendingCombo.set('');
    this.editingAction.set(action);
  }

  onRecord(e: KeyboardEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;
    if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.cancelEdit();
      return;
    }
    this.pendingCombo.set(eventToCombo(e, this.s.isMac()));
  }

  saveEdit(action: keyof ShortcutMap): void {
    const combo = this.pendingCombo();
    if (!combo) return;
    this.s.update({
      keyboardShortcuts: { ...this.s.snapshot.keyboardShortcuts, [action]: combo },
    });
    this.editingAction.set(null);
    this.pendingCombo.set('');
  }

  cancelEdit(): void {
    this.editingAction.set(null);
    this.pendingCombo.set('');
  }

  setModifier(value: AppSettings['cherryPickModifier']): void {
    this.s.update({ cherryPickModifier: value });
  }
}
