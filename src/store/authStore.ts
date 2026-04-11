import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  ensureProfile: (user: User) => Promise<void>;  // Fix #52: was missing from interface
  initialize: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,

  ensureProfile: async (user: User) => {
    if (!user) return;
    
    // Check if profile exists
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      console.log('[Auth] Profile missing, creating fallback...');
      await supabase.from('users').insert({
        id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().ensureProfile(session.user);
      }
      set({ session, user: session?.user || null, isLoading: false });
    } catch {
      // Fix #35: always clear loading state so the app doesn't get stuck
      set({ session: null, user: null, isLoading: false });
    }

    // Listen for auth changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        await get().ensureProfile(newSession.user);
      }
      set({ session: newSession, user: newSession?.user || null });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  }
}));
