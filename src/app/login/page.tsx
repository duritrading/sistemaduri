// src/app/login/page.tsx - SEM BOTÃO DE CRIAR CONTA (APENAS ADMIN PODE CRIAR)
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, AlertCircle, Settings, Database, Copy, Shield } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

  const { signIn, user, profile, company, loading: authLoading, supabaseConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ DETECTAR CLIENT-SIDE E VERIFICAR DATABASE
  useEffect(() => {
    const initClient = async () => {
      setIsClient(true);
      
      if (supabaseConfigured) {
        await checkDatabaseSetup();
      }
    };
    
    initClient();
  }, [supabaseConfigured]);

  // ✅ VERIFICAR SE BANCO ESTÁ CONFIGURADO
  const checkDatabaseSetup = async () => {
    try {
      setDatabaseStatus('checking');
      
      const { supabase } = await import('@/lib/supabase');
      
      // Tentar query simples para verificar tabelas
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Tabelas não encontradas:', error.message);
        setDatabaseStatus('missing');
        setError('Banco de dados não configurado. Execute o SQL de setup no Supabase.');
        return;
      }
      
      console.log('✅ Banco de dados configurado');
      setDatabaseStatus('ready');
      setError('');
      
    } catch (error) {
      console.error('❌ Erro na verificação do banco:', error);
      setDatabaseStatus('missing');
      setError('Erro ao verificar banco de dados.');
    }
  };

  // ✅ REDIRECT SE JÁ AUTENTICADO
  useEffect(() => {
    if (!isClient) return;
    
    if (user && profile && !authLoading) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      console.log('✅ Redirecionando usuário autenticado para:', redirectTo);
      router.push(redirectTo);
    }
  }, [user, profile, authLoading, router, searchParams, isClient]);

  // ✅ TRATAR ERROS DA URL
  useEffect(() => {
    if (!isClient) return;
    
    const urlError = searchParams.get('error');
    if (urlError) {
      switch (urlError) {
        case 'no_profile':
          setError('Perfil não encontrado. O sistema tentará criar automaticamente no próximo login.');
          break;
        case 'access_denied':
          setError('Acesso negado. Verifique suas permissões.');
          break;
        default:
          setError(`Erro: ${urlError}`);
      }
    }
  }, [searchParams, isClient]);

  // ✅ HANDLE FORM SUBMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isClient) return;

    if (!supabaseConfigured) {
      setError('Sistema não configurado. Configure as variáveis do Supabase primeiro.');
      return;
    }

    if (databaseStatus === 'missing') {
      setError('Execute o SQL de setup no Supabase antes de fazer login.');
      return;
    }

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
      
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Por favor, confirme seu email antes de fazer login.');
      } else if (err.message?.includes('Too many requests')) {
        setError('Muitas tentativas. Tente novamente em alguns minutos.');
      } else {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ COPIAR SQL PARA CLIPBOARD
  const copySetupSQL = async () => {
    const sql = `-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. DELETAR TABELAS EXISTENTES (se houver problemas)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.tracking_data CASCADE; 
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. CRIAR TABELA COMPANIES
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

-- 3. CRIAR TABELA USER_PROFILES
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

-- 4. INSERIR EMPRESA PADRÃO
INSERT INTO public.companies (name, display_name, slug, active) 
VALUES ('EMPRESA_PADRAO', 'Empresa Padrão', 'empresa-padrao', true);

-- 5. HABILITAR RLS E POLICIES PERMISSIVAS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);`;

    try {
      await navigator.clipboard.writeText(sql);
      alert('SQL copiado para o clipboard! Cole no Supabase SQL Editor.');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // ✅ LOADING INICIAL
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-8">
            <div className="text-center">
              <Loader2 size={32} className="text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando sistema...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ SUPABASE NÃO CONFIGURADO
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-8 shadow-2xl max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sistema Não Configurado</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-amber-800 mb-2">Configure o Supabase:</h3>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Acesse o arquivo <code className="bg-amber-100 px-1 rounded">.env.local</code></li>
                <li>Configure as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                <li>Reinicie o servidor de desenvolvimento</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ BANCO NÃO CONFIGURADO
  if (databaseStatus === 'missing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm border border-red-200/50 rounded-2xl p-8 shadow-2xl max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Banco de Dados Não Configurado</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-red-800 mb-2">Execute o SQL no Supabase:</h3>
              <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                <li>Acesse o Supabase Dashboard</li>
                <li>Vá em <strong>SQL Editor</strong></li>
                <li>Cole e execute o SQL abaixo</li>
                <li>Volte aqui e clique em "Verificar Novamente"</li>
              </ol>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={copySetupSQL}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-blue-700"
              >
                <Copy size={16} />
                <span>Copiar SQL</span>
              </button>
              
              <button
                onClick={checkDatabaseSetup}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
              >
                Verificar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ LOADING AUTH STATE
  if (authLoading || databaseStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="text-white animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {databaseStatus === 'checking' ? 'Verificando Sistema' : 'Verificando Autenticação'}
            </h3>
            <p className="text-gray-600">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-2xl max-w-md w-full">
        
        {/* ✅ HEADER */}
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/duriLogo.webp" 
                alt="Duri Trading" 
                className="h-16 w-auto drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
              Sistema Duri Trading
            </h1>
            <p className="text-gray-600 mt-2">
              Faça login para acessar o sistema
            </p>
            
            {/* Status do banco */}
            {databaseStatus === 'ready' && (
              <div className="flex items-center justify-center space-x-2 mt-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-green-600">Sistema Online</span>
              </div>
            )}
          </div>

          {/* ✅ ERROR DISPLAY */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Erro no Login</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* ✅ LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b51c26] focus:border-transparent bg-white/80"
                  placeholder="seu@email.com"
                  required
                  disabled={loading || databaseStatus !== 'ready'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b51c26] focus:border-transparent bg-white/80"
                  placeholder="Sua senha"
                  required
                  disabled={loading || databaseStatus !== 'ready'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || databaseStatus !== 'ready'}
              className="w-full bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <LogIn className="w-5 h-5" />
                  <span>Entrar</span>
                </div>
              )}
            </button>
          </form>

          {/* ✅ ACESSO RESTRITO INFO */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 font-medium text-sm">Acesso Restrito</p>
                  <p className="text-blue-700 text-xs mt-1">
                    Apenas usuários autorizados podem acessar o sistema. 
                    Entre em contato com o administrador para criar sua conta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ FOOTER INFO */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Sistema de Tracking Marítimo • Duri Trading
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}