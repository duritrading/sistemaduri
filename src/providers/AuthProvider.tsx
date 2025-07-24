// src/providers/AuthProvider.tsx - ULTRA RÍGIDO - ZERO LOOPS GARANTIDO
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext, type User, type UserProfile, type Company } from '@/contexts/AuthContext';
import { AccessDeniedModal } from '@/components/AccessDeniedModal';

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
      .eq('active', true)
      .single();

    if (fetchError || !existingProfile) {
      console.log('❌ Profile não encontrado ou usuário inativo:', user.email);
      return { profile: null, company: null };
    }

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
    return { profile: null, company: null };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ ESTADOS PRINCIPAIS
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  
  // ✅ ESTADOS PARA CONTROLAR LOOPS E MODAL
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [shouldStopChecking, setShouldStopChecking] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState({
    title: '',
    message: ''
  });

  // ✅ REFS ULTRA-RÍGIDOS PARA CONTROLE TOTAL
  const isCheckingStatusRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const failedChecksRef = useRef(0);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  // ✅ VERIFICAR SE É PÁGINA ADMIN (para comportamento diferente)
  const isAdminPage = pathname?.startsWith('/admin') || false;

  // ✅ CLEANUP TOTAL DE TODOS OS TIMERS
  const cleanupAllTimers = useCallback(() => {
    console.log('🧹 Limpando todos os timers...');
    
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    isCheckingStatusRef.current = false;
    console.log('✅ Todos os timers limpos');
  }, []);

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

  // ✅ SIGN OUT SEM LOOP - LIMPA TUDO
  const signOut = async (): Promise<void> => {
    if (isLoggingOut) {
      console.log('⚠️ Logout já em andamento - ignorando chamada duplicada');
      return;
    }

    console.log('🔄 Iniciando logout...');
    setIsLoggingOut(true);
    setShouldStopChecking(true);
    
    // ✅ CLEANUP TOTAL IMEDIATO
    cleanupAllTimers();
    
    // Limpar estado local primeiro
    setUser(null);
    setProfile(null);
    setCompany(null);
    setSession(null);
    setError(null);
    setShowAccessDeniedModal(false);
    
    // ✅ RESET REFS
    isCheckingStatusRef.current = false;
    lastCheckTimeRef.current = 0;
    failedChecksRef.current = 0;
    currentUserIdRef.current = null;
    
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
    
    // ✅ RESETAR ESTADOS DE CONTROLE APÓS DELAY
    setTimeout(() => {
      setIsLoggingOut(false);
      setShouldStopChecking(false);
      isInitializedRef.current = false;
    }, 3000);
    
    console.log('✅ Logout concluído');
  };

  // ✅ MOSTRAR MODAL DE ACESSO NEGADO
  const showAccessDenied = useCallback((reason: string) => {
    // ✅ PARAR TODAS AS VERIFICAÇÕES IMEDIATAMENTE
    setShouldStopChecking(true);
    cleanupAllTimers();
    
    const messages = {
      'USER_DELETED': {
        title: 'Conta Removida',
        message: 'Sua conta foi removida do sistema. Entre em contato com o administrador se acredita que isso é um erro.'
      },
      'USER_INACTIVE': {
        title: 'Conta Desativada', 
        message: 'Sua conta foi desativada. Entre em contato com o administrador para reativar seu acesso.'
      },
      'INVALID_USER': {
        title: 'Acesso Negado',
        message: 'Sua conta não tem acesso ao sistema ou foi desativada. Verifique suas credenciais ou entre em contato com o administrador.'
      }
    };
    
    const messageData = messages[reason as keyof typeof messages] || messages.INVALID_USER;
    
    setAccessDeniedMessage(messageData);
    setShowAccessDeniedModal(true);
  }, [cleanupAllTimers]);

  // ✅ VERIFICAR STATUS ATIVO - ULTRA RÍGIDO
  const checkUserActiveStatus = useCallback(async (currentUser: User, source: string = 'unknown') => {
    // ✅ VERIFICAÇÕES DE SEGURANÇA ULTRA RÍGIDAS
    if (!isClient || 
        !supabaseConfigured || 
        !currentUser || 
        isLoggingOut || 
        shouldStopChecking || 
        isCheckingStatusRef.current ||
        currentUser.id !== currentUserIdRef.current) {
      
      console.log(`⏭️ BLOQUEANDO verificação (${source}):`, {
        isClient,
        supabaseConfigured: !!supabaseConfigured,
        hasUser: !!currentUser,
        isLoggingOut,
        shouldStopChecking,
        isChecking: isCheckingStatusRef.current,
        userChanged: currentUser?.id !== currentUserIdRef.current
      });
      return;
    }

    // ✅ DEBOUNCE ULTRA RÍGIDO
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimeRef.current;
    const minInterval = isAdminPage ? 60000 : 30000; // 1min para admin, 30s para outras páginas
    
    if (timeSinceLastCheck < minInterval) {
      console.log(`⏭️ BLOQUEANDO por debounce (${source}): aguardando ${minInterval - timeSinceLastCheck}ms`);
      return;
    }

    // ✅ BACKOFF EXPONENCIAL ULTRA CONSERVADOR
    if (failedChecksRef.current >= 3) {
      const backoffTime = Math.pow(2, failedChecksRef.current) * 2000; // 8s, 16s, 32s...
      if (timeSinceLastCheck < backoffTime) {
        console.log(`⏭️ BLOQUEANDO por backoff (${failedChecksRef.current} falhas): aguardando ${backoffTime - timeSinceLastCheck}ms`);
        return;
      }
    }

    // ✅ MARCAR COMO EM VERIFICAÇÃO
    isCheckingStatusRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      console.log(`🔍 EXECUTANDO verificação: ${currentUser.email} (${source})`);
      
      // ✅ TIMEOUT ULTRA CONSERVADOR
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ TIMEOUT na verificação de status');
      }, 8000); // 8s timeout
      
      const response = await fetch('/api/auth/validate-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success && result.shouldLogout) {
        console.log('🚨 USUÁRIO DEVE SER DESLOGADO:', result.reason);
        showAccessDenied(result.reason);
        failedChecksRef.current = 0;
        return;
      }

      if (result.success) {
        console.log(`✅ Status confirmado: ${currentUser.email} (${source})`);
        failedChecksRef.current = 0;
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`⚠️ ERRO na verificação (${source}):`, errorMsg);
      
      // ✅ INCREMENTAR FALHAS COM LIMITE
      failedChecksRef.current = Math.min(failedChecksRef.current + 1, 10);
      
      // ✅ PARAR APÓS MUITAS FALHAS
      if (failedChecksRef.current >= 5) {
        console.log(`🛑 PARANDO verificações após ${failedChecksRef.current} falhas`);
        setShouldStopChecking(true);
        cleanupAllTimers();
      }
    } finally {
      isCheckingStatusRef.current = false;
    }
  }, [isClient, supabaseConfigured, isLoggingOut, shouldStopChecking, isAdminPage, showAccessDenied, cleanupAllTimers]);

  // ✅ LOAD USER DATA
  const loadUserData = useCallback(async (currentUser: User) => {
    if (!isClient || !supabaseConfigured || isLoggingOut || shouldStopChecking) return;
    
    try {
      console.log('🔄 Carregando dados do usuário:', currentUser.email);
      setError(null);
      
      // ✅ ATUALIZAR REF DO USUÁRIO ATUAL
      currentUserIdRef.current = currentUser.id;
      
      const { profile: userProfile, company: userCompany } = await getValidUserProfile(currentUser);
      
      if (!userProfile || !userCompany) {
        console.log('🚨 USUÁRIO INVÁLIDO - MOSTRANDO MODAL');
        showAccessDenied('INVALID_USER');
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
      showAccessDenied('INVALID_USER');
    }
  }, [isClient, supabaseConfigured, isLoggingOut, shouldStopChecking, showAccessDenied]);

  // ✅ INITIALIZE AUTH - APENAS UMA VEZ
  useEffect(() => {
    if (!isClient || !supabaseConfigured || isInitializedRef.current) {
      if (!isInitializedRef.current) {
        setLoading(false);
      }
      return;
    }

    isInitializedRef.current = true;

    const initAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        console.log('🔄 Inicializando autenticação (ÚNICA VEZ)...');
        
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
              cleanupAllTimers();
              setUser(null);
              setProfile(null);
              setCompany(null);
              setSession(null);
              setError(null);
              setShowAccessDeniedModal(false);
              setShouldStopChecking(false);
              currentUserIdRef.current = null;
              failedChecksRef.current = 0;
            }
          }
        );

        return () => {
          subscription.unsubscribe();
          cleanupAllTimers();
        };
      } catch (error) {
        console.error('❌ Erro na inicialização da auth:', error);
        setError('Erro na inicialização da autenticação');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [isClient, supabaseConfigured, loadUserData, cleanupAllTimers]);

  // ✅ VERIFICAÇÃO PERIÓDICA - ULTRA CONTROLADA
  useEffect(() => {
    // ✅ LIMPAR INTERVAL ANTERIOR PRIMEIRO
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    if (!user || 
        !isClient || 
        !supabaseConfigured || 
        isLoggingOut || 
        shouldStopChecking ||
        !currentUserIdRef.current ||
        currentUserIdRef.current !== user.id) {
      return;
    }

    // ✅ VERIFICAÇÃO INICIAL COM DELAY
    const initialDelay = setTimeout(() => {
      if (!isLoggingOut && !shouldStopChecking && currentUserIdRef.current === user.id) {
        checkUserActiveStatus(user, 'periodic-init');
      }
    }, 10000); // 10s delay inicial

    // ✅ INTERVALO MAIS ESPAÇADO PARA ADMINS
    const intervalTime = isAdminPage ? 300000 : 180000; // 5min admin, 3min outros
    
    checkIntervalRef.current = setInterval(() => {
      if (!isLoggingOut && 
          !shouldStopChecking && 
          !isCheckingStatusRef.current &&
          currentUserIdRef.current === user.id) {
        checkUserActiveStatus(user, 'periodic-interval');
      }
    }, intervalTime);

    return () => {
      clearTimeout(initialDelay);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user?.id, checkUserActiveStatus, isLoggingOut, shouldStopChecking, isAdminPage]); // ✅ Só user.id como dependência

  // ✅ FOCUS EVENT - ULTRA CONSERVADOR
  useEffect(() => {
    if (!user || !isClient || isLoggingOut || shouldStopChecking || isAdminPage) {
      // ✅ NÃO VERIFICAR NO FOCUS EM PÁGINAS ADMIN
      return;
    }

    const handleFocus = () => {
      // ✅ LIMPAR TIMEOUT ANTERIOR
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      // ✅ DEBOUNCE ULTRA CONSERVADOR DE 10 SEGUNDOS
      focusTimeoutRef.current = setTimeout(() => {
        if (!isLoggingOut && 
            !shouldStopChecking && 
            !isCheckingStatusRef.current &&
            currentUserIdRef.current === user.id) {
          console.log('🔄 Focus após 10s - verificando status (apenas para não-admin)');
          checkUserActiveStatus(user, 'focus-event');
        }
      }, 10000);
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [user?.id, checkUserActiveStatus, isLoggingOut, shouldStopChecking, isAdminPage]);

  // ✅ CLEANUP GERAL
  useEffect(() => {
    return () => {
      cleanupAllTimers();
    };
  }, [cleanupAllTimers]);

  // ✅ SIGN IN
  const signIn = async (email: string, password: string): Promise<void> => {
    if (!isClient || !supabaseConfigured) {
      throw new Error('Sistema não configurado.');
    }

    setLoading(true);
    setError(null);
    setShouldStopChecking(false);
    failedChecksRef.current = 0;
    
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
    if (user && isClient && !isLoggingOut && !shouldStopChecking) {
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
        
        {/* ✅ MODAL BONITO PARA ACESSO NEGADO */}
        <AccessDeniedModal
          isOpen={showAccessDeniedModal}
          title={accessDeniedMessage.title}
          message={accessDeniedMessage.message}
          onConfirm={signOut}
          autoCloseSeconds={5}
        />
      </AuthContext.Provider>
    </div>
  );
}