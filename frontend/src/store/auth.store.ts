import { create } from 'zustand';
import { Member } from '../types';
import { authApi } from '../api/endpoints/auth.api';

interface AuthState {
  user: Member | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
  setUser: (user: Member | null) => void;
  initialize: () => Promise<void>;
}

export const mapMember = (m: any): Member | null => {
  if (!m) return null;
  return {
    id: m.id,
    familyId: m.familyId ?? m.family_id ?? null,
    username: m.username,
    displayName: m.displayName ?? m.display_name ?? m.username,
    role: m.role,
    status: m.status,
    isActive: m.isActive ?? m.is_active ?? true,
    preferredCurrency: m.preferredCurrency ?? m.preferred_currency ?? 'INR',
    preferredApp: (m.preferredApp ?? m.preferred_app) === 'expense_tracker' ? 'expense_tracker' : 'finfamily',
    createdAt: m.createdAt ?? m.created_at,
    lastLoginAt: m.lastLoginAt ?? m.last_login_at ?? null,
  };
};

/** Shared in-flight session check, so concurrent callers (e.g. React dev double effects) refresh only once. */
let initializing: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  login: async (username, password) => {
    const res = await authApi.login({ username, password });
    const user = mapMember(res.member || res.user);
    set({ user, accessToken: res.accessToken });
  },
  register: async (data) => {
    const res = await authApi.register(data);
    const user = mapMember(res.member || res.user);
    set({ user, accessToken: res.accessToken });
  },
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      // Leave for the public landing page. The full page load discards in-memory auth state; clearing the
      // store first would make the route guard redirect to the sign-in drawer instead.
      window.location.assign('/');
    }
  },
  setToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  initialize: async () => {
    if (initializing) return initializing;
    initializing = (async () => {
    try {
      const res = await authApi.refresh();
      let user = mapMember(res.member || res.user);
      if (!user && res.accessToken) {
        useAuthStore.getState().setToken(res.accessToken);
        try {
          const meRes = await authApi.me();
          user = mapMember(meRes.member || meRes.user);
        } catch {
          // ignore
        }
      }
      set({ user, accessToken: res.accessToken, isLoading: false });
    } catch {
      set({ user: null, accessToken: null, isLoading: false });
    }
    })().finally(() => {
      initializing = null;
    });
    return initializing;
  },
}));
