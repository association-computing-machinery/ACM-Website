import { useEffect } from 'react';

// Dialogs in this app are plain divs with role="dialog", so Escape is the only
// keyboard dismissal available. A module-level stack means that when dialogs are
// nested (for example "change person" opened from the core-team editor) only the
// topmost one reacts to the keyboard.
let openDialogs: symbol[] = [];

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function topmostDialog(): HTMLElement | null {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
}

function focusableIn(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

/**
 * Dialog keyboard behaviour: Escape closes the topmost dialog, and Tab is kept
 * inside it so keyboard users cannot tab into the page rendered behind the
 * overlay (which `aria-modal="true"` already claims is inert).
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const id = Symbol('dialog');
    openDialogs.push(id);

    const isTopmost = () => openDialogs[openDialogs.length - 1] === id;

    // If nothing inside the dialog has focus yet (no autoFocus), put it there.
    const dialog = topmostDialog();
    if (dialog && !dialog.contains(document.activeElement)) {
      focusableIn(dialog)[0]?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost()) return;

      if (event.key === 'Escape') {
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;
      const current = topmostDialog();
      if (!current) return;
      const focusable = focusableIn(current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!current.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      openDialogs = openDialogs.filter(open => open !== id);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onEscape, enabled]);
}
