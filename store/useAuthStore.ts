import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AuthState {
  currentUser: User | null;
  userProfile: any;
  setCurrentUser: (user: User | null) => void;
  setUserProfile: (profile: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  userProfile: null,
  setUserProfile: (profile: any) => set({ userProfile: profile }),
  setCurrentUser: (user) => set({ currentUser: user }),
}));
