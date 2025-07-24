// src/providers/AuthProvider.tsx - SEM EMPRESA PADRÃO + VERIFICAÇÃO RIGOROSA
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
  .select('id, name')
  .eq('active', true)
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

// ✅ BUSCAR PROFILE COM VERIFICAÇÃO RIGOROSA - SEM FALLBACKS
const getValidUserProfile = async (user: User): Promise<{ profile: UserProfile | null; company: Company | null }> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    console.log('🔍 Buscando profile válido para:', user.email);
    
    // ✅ BUSCAR PROFILE EXISTENTE COM VERIFICAÇÃO DE STATUS ATIVO
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
      .eq('active', true)  // ✅ SÓ BUSCAR USUÁRIOS ATIVOS
      .single();

    if (fetchError || !existingProfile) {
      console.log('❌ Profile não encontrado ou usuário inativo:', user.email);
      
      if (fetchError?.code === 'PGRST116') {
        console.log('🚨 Usuário não existe no sistema');
      } else {
        console.log('🚨 Usuário existe mas está inativo');
      }
      
      // ✅ NÃO CRIAR FALLBACKS - REJEITAR COMPLETAMENTE
      return { profile: null, company: null };
    }

    // ✅ VERIFICAR SE A EMPRESA ESTÁ ATIVA
    const userCompany = (existingProfile as any)?.companies as Company;
    if (!userCompany || !userCompany.active) {
      console.log('❌ Empresa do usuário não encontrada ou inativa:', user.email);
      return { profile: null, company: null };
    }

    console.log('✅ Profile válido encontrado:', existingProfile.email, '| Empresa:', userCompany.display_name);
    
    return {
      profile: existingProfile as UserProfile,
      company: userCompany
    };

  } catch (error) {
    console.error('❌ Erro ao buscar profile válido:', error);
    // ✅ EM CASO DE ERRO, NÃO CRIAR FALLBACKS
    return { profile: null, company: null };
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

  // ✅ SIGN OUT CORRIGIDO
  const signOut = async (): Promise<void> => {
    console.log('🔄 Iniciando logout...');
    setLoading(true);
    
    // Limpar estado local primeiro
    setUser(null);
    setProfile(null);
    setCompany(null);
    setSession(null);
    setError(null);
    
    try {
      if (isClient && supabaseConfigured) {
        const { supabase } = await import('@/lib/supabase');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('✅ Fazendo logout do Supabase...');
          const { error } = await supabase.auth.signOut();
          
          if (error && !error.message.includes('Auth session missing')) {
            console.warn('⚠️ Erro no logout:', error.message);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro durante logout:', error);
    }
    
    setLoading(false);
    
    try {
      router.push('/login');
    } catch (routerError) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    console.log('✅ Logout concluído');
  };

  // ✅ VERIFICAR STATUS ATIVO COM LOGOUT IMEDIATO
  const checkUserActiveStatus = useCallback(async (currentUser: User) => {
    if (!isClient || !supabaseConfigured || !currentUser) return;

    try {
      console.log('🔍 Verificando status ativo para:', currentUser.email);
      
      const response = await fetch('/api/auth/validate-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      if (!response.ok) {
        console.warn('⚠️ Erro na verificação de status:', response.status);
        return;
      }

      const result = await response.json();
      
      if (!result.success && result.shouldLogout) {
        console.log('🚨 USUÁRIO DEVE SER DESLOGADO:', result.reason);
        
        const messages = {
          'USER_DELETED': 'Sua conta foi removida do sistema.',
          'USER_INACTIVE': 'Sua conta foi desativada. Entre em contato com o administrador.'
        };
        
        const message = messages[result.reason as keyof typeof messages] || 'Acesso revogado.';
        
        if (typeof window !== 'undefined') {
          alert(`🚨 ${message}\n\nVocê será redirecionado para a tela de login.`);
        }
        
        // ✅ LOGOUT IMEDIATO
        await signOut();
        return;
      }

      if (result.success) {
        console.log('✅ Status ativo confirmado para:', currentUser.email);
      }

    } catch (error) {
      console.warn('⚠️ Erro na verificação de status ativo:', error);
    }
  }, [isClient, supabaseConfigured, signOut]);

  // ✅ LOAD USER DATA COM VERIFICAÇÃO RIGOROSA - SEM FALLBACKS
  const loadUserData = useCallback(async (currentUser: User) => {
    if (!isClient || !supabaseConfigured) return;
    
    try {
      console.log('🔄 Carregando dados do usuário:', currentUser.email);
      setError(null);
      
      // ✅ BUSCAR APENAS USUÁRIOS VÁLIDOS E ATIVOS
      const { profile: userProfile, company: userCompany } = await getValidUserProfile(currentUser);
      
      if (!userProfile || !userCompany) {
        console.log('🚨 USUÁRIO INVÁLIDO - FORÇANDO LOGOUT');
        
        // ✅ MOSTRAR MENSAGEM E FORÇAR LOGOUT IMEDIATO
        if (typeof window !== 'undefined') {
          alert('🚨 Sua conta não tem acesso ao sistema ou foi desativada.\n\nVocê será redirecionado para a tela de login.');
        }
        
        await signOut();
        return;
      }
      
      setProfile(userProfile);
      setCompany(userCompany);
      
      console.log('✅ Dados carregados para usuário válido:', { 
        profile: userProfile.email, 
        company: userCompany.display_name 
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
      
      // ✅ EM CASO DE ERRO, FORÇAR LOGOUT
      console.log('🚨 ERRO NO CARREGAMENTO - FORÇANDO LOGOUT');
      await signOut();
    }
  }, [isClient, supabaseConfigured, signOut]);

  // ✅ INITIALIZE AUTH
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

  // ✅ VERIFICAÇÃO PERIÓDICA A CADA 2 MINUTOS
  useEffect(() => {
    if (!user || !isClient || !supabaseConfigured) return;

    // Verificar imediatamente
    checkUserActiveStatus(user);

    // Verificar a cada 2 minutos
    const interval = setInterval(() => {
      checkUserActiveStatus(user);
    }, 120000);

    return () => clearInterval(interval);
  }, [user, checkUserActiveStatus]);

  // ✅ VERIFICAR EM FOCUS EVENTS
  useEffect(() => {
    if (!user || !isClient) return;

    const handleFocus = () => {
      console.log('🔄 Foco retornado - verificando status do usuário');
      checkUserActiveStatus(user);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, checkUserActiveStatus]);

  // ✅ SIGN IN COM VERIFICAÇÃO IMEDIATA
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

  // ✅ SIGN UP DESABILITADO
  const signUp = async (email: string, password: string, companySlug: string, fullName?: string): Promise<void> => {
    throw new Error('Criação de conta desabilitada. Entre em contato com o administrador.');
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