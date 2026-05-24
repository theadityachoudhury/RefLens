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
  templateUrl: './keyboard-tab.component.html',
  styleUrl: './keyboard-tab.component.scss',
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
