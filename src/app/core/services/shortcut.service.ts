import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SettingsService } from './settings.service';
import { RefreshService } from './refresh.service';
import type { ShortcutMap } from '../../../../shared/settings.types';

// ---------------------------------------------------------------------------
// Pure helpers — accept isMac as a parameter so they work before the service
// is constructed and can also be used in non-injectable contexts.
// ---------------------------------------------------------------------------

function keyLabel(p: string, isMac: boolean): string {
  switch (p) {
    case 'mod':    return isMac ? 'Command' : 'Ctrl';
    case 'alt':    return isMac ? 'Option'  : 'Alt';
    case 'shift':  return 'Shift';
    case 'ctrl':   return 'Control';
    case 'escape': return 'Esc';
    case 'enter':  return 'Enter';
    default:       return p.length === 1 ? p.toUpperCase() : p;
  }
}

/**
 * Split a stored combo string into individual per-key display labels.
 * Pass isMac explicitly — reads from SettingsService.isMac() in components.
 *
 * 'mod+r'    → ['⌘', 'R']       (Mac)    or ['Ctrl', 'R']    (Win/Linux)
 * 'mod+,'    → ['⌘', ',']       (Mac)    or ['Ctrl', ',']    (Win/Linux)
 * 'escape'   → ['Esc']
 */
export function displayParts(combo: string, isMac: boolean): string[] {
  return combo.split('+').map(p => keyLabel(p, isMac));
}

/** Flat string — only for the recording-mode input value. */
export function displayCombo(combo: string, isMac: boolean): string {
  return displayParts(combo, isMac).join(isMac ? '' : '+');
}

/**
 * Convert a KeyboardEvent into the canonical combo string stored in settings.
 * Uses isMac to decide whether Meta or Ctrl maps to 'mod'.
 */
export function eventToCombo(e: KeyboardEvent, isMac: boolean): string {
  const parts: string[] = [];
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (modPressed) parts.push('mod');
  if (e.altKey)   parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  // On Mac, Ctrl is separate from mod; include it explicitly when pressed without meta
  if (e.ctrlKey && isMac && !e.metaKey) parts.push('ctrl');
  const key = e.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  return parts.join('+');
}

/** Tags that should suppress global shortcut handling when focused. */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

@Injectable({ providedIn: 'root' })
export class ShortcutService implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly router   = inject(Router);
  private readonly refresh  = inject(RefreshService);

  /** Fires when the configured "go back" shortcut is pressed. Components
   *  subscribe and handle context-specific behaviour (e.g. close panel). */
  readonly goBack$ = new Subject<void>();

  constructor() {
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    if (INPUT_TAGS.has(target.tagName) || target.isContentEditable) return;

    // Use the authoritative platform from the main process.
    const isMac = this.settings.isMac();
    const combo = eventToCombo(e, isMac);
    const sc: ShortcutMap = this.settings.snapshot.keyboardShortcuts;

    if (combo === sc.refresh) {
      e.preventDefault();
      this.refresh.trigger();
      return;
    }
    if (combo === sc.openSettings) {
      e.preventDefault();
      this.router.navigate(['/settings']);
      return;
    }
    if (combo === sc.goBack) {
      e.preventDefault();
      this.goBack$.next();
      return;
    }
  };

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.goBack$.complete();
  }
}
