import { useEffect } from 'react';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
import { useUndoRedo } from './useUndoRedo';

export function useKeyboardShortcuts() {
  const { addTable, tables, removeTable, removeField, removeRelationship } = useSchemaStore() as any;
  const {
    openPalette, closePalette, paletteOpen,
    toggleSidebar, toggleRightPanel,
    clearSelection,
    setEditingField,
  } = useUIStore();
  const { undo, redo } = useUndoRedo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Fix #56: navigator.platform is deprecated; use userAgentData with fallback
      const isMac = (navigator as any).userAgentData
        ? (navigator as any).userAgentData.platform?.toLowerCase().includes('mac')
        : navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const tag = (e.target as HTMLElement).tagName;
      // Fix #57: also treat contentEditable as an input context
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        || (e.target as HTMLElement).isContentEditable;

      // ── Always-active shortcuts ──────────────────
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }

      // Ctrl+F / Cmd+F — open schema search
      if (mod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('sf:open-search'));
        return;
      }

      // Fix #16: ⌘⇧E / Ctrl+Shift+E → open export menu
      if (mod && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('sf:toggle-export'));
        return;
      }

      // Fix #57: guard ALL mod+key and single-key shortcuts against typing context
      if (isInput) return;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key === 'Z' || e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (mod && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); toggleSidebar(); return; }
      if (mod && e.key === '\\') { e.preventDefault(); toggleRightPanel(); return; }

      // ── Escape ───────────────────────────────────
      if (e.key === 'Escape') {
        if (paletteOpen) { closePalette(); return; }
        clearSelection();
        setEditingField(null);
        return;
      }

      // ── Delete selected item ─────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useUIStore.getState().selection;

        if (!sel) {
          // Maybe multi-select is active — fire bulk-delete event to canvas
          window.dispatchEvent(new CustomEvent('sf:bulk-delete'));
          return;
        }

        if (sel.type === 'table') {
          e.preventDefault();
          removeTable((sel as any).tableId);
          clearSelection();
        } else if (sel.type === 'field') {
          e.preventDefault();
          removeField((sel as any).tableId, (sel as any).fieldId);
          clearSelection();
        } else if (sel.type === 'relationship') {
          e.preventDefault();
          removeRelationship?.((sel as any).relationshipId);
          clearSelection();
        }
        return;
      }

      // ── Canvas shortcuts (no modifier) ───────────
      if (!mod && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 't':
            e.preventDefault();
            addTable({ x: 120 + (tables.length % 5) * 260, y: 120 + Math.floor(tables.length / 5) * 160 });
            break;
          case 'g':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sf:auto-layout'));
            break;
          case 'f':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sf:fit-view'));
            break;
          case '/':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sf:focus-filter'));
            break;
          case '1': case '2': case '3': case '4': case '5':
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('sf:zoom-preset', { detail: parseInt(e.key) }));
            break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    tables, addTable, removeTable, removeField, removeRelationship,
    openPalette, closePalette, paletteOpen,
    toggleSidebar, toggleRightPanel,
    clearSelection, setEditingField,
    undo, redo,
  ]);
}
