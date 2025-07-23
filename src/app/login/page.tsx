// src/app/login/page.tsx - CORREÇÃO: EVITAR TRAVAMENTO EM "VERIFICANDO SISTEMA"
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, AlertCircle, Settings, Database, Copy, Anchor, Compass, Ship, Globe } from 'lucide-react';

// ✅ Loading component que mantém o tema marítimo
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
    }}>
      <div className="relative bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Anchor size={32} className="text-white" />
          </div>
          <p className="text-slate-300 text-lg font-medium">Carregando...</p>
        </div>
      </div>
    </div>
  );
}

// ✅ Component principal - DESIGN MARÍTIMO COM CORREÇÃO DE TRAVAMENTO
function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [initComplete, setInitComplete] = useState(false);

  const { signIn, user, profile, company, loading: authLoading, supabaseConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ CLIENT-SIDE DETECTION COM TIMEOUT
  useEffect(() => {
    const initClient = async () => {
      setIsClient(true);
      
      // ✅ TIMEOUT para evitar travamento
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Timeout na verificação do banco - continuando com estado ready');
        setDatabaseStatus('ready');
        setInitComplete(true);
      }, 5000); // 5 segundos timeout

      try {
        if (supabaseConfigured) {
          await checkDatabaseSetup();
        } else {
          setDatabaseStatus('ready'); // Se não configurado, considerar ready para mostrar o form
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        setDatabaseStatus('ready'); // Mesmo com erro, mostrar form
      } finally {
        clearTimeout(timeoutId);
        setInitComplete(true);
      }
    };
    
    initClient();
  }, [supabaseConfigured]);

  // ✅ DATABASE SETUP VERIFICATION COM TIMEOUT
  const checkDatabaseSetup = async () => {
    try {
      setDatabaseStatus('checking');
      
      const { supabase } = await import('@/lib/supabase');
      
      // ✅ Timeout na query para evitar travamento
      const queryPromise = supabase
        .from('companies')
        .select('id')
        .limit(1);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      await Promise.race([queryPromise, timeoutPromise]);
      
      console.log('✅ Banco de dados verificado');
      setDatabaseStatus('ready');
      
    } catch (error) {
      console.error('❌ Erro na verificação do banco:', error);
      
      if (error instanceof Error && error.message === 'Timeout') {
        console.warn('⚠️ Timeout na verificação do banco - considerando como configurado');
        setDatabaseStatus('ready');
      } else {
        setDatabaseStatus('missing');
        setError('Configure o banco de dados executando o SQL de setup.');
      }
    }
  };

  // ✅ REDIRECT AUTHENTICATED USERS
  useEffect(() => {
    if (!isClient || authLoading || !initComplete) return;
    
    if (user && profile) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      console.log('✅ Redirecionando usuário autenticado para:', redirectTo);
      router.push(redirectTo);
    }
  }, [user, profile, authLoading, router, searchParams, isClient, initComplete]);

  // ✅ HANDLE URL ERRORS
  useEffect(() => {
    if (!isClient) return;
    
    const urlError = searchParams.get('error');
    if (urlError) {
      const errorMessages = {
        no_profile: 'Perfil será criado automaticamente no próximo login.',
        access_denied: 'Acesso negado. Verifique suas permissões.',
        default: `Erro: ${urlError}`
      };
      setError(errorMessages[urlError] || errorMessages.default);
    }
  }, [searchParams, isClient]);

  // ✅ FORM SUBMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Iniciando login para:', formData.email);
      await signIn(formData.email, formData.password);
      console.log('✅ Login bem-sucedido');
      
    } catch (err: any) {
      console.error('❌ Erro no login:', err);
      
      const errorMessages = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Email not confirmed': 'Confirme seu email antes de fazer login.',
        'Too many requests': 'Muitas tentativas. Tente novamente em alguns minutos.'
      };
      
      setError(errorMessages[err.message] || err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ COPY SQL SETUP
  const copySetupSQL = async () => {
    const sql = `-- Execute este SQL no Supabase Dashboard > SQL Editor

-- CRIAR TABELA COMPANIES
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRIAR TABELA USER_PROFILES  
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERIR EMPRESA PADRÃO
INSERT INTO public.companies (name, display_name, slug, active) 
VALUES ('EMPRESA_PADRAO', 'Empresa Padrão', 'empresa-padrao', true);

-- HABILITAR RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);`;

    try {
      await navigator.clipboard.writeText(sql);
      alert('SQL copiado! Cole no Supabase SQL Editor.');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // ✅ MOSTRAR LOADING APENAS SE REALMENTE NECESSÁRIO
  if (!isClient || (authLoading && !initComplete)) {
    return <LoginLoading />;
  }

  // ✅ SUPABASE NOT CONFIGURED (OPCIONAL)
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
      }}>
        <div className="relative bg-slate-900/85 border border-amber-600/30 rounded-2xl p-8 shadow-2xl max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Settings size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Sistema Não Configurado</h2>
            <div className="bg-amber-600/15 border border-amber-500/30 rounded-xl p-6 text-left">
              <h3 className="font-semibold text-amber-200 mb-4 text-lg">Configure o Supabase:</h3>
              <ol className="text-amber-100 text-sm space-y-2 list-decimal list-inside">
                <li>Crie um projeto no <strong>supabase.com</strong></li>
                <li>Configure as variáveis no arquivo <code className="bg-black/30 px-2 py-1 rounded">.env.local</code></li>
                <li>Execute o SQL de configuração no Supabase</li>
                <li>Volte aqui e recarregue a página</li>
              </ol>
            </div>
            
            <button
              onClick={copySetupSQL}
              className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-medium flex items-center justify-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg mx-auto"
            >
              <Copy size={18} />
              <span>Copiar SQL de Setup</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN LOGIN INTERFACE - SEMPRE MOSTRA SE CHEGOU ATÉ AQUI
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
    }}>
      
      {/* ✅ NAUTICAL CORPORATE BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 overflow-hidden">
        {/* World Map Subtle Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-96 h-64" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='worldmap' x='0' y='0' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23ffffff'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23worldmap)'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Maritime Elements */}
        <div className="absolute top-20 left-12 opacity-8">
          <Ship size={120} className="text-slate-400 rotate-12" />
        </div>
        
        <div className="absolute bottom-24 right-16 opacity-10">
          <Compass size={100} className="text-red-400 animate-spin" style={{ animationDuration: '30s' }} />
        </div>
        
        <div className="absolute top-1/3 right-1/4 opacity-6">
          <Globe size={80} className="text-slate-500" />
        </div>

        <div className="absolute bottom-1/3 left-1/4 opacity-8">
          <Anchor size={60} className="text-red-500 rotate-45" />
        </div>

        {/* Ocean Depth Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-800/30"></div>
      </div>

      {/* ✅ MAIN LOGIN CONTAINER - CORPORATE MARITIME */}
      <div className="relative bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* Top Corporate Border */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
        
        {/* ✅ PREMIUM MARITIME HEADER */}
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            {/* Logo Integration with Maritime Elements */}
            <div className="flex justify-center mb-6 relative">
              <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-600/30">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto filter brightness-110 contrast-110"
                  onError={(e) => {
                    // Fallback se logo não carregar
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Subtle nautical accent */}
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <Anchor size={12} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Duri Trading
            </h1>
            <p className="text-slate-300 mb-4 text-lg font-medium">
              Sistema de Tracking Marítimo
            </p>
            
            {/* Corporate Maritime Tagline */}
            <div className="flex items-center justify-center space-x-3 text-sm">
              <div className="flex items-center space-x-1">
                <Ship size={14} className="text-red-400" />
                <span className="text-slate-400">Comércio</span>
              </div>
              <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
              <div className="flex items-center space-x-1">
                <Globe size={14} className="text-red-400" />
                <span className="text-slate-400">Global</span>
              </div>
              <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
              <div className="flex items-center space-x-1">
                <Compass size={14} className="text-red-400" />
                <span className="text-slate-400">Precisão</span>
              </div>
            </div>
          </div>

          {/* ✅ STATUS DO SISTEMA - APENAS SE MISSING */}
          {databaseStatus === 'missing' && (
            <div className="mb-6">
              <div className="flex items-center justify-between p-3 bg-amber-600/15 border border-amber-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Database size={16} className="text-amber-400" />
                  <span className="text-amber-200 text-sm font-medium">
                    Setup do banco necessário
                  </span>
                </div>
                
                <button
                  onClick={copySetupSQL}
                  className="flex items-center space-x-1 text-amber-200 hover:text-amber-100 text-sm"
                >
                  <Copy size={14} />
                  <span>SQL</span>
                </button>
              </div>
            </div>
          )}

          {/* ✅ ERROR DISPLAY */}
          {error && (
            <div className="mb-6 bg-red-600/15 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <p className="text-red-200 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* ✅ LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-slate-400 transition-all"
                  placeholder="seu@duritrading.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-12 pr-12 py-4 bg-slate-800/60 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-slate-400 transition-all"
                  placeholder="Sua senha corporativa"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 px-6 rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/20"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verificando Credenciais...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <LogIn className="w-5 h-5" />
                  <span>Acessar Sistema</span>
                </div>
              )}
            </button>
          </form>

          {/* Corporate Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-xs">
              Acesso seguro • Sistema corporativo • Duri Trading © 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ EXPORT DEFAULT com Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}