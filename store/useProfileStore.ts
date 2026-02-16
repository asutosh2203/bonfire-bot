import { create } from 'zustand';

interface ProfileState {
  userProfile: any;
  setUserProfile: (profile: any) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  userProfile: null,
  setUserProfile: (profile: any) => set({ userProfile: profile }),
}));
