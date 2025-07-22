// src/hooks/useAuth.ts - FINAL PRODUCTION-READY (ZERO ERRORS)
'use client';

import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ✅ TIPOS SEGUROS - SEM DEPENDÊNCIAS EXTERNAS
interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    company_slug?: string;
  };
}

interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
}

interface Company {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  session: any | null;
  loading: boolean;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companySlug: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ VERIFICAR CONFIGURAÇÃO SUPABASE
const checkSupabaseConfig = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return !!(supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('your_') && 
    !supabaseKey.includes('your_'));
};

// ✅ FETCH USER DATA DIRETO DO SUPABASE (SEM AUTHHELPERS)
const fetchUserData = async (userId: string) => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Buscar user profile com company
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

// ✅ PROVIDER PRINCIPAL
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabaseConfigured = checkSupabaseConfig();

  // ✅ CARREGAR DADOS DO USUÁRIO - IMPLEMENTAÇÃO DIRETA
  const loadUserData = useCallback(async (currentUser: User) => {
    try {
      if (!supabaseConfigured) {
        setUser(currentUser);
        setProfile(null);
        setCompany(null);
        return;
      }

      setUser(currentUser);
      
      // Buscar profile e company
      const { profile, company } = await fetchUserData(currentUser.id);
      
      setProfile(profile);
      setCompany(company);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(currentUser); // Manter user mesmo com erro
      setProfile(null);
      setCompany(null);
    }
  }, [supabaseConfigured]);

  // ✅ INICIALIZAÇÃO
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      try {
        if (!supabaseConfigured) {
          console.warn('⚠️ Supabase não configurado');
          return;
        }

        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          return;
        }

        const currentSession = data?.session;
        setSession(currentSession);
        
        if (currentSession?.user) {
          await loadUserData(currentSession.user as User);
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // ✅ LISTENER DE AUTENTICAÇÃO
    if (supabaseConfigured) {
      let subscription: any;
      
      const setupAuthListener = async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          
          const { data } = supabase.auth.onAuthStateChange(
            async (event: string, currentSession: any) => {
              setSession(currentSession);
              
              if (event === 'SIGNED_IN' && currentSession?.user) {
                await loadUserData(currentSession.user as User);
                router.push('/dashboard');
              } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setCompany(null);
                router.push('/login');
              }
            }
          );
          
          subscription = data.subscription;
        } catch (error) {
          console.error('Error setting up auth listener:', error);
        }
      };

      setupAuthListener();

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [loadUserData, router, supabaseConfigured]);

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
      
      // Log da ação (opcional)
      try {
        await supabase.rpc('log_user_action', {
          action_name: 'login',
          resource_name: 'auth',
          action_details: { method: 'email_password' }
        });
      } catch (logError) {
        // Log error não é crítico
        console.warn('Error logging action:', logError);
      }
      
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
      if (!supabaseConfigured) {
        localStorage.removeItem('duri_auth_session');
      } else {
        const { supabase } = await import('@/lib/supabase');
        
        // Log da ação (opcional)
        try {
          await supabase.rpc('log_user_action', {
            action_name: 'logout',
            resource_name: 'auth'
          });
        } catch (logError) {
          console.warn('Error logging logout:', logError);
        }
        
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
      // Força logout mesmo em caso de erro
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

  // ✅ PROVIDER VALUE
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

// ✅ HOOK PRINCIPAL
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ✅ HOOK PARA TRACKING DATA
export function useTrackingData(filters?: { status?: string; reference?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useAuth();

  const fetchData = useCallback(async () => {
    if (!company) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      queryParams.append('company', company.slug);
      
      if (filters?.status) {
        queryParams.append('status', filters.status);
      }
      if (filters?.reference) {
        queryParams.append('reference', filters.reference);
      }

      const response = await fetch(`/api/asana/unified?${queryParams}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao carregar dados');
      }
      
    } catch (err) {
      console.error('Error loading tracking data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [company, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ✅ HOOK PARA PERMISSÕES
export function usePermissions() {
  const { profile } = useAuth();

  return {
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isOperator: ['operator', 'manager', 'admin'].includes(profile?.role || ''),
    canView: !!profile?.active,
    canEdit: ['operator', 'manager', 'admin'].includes(profile?.role || ''),
    canDelete: ['manager', 'admin'].includes(profile?.role || ''),
    canManageUsers: profile?.role === 'admin'
  };
}