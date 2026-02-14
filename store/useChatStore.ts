import { create } from 'zustand';

// Tweak this interface to match your actual Supabase message row
export interface Message {
  id: number;
  content: string;
  name: string;
}

interface ChatState {
  replyTarget: Message | null;
  setReplyTarget: (message: Message) => void;
  clearReplyTarget: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  replyTarget: null,
  
  // Actions to mutate the state
  setReplyTarget: (message) => set({ replyTarget: message }),
  clearReplyTarget: () => set({ replyTarget: null }),
}));