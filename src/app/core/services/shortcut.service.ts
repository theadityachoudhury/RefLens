import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SettingsService } from './settings.service';
import { RefreshService } from './refresh.service';
import type { ShortcutMap } from '../../../../shared/settings.types';

/** Normalize a KeyboardEvent into the internal shortcut format (e.g. "mod+r", "escape"). */
export function eventToCombo(e: KeyboardEvent): string {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const parts: string[] = [];
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (modPressed) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  if (e.ctrlKey && !isMac) { /* already captured via mod */ }
  const key = e.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  return parts.join('+');
}

/** Render a stored combo string as a human-readable label (⌘R / Ctrl+R). */
export function displayCombo(combo: string): string {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return combo.split('+').map(p => {
    switch (p) {
      case 'mod':    return isMac ? '⌘'  : 'Ctrl';
      case 'alt':    return isMac ? '⌥'  : 'Alt';
      case 'shift':  return isMac ? '⇧'  : 'Shift';
      case 'ctrl':   return 'Ctrl';
      case 'escape': return 'Esc';
      default:       return p.toUpperCase();
    }
  }).join(isMac ? '' : '+');
}

/** Returns true when the event matches the stored shortcut string. */
function matches(e: KeyboardEvent, shortcut: string): boolean {
  return eventToCombo(e) === shortcut.toLowerCase();
}

/** Tags that should suppress shortcut handling when focused. */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

@Injectable({ providedIn: 'root' })
export class ShortcutService implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly router   = inject(Router);
  private readonly refresh  = inject(RefreshService);

  /** Fires when the configured "go back" shortcut is pressed. Components
   *  subscribe to this and handle context-specific back behaviour. */
  readonly goBack$ = new Subject<void>();

  constructor() {
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    if (INPUT_TAGS.has(target.tagName) || target.isContentEditable) return;

    const sc: ShortcutMap = this.settings.snapshot.keyboardShortcuts;

    if (matches(e, sc.refresh)) {
      e.preventDefault();
      this.refresh.trigger();
      return;
    }
    if (matches(e, sc.openSettings)) {
      e.preventDefault();
      this.router.navigate(['/settings']);
      return;
    }
    if (matches(e, sc.goBack)) {
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
