import { useEffect, useCallback } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], deps: any[] = []) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const s of shortcuts) {
      if (s.enabled === false) continue;
      const ctrl = s.ctrl ?? false;
      const shift = s.shift ?? false;
      const alt = s.alt ?? false;
      if (
        e.key.toLowerCase() === s.key.toLowerCase() &&
        e.ctrlKey === ctrl &&
        e.shiftKey === shift &&
        e.altKey === alt
      ) {
        e.preventDefault();
        e.stopPropagation();
        s.handler(e);
        return;
      }
    }
  }, [shortcuts, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts() {
  const shortcuts: Shortcut[] = [
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        const event = new CustomEvent('open-command-palette');
        window.dispatchEvent(event);
      },
    },
    {
      key: 'f',
      ctrl: true,
      handler: () => {
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
        searchInput?.focus();
        searchInput?.select();
      },
    },
    {
      key: 'Escape',
      handler: () => {
        const modal = document.querySelector<HTMLDivElement>('[data-modal]');
        if (modal) {
          const closeBtn = modal.querySelector<HTMLButtonElement>('[data-modal-close]');
          closeBtn?.click();
        }
      },
    },
    {
      key: 'F5',
      handler: () => {
        const refreshBtn = document.querySelector<HTMLButtonElement>('[data-refresh]');
        refreshBtn?.click();
      },
    },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (s.enabled === false) continue;
        const ctrl = s.ctrl ?? false;
        const shift = s.shift ?? false;
        const alt = s.alt ?? false;
        if (
          e.key.toLowerCase() === s.key.toLowerCase() &&
          e.ctrlKey === ctrl &&
          e.shiftKey === shift &&
          e.altKey === alt
        ) {
          e.preventDefault();
          e.stopPropagation();
          s.handler(e);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
