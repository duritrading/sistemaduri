// src/app/login/page.tsx - LOGIN REAL SEM MOCKS
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, Building2, AlertCircle, CheckCircle, Settings, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companySlug: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  const { signIn, signUp, user, loading: authLoading, supabaseConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ CARREGAR EMPRESAS REAIS DO ASANA
  useEffect(() => {
    loadCompaniesFromAsana();
  }, []);

  const loadCompaniesFromAsana = async () => {
    try {
      const response = await fetch('/api/asana/unified', {
        method: 'GET',
        cache: 'no-store'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Extrair empresas dos dados reais
          const { extractCompaniesFromTrackings } = await import('@/lib/auth');
          const extractedCompanies = extractCompaniesFromTrackings(result.data);
          setCompanies(extractedCompanies);
          
          if (extractedCompanies.length > 0 && !formData.companySlug) {
            setFormData(prev => ({ ...prev, companySlug: extractedCompanies[0].id }));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  // ✅ REDIRECT SE JÁ AUTENTICADO
  useEffect(() => {
    if (user && !authLoading) {
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.push(redirectTo);
    }
  }, [user, authLoading, router, searchParams]);

  // ✅ HANDLE FORM SUBMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!supabaseConfigured) {
      setError('Sistema não configurado. Configure as variáveis do Supabase primeiro.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Validações para signup
        if (!formData.fullName.trim()) {
          throw new Error('Nome completo é obrigatório');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Senhas não coincidem');
        }
        if (formData.password.length < 6) {
          throw new Error('Senha deve ter pelo menos 6 caracteres');
        }
        if (!formData.companySlug) {
          throw new Error('Selecione uma empresa');
        }

        await signUp(formData.email, formData.password, formData.companySlug, formData.fullName);
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar.');
        
        // Auto-switch para login após 3 segundos
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess('');
        }, 3000);
      } else {
        // Login
        await signIn(formData.email, formData.password);
        // Redirect é tratado pelo useEffect acima
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLE INPUT CHANGES
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error on input change
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1a1a] to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#b51c26] mx-auto mb-4" />
          <p className="text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // ✅ SE SUPABASE NÃO CONFIGURADO
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1a1a] to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Configuração Necessária
            </h1>
            <p className="text-gray-400">
              Configure o Supabase para habilitar autenticação
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-amber-400 font-semibold">Passos para Configuração</h3>
                </div>
                <ol className="text-sm text-gray-300 space-y-2 ml-8 list-decimal">
                  <li>Crie um projeto no <a href="https://supabase.com" target="_blank" className="text-blue-400 hover:underline">Supabase</a></li>
                  <li>Configure as variáveis no arquivo <code className="bg-gray-800 px-2 py-1 rounded">.env.local</code>:</li>
                </ol>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Arquivo: .env.local</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key`)}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                  >
                    <span>Copiar</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <pre className="text-gray-300 text-sm overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key`}
                </pre>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="text-blue-400 font-semibold">Estado Atual</h3>
                </div>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>✅ API Asana funcionando</p>
                  <p>✅ {companies.length} empresas encontradas: {companies.map(c => c.displayName).join(', ')}</p>
                  <p>❌ Supabase não configurado</p>
                  <p>❌ Autenticação não disponível</p>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-gray-400 text-sm mb-4">
                  Após configurar, reinicie o servidor e recarregue a página
                </p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white rounded-xl font-semibold hover:scale-105 transform transition-all"
                  >
                    Recarregar Página
                  </button>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors flex items-center space-x-2"
                  >
                    <span>Ir ao Supabase</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1a1a] to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ✅ LOGO E HEADER */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-[#b51c26] to-[#dc2626] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Sistema Marítimo
          </h1>
          <p className="text-gray-400">
            {isSignUp ? 'Criar nova conta' : 'Entre em sua conta'}
          </p>
        </div>

        {/* ✅ FORM CONTAINER */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* ✅ TOGGLE LOGIN/SIGNUP */}
          <div className="flex bg-gray-800/50 rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                !isSignUp 
                  ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                isSignUp 
                  ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              Criar Conta
            </button>
          </div>

          {/* ✅ ALERTS */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* ✅ FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome Completo (apenas signup) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-[#b51c26] focus:ring-1 focus:ring-[#b51c26] transition-colors"
                  placeholder="Seu nome completo"
                  required={isSignUp}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-[#b51c26] focus:ring-1 focus:ring-[#b51c26] transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Empresa (apenas signup) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Empresa *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.companySlug}
                    onChange={(e) => handleInputChange('companySlug', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#b51c26] focus:ring-1 focus:ring-[#b51c26] transition-colors appearance-none"
                    required={isSignUp}
                  >
                    <option value="" className="bg-gray-800">Selecione uma empresa</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id} className="bg-gray-800">
                        {company.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                {companies.length === 0 && (
                  <p className="text-gray-400 text-xs mt-1">
                    Carregando empresas do Asana...
                  </p>
                )}
              </div>
            )}

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:border-[#b51c26] focus:ring-1 focus:ring-[#b51c26] transition-colors"
                  placeholder={isSignUp ? 'Mínimo 6 caracteres' : 'Sua senha'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha (apenas signup) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-[#b51c26] focus:ring-1 focus:ring-[#b51c26] transition-colors"
                    placeholder="Confirme sua senha"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#b51c26] via-[#dc2626] to-[#ef4444] text-white py-4 px-6 rounded-xl font-semibold shadow-2xl hover:shadow-[#b51c26]/25 hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isSignUp ? 'Criando conta...' : 'Entrando...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  {isSignUp ? <Building2 className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  <span>{isSignUp ? 'Criar Conta' : 'Entrar'}</span>
                </div>
              )}
            </button>
          </form>

          {/* ✅ FOOTER INFO */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm">
              {isSignUp 
                ? 'Ao criar uma conta, você aceita nossos termos de uso.' 
                : `${companies.length} empresas disponíveis para acesso`
              }
            </p>
          </div>
        </div>

        {/* ✅ SYSTEM STATUS */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs">
            Sistema Duri Trading • Supabase Configurado • {companies.length} Empresas
          </p>
        </div>
      </div>
    </div>
  );
}