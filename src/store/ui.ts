import { create } from 'zustand';
import type { AppMode, Theme, Density, SelectionTarget } from '../types/schema';

interface UIState {
  mode: AppMode;
  theme: Theme;
  density: Density;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  paletteOpen: boolean;
  selection: SelectionTarget;
  editingFieldId: string | null; // fieldId currently in inline edit
  zoom: number;
  diffMode: boolean;
  diffSnapshotId: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  readOnly: boolean;
  dialogConfig: {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  } | null;
}

interface UIActions {
  setMode: (mode: AppMode) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  openPalette: () => void;
  closePalette: () => void;
  setSelection: (target: SelectionTarget) => void;
  clearSelection: () => void;
  setEditingField: (fieldId: string | null) => void;
  setZoom: (zoom: number) => void;
  enterDiffMode: (snapshotId: string) => void;
  exitDiffMode: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  setReadOnly: (val: boolean) => void;
  showDialog: (config: { title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void }) => void;
  closeDialog: () => void;
}

type UIStore = UIState & UIActions;

const savedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('sf-theme') : 'dark') as Theme ?? 'dark';
const savedDensity = (typeof localStorage !== 'undefined' ? localStorage.getItem('sf-density') : 'comfortable') as Density ?? 'comfortable';

export const useUIStore = create<UIStore>()((set, get) => ({
  mode: 'canvas',
  theme: savedTheme,
  density: savedDensity,
  sidebarOpen: true,
  rightPanelOpen: false,
  paletteOpen: false,
  selection: null,
  editingFieldId: null,
  zoom: 1,
  diffMode: false,
  diffSnapshotId: null,
  toastMessage: null,
  toastType: 'success',
  readOnly: false,
  dialogConfig: null,

  setMode: (mode) => set({ mode }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sf-theme', next);
    set({ theme: next });
  },

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sf-theme', theme);
    set({ theme });
  },

  setDensity: (density) => {
    localStorage.setItem('sf-density', density);
    set({ density });
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),

  setSelection: (target) => {
    set({ selection: target, rightPanelOpen: target !== null });
  },

  clearSelection: () => set({ selection: null, rightPanelOpen: false }),
  setEditingField: (fieldId) => set({ editingFieldId: fieldId }),
  setZoom: (zoom) => set({ zoom }),

  enterDiffMode: (snapshotId) =>
    set({ diffMode: true, diffSnapshotId: snapshotId }),

  exitDiffMode: () =>
    set({ diffMode: false, diffSnapshotId: null }),

  // Fix #37: track timeout ID so rapid calls cancel previous timers
  // (prevents early dismissal when showToast is called multiple times quickly)
  _toastTimer: undefined as ReturnType<typeof setTimeout> | undefined,

  showToast: (message, type = 'success') => {
    const state = get() as any;
    if (state._toastTimer) clearTimeout(state._toastTimer);
    set({ toastMessage: message, toastType: type });
    const timer = setTimeout(() => get().clearToast(), 2800);
    (get() as any)._toastTimer = timer;
  },

  clearToast: () => set({ toastMessage: null }),
  setReadOnly: (readOnly) => set({ readOnly }),

  showDialog: (config) => set({ dialogConfig: { ...config, isOpen: true } }),
  closeDialog: () => set({ dialogConfig: null })
}));
