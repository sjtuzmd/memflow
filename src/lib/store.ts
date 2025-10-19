import { create } from 'zustand';
import { ProcessedImage } from './imageProcessor';

interface AlbumState {
  // Uploaded and processed images
  images: ProcessedImage[];
  // Images grouped by date
  groupedImages: Record<string, ProcessedImage[]>;
  // Current processing status
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error';
  // Error message if any
  error: string | null;
  // Current album pages
  pages: Array<{
    id: string;
    title: string;
    images: string[]; // Array of image IDs
    layout: string;
    theme: string;
  }>;
  
  // Actions
  setImages: (images: ProcessedImage[]) => void;
  setGroupedImages: (groups: Record<string, ProcessedImage[]>) => void;
  setStatus: (status: AlbumState['status']) => void;
  setError: (error: string | null) => void;
  addPage: (page: Omit<AlbumState['pages'][0], 'id'>) => void;
  updatePage: (id: string, updates: Partial<AlbumState['pages'][0]>) => void;
  removePage: (id: string) => void;
  clearAlbum: () => void;
}

export const useAlbumStore = create<AlbumState>((set) => ({
  images: [],
  groupedImages: {},
  status: 'idle',
  error: null,
  pages: [],
  
  setImages: (images) => set({ images }),
  setGroupedImages: (groupedImages) => set({ groupedImages }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  addPage: (page) => 
    set((state) => ({
      pages: [...state.pages, { ...page, id: Date.now().toString() }]
    })),
  updatePage: (id, updates) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === id ? { ...page, ...updates } : page
      ),
    })),
  removePage: (id) =>
    set((state) => ({
      pages: state.pages.filter((page) => page.id !== id),
    })),
  clearAlbum: () =>
    set({
      images: [],
      groupedImages: {},
      status: 'idle',
      error: null,
      pages: [],
    }),
}));

// Helper hook to get the store's state
export const useAlbum = () => {
  const state = useAlbumStore();
  return state;
};
