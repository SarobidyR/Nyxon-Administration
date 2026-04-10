import { create } from 'zustand';

const useUiStore = create((set, get) => ({
  // ── Sidebar ───────────────────────────────────────────────
  sidebarOpen:     true,
  sidebarCollapsed: false,

  toggleSidebar:   () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  collapseSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  closeSidebar:    () => set({ sidebarOpen: false }),
  openSidebar:     () => set({ sidebarOpen: true }),

  // ── Notifications toast (file d'attente) ──────────────────
  toasts: [],

  addToast: ({ type = 'info', message, duration = 4000 }) => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
    // Auto-remove
    setTimeout(() => get().removeToast(id), duration + 300);
    return id;
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Raccourcis
  toast: {
    success: (message, duration)  => useUiStore.getState().addToast({ type: 'success', message, duration }),
    error:   (message, duration)  => useUiStore.getState().addToast({ type: 'error',   message, duration }),
    warning: (message, duration)  => useUiStore.getState().addToast({ type: 'warning', message, duration }),
    info:    (message, duration)  => useUiStore.getState().addToast({ type: 'info',    message, duration }),
  },

  // ── Page title ────────────────────────────────────────────
  pageTitle: 'Dashboard',
  setPageTitle: (title) => set({ pageTitle: title }),

  // ── Modal global ─────────────────────────────────────────
  modal: null,   // { component, props }
  openModal:  (component, props = {}) => set({ modal: { component, props } }),
  closeModal: () => set({ modal: null }),
}));

export default useUiStore;