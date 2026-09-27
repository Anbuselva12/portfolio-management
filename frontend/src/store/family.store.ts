import { create } from 'zustand';
import { Family, Member } from '../types';

interface FamilyState {
  family: Family | null;
  members: Member[];
  discoverableFamilies: Family[];
  setFamily: (family: Family | null) => void;
  setMembers: (members: Member[]) => void;
  setDiscoverableFamilies: (families: Family[]) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  family: null,
  members: [],
  discoverableFamilies: [],
  setFamily: (family) => set({ family }),
  setMembers: (members) => set({ members }),
  setDiscoverableFamilies: (discoverableFamilies) => set({ discoverableFamilies }),
}));
