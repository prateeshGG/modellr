import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  tier: 'free' | 'pro';
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  ensureProfile: (user: User) => Promise<Profile | null>;
  initialize: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  ensureProfile: async (user: User) => {
    if (!user) return null;
    
    // Fetch Profile
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      console.log('[Auth] Profile missing, creating fallback...');
      const newProfile = {
        id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        tier: 'free' as const
      };
      const { data: created } = await supabase.from('users').insert(newProfile).select().single();
      return created || newProfile;
    }
    return data;
  },

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let profile = null;
      if (session?.user) {
        profile = await get().ensureProfile(session.user);
      }
      set({ session, user: session?.user || null, profile, isLoading: false });
    } catch {
      set({ session: null, user: null, profile: null, isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      let profile = null;
      if (newSession?.user) {
        profile = await get().ensureProfile(newSession.user);
      }
      set({ session: newSession, user: newSession?.user || null, profile });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  }
}));
