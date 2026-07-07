import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  filterIndustry: string;
  setFilterIndustry: (v: string) => void;
  selectedMsmeId: number | null;
  setSelectedMsmeId: (id: number | null) => void;
  liveDemoEnabled: boolean;
  toggleLiveDemo: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  filterIndustry: "",
  setFilterIndustry: (v) => set({ filterIndustry: v }),
  selectedMsmeId: null,
  setSelectedMsmeId: (id) => set({ selectedMsmeId: id }),
  liveDemoEnabled: false,
  toggleLiveDemo: () => set((s) => ({ liveDemoEnabled: !s.liveDemoEnabled }),
  ),
}));
