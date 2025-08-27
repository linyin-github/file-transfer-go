import { create } from 'zustand';

interface WebRTCState {
  isConnected: boolean;
  isConnecting: boolean;
  isWebSocketConnected: boolean;
  isPeerConnected: boolean;
  error: string | null;
  canRetry: boolean;  // 新增：是否可以重试
  currentRoom: { code: string; role: 'sender' | 'receiver' } | null;
}

interface WebRTCStore extends WebRTCState {
  updateState: (updates: Partial<WebRTCState>) => void;
  setCurrentRoom: (room: { code: string; role: 'sender' | 'receiver' } | null) => void;
  reset: () => void;
  resetToInitial: () => void;  // 新增：完全重置到初始状态
}

const initialState: WebRTCState = {
  isConnected: false,
  isConnecting: false,
  isWebSocketConnected: false,
  isPeerConnected: false,
  error: null,
  canRetry: false,  // 初始状态下不需要重试
  currentRoom: null,
};

export const useWebRTCStore = create<WebRTCStore>((set) => ({
  ...initialState,
  
  updateState: (updates) => set((state) => ({
    ...state,
    ...updates,
  })),
  
  setCurrentRoom: (room) => set((state) => ({
    ...state,
    currentRoom: room,
  })),
  
  reset: () => set(initialState),
  
  resetToInitial: () => set(initialState),  // 完全重置到初始状态
}));
