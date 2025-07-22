// src/providers/AuthProvider.tsx - ROBUSTO COM FALLBACKS DE ERRO
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext, type User, type UserProfile, type Company } from '@/contexts/AuthContext';

// ✅ VERIFICAR CONFIGURAÇÃO APENAS NO CLIENT
const checkSupabaseConfig = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return !!(supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('your_') && 
    !supabaseKey.includes('your_'));
};

// ✅ VERIFICAR SE TABELAS EXISTEM
const checkDatabaseSetup = async (): Promise<boolean> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Tentar uma query simples para verificar se as tabelas existem
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Tabelas não existem:', error.message);
      return false;
    }
    
    console.log('✅ Tabelas verificadas com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro na verificação das tabelas:', error);
    return false;
  }
};

// ✅ CRIAR EMPRESA PADRÃO SE NÃO EXISTIR
const ensureDefaultCompany = async (): Promise<Company | null> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Verificar se já existe
    const { data: existing, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', 'empresa-padrao')
      .single();
    
    if (existing && !fetchError) {
      console.log('✅ Empresa padrão já existe:', existing.name);
      return existing as Company;
    }
    
    // Criar se não existir
    console.log('🔄 Criando empresa padrão...');
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert({
        name: 'EMPRESA_PADRAO',
        display_name: 'Empresa Padrão',
        slug: 'empresa-padrao',
        active: true
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Erro ao criar empresa padrão:', createError);
      return null;
    }
    
    console.log('✅ Empresa padrão criada:', newCompany?.name);
    return newCompany as Company;
    
  } catch (error) {
    console.error('❌ Erro geral na criação da empresa:', error);
    return null;
  }
};

// ✅ AUTO-CREATE PROFILE COM FALLBACKS ROBUSTOS
const createProfileIfNotExists = async (user: User): Promise<{ profile: UserProfile | null; company: Company | null }> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    console.log('🔍 Verificando profile para usuário:', user.email);
    
    // Tentar buscar profile existente
    const { data: existingProfile, error: fetchError } = await supabase
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
      .eq('id', user.id)
      .single();

    if (existingProfile && !fetchError) {
      console.log('✅ Profile encontrado:', existingProfile.email);
      return {
        profile: existingProfile as UserProfile,
        company: (existingProfile as any)?.companies as Company
      };
    }

    console.log('⚠️ Profile não encontrado, tentando criar...');

    // Garantir que existe empresa padrão
    const defaultCompany = await ensureDefaultCompany();
    
    if (!defaultCompany) {
      console.error('❌ Não foi possível garantir empresa padrão');
      return { profile: null, company: null };
    }

    // Criar profile para o usuário
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        company_id: defaultCompany.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        role: 'viewer',
        active: true
      })
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
      .single();

    if (createError) {
      console.error('❌ Erro ao criar profile:', createError);
      
      // FALLBACK: Retornar dados básicos mesmo com erro
      return {
        profile: {
          id: user.id,
          company_id: defaultCompany.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          role: 'viewer',
          active: true,
          last_login: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as UserProfile,
        company: defaultCompany
      };
    }

    console.log('✅ Profile criado com sucesso:', newProfile?.email);
    
    return {
      profile: newProfile as UserProfile,
      company: (newProfile as any)?.companies as Company
    };

  } catch (error) {
    console.error('❌ Erro geral na criação de profile:', error);
    
    // FALLBACK FINAL: Dados mockados para não bloquear o login
    return {
      profile: {
        id: user.id,
        company_id: 'empresa-padrao-id',
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'viewer',
        active: true,
        last_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserProfile,
      company: {
        id: 'empresa-padrao-id',
        name: 'EMPRESA_PADRAO',
        display_name: 'Empresa Padrão',
        slug: 'empresa-padrao',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Company
    };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ ESTADOS INICIAIS CONSISTENTES
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  
  const router = useRouter();

  // ✅ DETECTAR CLIENT-SIDE E VERIFICAR DATABASE
  useEffect(() => {
    const initClient = async () => {
      setIsClient(true);
      const configured = checkSupabaseConfig();
      setSupabaseConfigured(configured);
      
      if (configured) {
        const dbReady = await checkDatabaseSetup();
        setDatabaseReady(dbReady);
        
        if (!dbReady) {
          setError('Banco de dados não configurado. Execute o SQL de setup no Supabase.');
        }
      }
    };
    
    initClient();
  }, []);

  // ✅ LOAD USER DATA COM FALLBACKS
  const loadUserData = useCallback(async (currentUser: User) => {
    if (!isClient || !supabaseConfigured) return;
    
    try {
      console.log('🔄 Carregando dados do usuário:', currentUser.email);
      setError(null);
      
      const { profile: userProfile, company: userCompany } = await createProfileIfNotExists(currentUser);
      
      if (!userProfile) {
        console.warn('⚠️ Profile não pôde ser criado, mas login será permitido');
        // Não bloquear o login mesmo sem profile
      }
      
      setProfile(userProfile);
      setCompany(userCompany);
      console.log('✅ Dados carregados:', { 
        profile: userProfile?.email, 
        company: userCompany?.name 
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
      // Não definir error para não bloquear o login
      console.warn('⚠️ Continuando com login básico devido a erro no profile');
    }
  }, [isClient, supabaseConfigured]);

  // ✅ INITIALIZE AUTH APENAS NO CLIENT
  useEffect(() => {
    if (!isClient || !supabaseConfigured) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        console.log('🔄 Inicializando autenticação...');
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          console.log('✅ Sessão encontrada para:', currentSession.user.email);
          setUser(currentSession.user as User);
          setSession(currentSession);
          await loadUserData(currentSession.user as User);
        } else {
          console.log('ℹ️ Nenhuma sessão ativa encontrada');
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth state change:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session?.user) {
              setUser(session.user as User);
              setSession(session);
              await loadUserData(session.user as User);
            } else if (event === 'SIGNED_OUT') {
              console.log('👋 Usuário deslogado');
              setUser(null);
              setProfile(null);
              setCompany(null);
              setSession(null);
              setError(null);
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('❌ Erro na inicialização da auth:', error);
        setError('Erro na inicialização da autenticação');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [isClient, supabaseConfigured, loadUserData]);

  // ✅ SIGN IN COM MELHOR ERROR HANDLING
  const signIn = async (email: string, password: string): Promise<void> => {
    if (!isClient || !supabaseConfigured) {
      throw new Error('Sistema não configurado.');
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Tentando login para:', email);
      
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ Erro no login:', error.message);
        throw error;
      }
      
      console.log('✅ Login bem-sucedido:', email);
      
    } catch (error) {
      console.error('❌ Erro no signIn:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIGN UP DESABILITADO (será implementado depois)
  const signUp = async (email: string, password: string, companySlug: string, fullName?: string): Promise<void> => {
    throw new Error('Criação de conta desabilitada. Entre em contato com o administrador.');
  };

  // ✅ SIGN OUT
  const signOut = async (): Promise<void> => {
    setLoading(true);
    
    try {
      if (isClient && supabaseConfigured) {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      
      setUser(null);
      setProfile(null);
      setCompany(null);
      setSession(null);
      setError(null);
      
      console.log('✅ Logout realizado');
      router.push('/login');
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Limpar estado mesmo com erro
      setUser(null);
      setProfile(null);
      setCompany(null);
      setSession(null);
      setError(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // ✅ REFRESH PROFILE
  const refreshProfile = async (): Promise<void> => {
    if (user && isClient) {
      await loadUserData(user);
    }
  };

  return (
    <div suppressHydrationWarning={true}>
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
    </div>
  );
}