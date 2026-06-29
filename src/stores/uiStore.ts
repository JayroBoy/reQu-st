import { create } from 'zustand';

interface UIState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  activeModal: string | null;
  editingCollectionId: string | null;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  setEditingCollectionId: (id: string | null) => void;
}

// Read initial theme from local storage or default to dark
const getInitialTheme = (): 'dark' | 'light' => {
  const saved = localStorage.getItem('requaest-theme');
  if (saved === 'light') return 'light';
  return 'dark'; // Default
};

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  sidebarOpen: true,
  activeModal: null,
  editingCollectionId: null,
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('requaest-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    return { theme: newTheme };
  }),
  
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  
  setActiveModal: (modal: string | null) => set({ activeModal: modal }),
  
  setEditingCollectionId: (id: string | null) => set({ editingCollectionId: id }),
}));
