// src/app/dashboard/page.tsx - COM BOTÃO ADMIN PARA GESTÃO DE USUÁRIOS
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MaritimeDashboard } from '@/components/MaritimeDashboard';
import { LogOut, Activity, Wifi, WifiOff, Sparkles, User, Building2, Shield, Users, Settings } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('resumo');
  
  const { user, profile, company, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  // ✅ Refs para navegação suave
  const resumoRef = useRef<HTMLDivElement>(null);
  const graficosRef = useRef<HTMLDivElement>(null);
  const operacoesRef = useRef<HTMLDivElement>(null);

  // ✅ VERIFICAR AUTENTICAÇÃO
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user && company) {
      initializeDashboard();
    }
  }, [user, company, authLoading, router]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar status do sistema
      try {
        const statusResponse = await fetch('/api/asana/status');
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setConfigStatus(status);
        }
      } catch (statusError) {
        setConfigStatus({
          tokenConfigured: false,
          usingMockData: true,
          message: 'Verificando configuração...'
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLE LOGOUT
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // ✅ VERIFICAR SE É ADMIN
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager' || profile?.role === 'admin';

  // ✅ Loading inicial do auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={32} className="text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Carregando Sistema</h3>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-[#b51c26] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#b51c26] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#b51c26] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Loading do dashboard
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={32} className="text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Preparando Dashboard</h3>
            <p className="text-gray-600">Carregando dados de {company?.display_name}...</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="font-medium">Duri Trading</span>
            <Sparkles size={20} />
          </div>
        </div>
      </div>
    );
  }

  // ✅ Error Premium
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Erro no Dashboard</h3>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20">
      {/* ✅ HEADER PREMIUM COM INFORMAÇÕES DO USUÁRIO */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-white to-red-50/30" />
        
        <div className="relative w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo + Brand */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto drop-shadow-lg hover:scale-105 transition-transform duration-200"
                />
              </div>
              
              {/* Company + User Info */}
              <div className="hidden sm:block">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl px-4 py-2">
                    <div className="flex items-center space-x-3">
                      <Building2 size={16} className="text-[#b51c26]" />
                      <span className="font-medium text-gray-900">{company?.display_name}</span>
                    </div>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl px-4 py-2">
                    <div className="flex items-center space-x-3">
                      <User size={16} className="text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {profile?.full_name || user?.email?.split('@')[0]}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{profile?.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Status Connection */}
              <div className="hidden md:flex items-center space-x-2 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl px-3 py-2">
                {configStatus?.tokenConfigured ? (
                  <Wifi size={16} className="text-green-500" />
                ) : (
                  <WifiOff size={16} className="text-amber-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {configStatus?.tokenConfigured ? 'Online' : 'Configurando'}
                </span>
              </div>

              {/* ✅ ADMIN BUTTON - APENAS PARA ADMINS */}
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin/users')}
                  className="flex items-center space-x-2 px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all duration-200 border border-purple-200/50"
                  title="Administrar usuários do sistema"
                >
                  <Users size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Admin</span>
                </button>
              )}

              {/* ✅ SETTINGS BUTTON - PARA MANAGERS E ADMINS */}
              {isManager && (
                <button
                  onClick={() => {/* Implementar depois */}}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                  title="Configurações da empresa"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Config</span>
                </button>
              )}

              {/* Profile Badge com Role */}
              <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${
                  profile?.role === 'admin' ? 'bg-red-500' :
                  profile?.role === 'manager' ? 'bg-purple-500' :
                  profile?.role === 'operator' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
                <div className="flex items-center space-x-2">
                  {profile?.role === 'admin' && <Shield size={14} className="text-red-500" />}
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {profile?.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                title="Sair do sistema"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ MAIN CONTENT */}
      <main className="relative">
        {/* Hero Section Premium */}
        <section className="relative py-16 bg-gradient-to-br from-gray-900 via-[#1a1a1a] to-gray-900 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/api/placeholder/1920/400')] bg-cover bg-center opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#b51c26]/20 via-transparent to-[#b51c26]/20"></div>
          
          <div className="relative container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 font-medium text-sm tracking-wider uppercase">Tempo Real</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Operações Marítimas
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Monitoramento completo das operações de {company?.display_name} com métricas em tempo real
            </p>
            
            {/* User Info no Hero */}
            <div className="mt-6 flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-300">{profile?.full_name || user?.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 size={16} className="text-gray-400" />
                <span className="text-gray-300">{company?.display_name}</span>
              </div>
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-red-400" />
                  <span className="text-red-300">Administrador</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Dashboard Principal usando componente existente */}
        <div ref={resumoRef}>
          <MaritimeDashboard companyFilter={company?.name} />
        </div>
      </main>

      {/* Footer Premium */}
      <footer className="relative mt-16 py-8 bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/80 text-sm">
            © 2024 Duri Trading • Sistema de Tracking Marítimo • Usuário: {user?.email}
          </p>
          {isAdmin && (
            <p className="text-red-300 text-xs mt-1">
              Acesso de Administrador Ativo
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}