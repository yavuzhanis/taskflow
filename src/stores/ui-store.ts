import { create } from "zustand";

type UIState = {
  quickAddOpen: boolean;
  taskDetailId: string | null;
  mobileNavOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  setTaskDetailId: (id: string | null) => void;
  setMobileNavOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  quickAddOpen: false,
  taskDetailId: null,
  mobileNavOpen: false,
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  setTaskDetailId: (taskDetailId) => set({ taskDetailId }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
