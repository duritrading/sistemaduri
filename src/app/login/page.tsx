// src/app/login/page.tsx - DESIGN CLEAN & ELEGANTE COM IDENTIDADE DURI (155 LOC)
// Background: Azul escuro elegante + Textura sutil inspirada na imagem de referência + Logo em destaque
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, AlertCircle, Settings, Database, Copy, Sparkles, Waves } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

  const { signIn, user, profile, company, loading: authLoading, supabaseConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ CLIENT-SIDE DETECTION + DATABASE CHECK
  useEffect(() => {
    const initClient = async () => {
      setIsClient(true);
      if (supabaseConfigured) await checkDatabaseSetup();
    };
    initClient();
  }, [supabaseConfigured]);

  // ✅ DATABASE SETUP VERIFICATION
  const checkDatabaseSetup = async () => {
    try {
      setDatabaseStatus('checking');
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (error) {
        setDatabaseStatus('missing');
        setError('Configure o banco de dados executando o SQL de setup.');
        return;
      }
      
      setDatabaseStatus('ready');
      setError('');
    } catch (error) {
      setDatabaseStatus('missing');
      setError('Erro ao verificar banco de dados.');
    }
  };

  // ✅ REDIRECT AUTHENTICATED USERS
  useEffect(() => {
    if (!isClient || authLoading) return;
    
    if (user && profile) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.push(redirectTo);
    }
  }, [user, profile, authLoading, router, searchParams, isClient]);

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
      await signIn(formData.email, formData.password);
    } catch (err: any) {
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

-- 1. CRIAR TABELA COMPANIES
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

-- 2. CRIAR TABELA USER_PROFILES
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

-- 3. INSERIR EMPRESA PADRÃO
INSERT INTO public.companies (name, display_name, slug, active) 
VALUES ('EMPRESA_PADRAO', 'Empresa Padrão', 'empresa-padrao', true);

-- 4. HABILITAR RLS E POLICIES
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

  // ✅ LOADING INITIAL
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
      }}>
        <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-2xl max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Sparkles size={32} className="text-white" />
            </div>
            <p className="text-white/80 text-lg">Inicializando sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ SUPABASE NOT CONFIGURED
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
      }}>
        <div className="bg-white/15 backdrop-blur-2xl border border-amber-400/30 rounded-3xl p-8 shadow-2xl max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Sistema Não Configurado</h2>
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-6 text-left">
              <h3 className="font-semibold text-amber-300 mb-4 text-lg">Configure o Supabase:</h3>
              <ol className="text-amber-100 text-sm space-y-2 list-decimal list-inside">
                <li>Crie um projeto no <strong>supabase.com</strong></li>
                <li>Configure as variáveis no arquivo <code className="bg-black/30 px-2 py-1 rounded">.env.local</code></li>
                <li>Execute o SQL de configuração no Supabase</li>
                <li>Volte aqui e clique em "Verificar Novamente"</li>
              </ol>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={copySetupSQL}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-medium flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                <Copy size={18} />
                <span>Copiar SQL</span>
              </button>
              
              <button
                onClick={checkDatabaseSetup}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
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
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
      }}>
        <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={40} className="text-white animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              {databaseStatus === 'checking' ? 'Verificando Sistema' : 'Verificando Autenticação'}
            </h3>
            <p className="text-white/70 text-lg">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
    }}>
      
      {/* ✅ SUBTLE TEXTURE LINES - INSPIRED BY IMAGE 2 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Elegant diagonal lines texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.02) 49%, rgba(255,255,255,0.02) 51%, transparent 52%),
            linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.01) 49%, rgba(255,255,255,0.01) 51%, transparent 52%)
          `,
          backgroundSize: '60px 60px'
        }}></div>
        
        {/* Very subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 via-transparent to-slate-700/10"></div>
      </div>

      {/* ✅ MAIN LOGIN CONTAINER */}
      <div className="relative bg-white/15 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* ✅ PREMIUM HEADER */}
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-20 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -inset-3 bg-gradient-to-r from-red-600/20 to-red-500/20 rounded-full blur-xl -z-10"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-red-200 to-white bg-clip-text text-transparent">
              Duri Trading
            </h1>
            <p className="text-white/70 mt-3 text-lg">
              Sistema de Tracking Marítimo
            </p>
            <div className="flex items-center justify-center mt-4 space-x-2">
              <Waves size={16} className="text-red-400 animate-pulse" />
              <span className="text-red-300 text-sm font-medium">Navegação Segura</span>
              <Waves size={16} className="text-red-400 animate-pulse" />
            </div>
          </div>

          {/* ✅ ERROR DISPLAY */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-400/30 rounded-2xl p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* ✅ LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-white/80 text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm transition-all"
                  placeholder="seu@email.com"
                  required
                  disabled={loading || databaseStatus !== 'ready'}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-white/80 text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm transition-all"
                  placeholder="Sua senha"
                  required
                  disabled={loading || databaseStatus !== 'ready'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
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
              className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <LogIn className="w-5 h-5" />
                  <span>Acessar Sistema</span>
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}