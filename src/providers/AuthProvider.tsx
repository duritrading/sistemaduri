// src/providers/AuthProvider.tsx - PROVIDER ISOLADO (PRODUCTION-READY)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext, type User, type UserProfile, type Company } from '@/contexts/AuthContext';

// ✅ VERIFICAR CONFIGURAÇÃO SUPABASE
const checkSupabaseConfig = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return !!(supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('your_') && 
    !supabaseKey.includes('your_'));
};

// ✅ FETCH USER DATA (SEM AUTHHELPERS)
const fetchUserData = async (userId: string) => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        companies (
          id,
          name,
          display_name,
          slug,
          active
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return { profile: null, company: null };
    }

    return {
      profile: profile as UserProfile,
      company: (profile as any)?.companies as Company
    };
    
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    return { profile: null, company: null };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabaseConfigured = checkSupabaseConfig();

  // ✅ LOAD USER DATA
  const loadUserData = useCallback(async (currentUser: User) => {
    if (supabaseConfigured) {
      const { profile: userProfile, company: userCompany } = await fetchUserData(currentUser.id);
      setProfile(userProfile);
      setCompany(userCompany);
    }
  }, [supabaseConfigured]);

  // ✅ INITIALIZE AUTH
  useEffect(() => {
    const initAuth = async () => {
      if (!supabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { supabase } = await import('@/lib/supabase');
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          setUser(currentSession.user as User);
          setSession(currentSession);
          await loadUserData(currentSession.user as User);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              setUser(session.user as User);
              setSession(session);
              await loadUserData(session.user as User);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setProfile(null);
              setCompany(null);
              setSession(null);
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [supabaseConfigured, loadUserData]);

  // ✅ SIGN IN
  const signIn = async (email: string, password: string): Promise<void> => {
    if (!supabaseConfigured) {
      throw new Error('Sistema não configurado. Configure as variáveis do Supabase.');
    }

    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIGN UP
  const signUp = async (email: string, password: string, companySlug: string, fullName?: string): Promise<void> => {
    if (!supabaseConfigured) {
      throw new Error('Sistema não configurado. Configure as variáveis do Supabase.');
    }

    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_slug: companySlug
          }
        }
      });
      
      if (error) throw error;
      
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIGN OUT
  const signOut = async (): Promise<void> => {
    setLoading(true);
    
    try {
      if (supabaseConfigured) {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      
      setUser(null);
      setProfile(null);
      setCompany(null);
      setSession(null);
      router.push('/login');
      
    } catch (error) {
      console.error('Error signing out:', error);
      setUser(null);
      setProfile(null);
      setCompany(null);
      setSession(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // ✅ REFRESH PROFILE
  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await loadUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        session,
        loading,
        supabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}