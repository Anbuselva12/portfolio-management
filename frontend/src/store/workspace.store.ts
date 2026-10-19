import { create } from 'zustand';
import { familyApi } from '../api/endpoints/family.api';

export interface WorkspaceInfo {
  id: string;
  name: string;
  isPersonal: boolean;
}

interface WorkspaceState {
  workspace: WorkspaceInfo | null;
  /** Family id the workspace was loaded for, so a family change triggers a reload. */
  loadedFor: string | null;
  load: (familyId: string | null | undefined) => Promise<void>;
  reset: () => void;
}

/**
 * The current workspace: a real family, or a solo workspace created when the user skipped family setup.
 * Family-only UI (Whole Family toggle, members, family wording) is shown only when `isFamily` is true.
 */
export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  loadedFor: null,
  load: async (familyId) => {
    if (!familyId) {
      set({ workspace: null, loadedFor: null });
      return;
    }
    if (get().loadedFor === familyId && get().workspace) return;
    try {
      const f = await familyApi.getCurrent();
      set({ workspace: { id: f.id, name: f.name, isPersonal: !!f.is_personal }, loadedFor: familyId });
    } catch {
      set({ workspace: null, loadedFor: null });
    }
  },
  reset: () => set({ workspace: null, loadedFor: null }),
}));

/** True only for a real family (hidden while loading, so solo users never see family UI flash). */
export const useIsFamily = (): boolean => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  return !!workspace && !workspace.isPersonal;
};

export const useIsSolo = (): boolean => {
  const workspace = useWorkspaceStore((s) => s.workspace);
  return !!workspace && workspace.isPersonal;
};
