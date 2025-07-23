// src/app/dashboard/page.tsx - DASHBOARD COM SISTEMA DE NOTIFICAÇÕES INTEGRADO
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MaritimeDashboard } from '@/components/MaritimeDashboard';
import { NotificationsButton } from '@/components/NotificationsButton';
import { NotificationsStatusIndicator } from '@/components/NotificationsStatusIndicator';
import { LogOut, Activity, Wifi, WifiOff, Sparkles, User, Building2, Shield, Users, BarChart3, List, TrendingUp, Settings } from 'lucide-react';
import { MobileNavigation } from '@/components/MobileNavigation';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('resumo');
  
  const { user, profile, company, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  // ✅ FUNÇÃO PARA OBTER EMPRESA EFETIVA (ADMIN PODE TER SELECIONADO OUTRA)
  const getEffectiveCompany = () => {
    if (profile?.role === 'admin') {
      try {
        const adminSelected = localStorage.getItem('admin_selected_company');
        if (adminSelected) {
          const selectedCompany = JSON.parse(adminSelected);
          return selectedCompany;
        }
      } catch (e) {
        console.warn('Erro ao ler empresa selecionada pelo admin:', e);
      }
    }
    return company; // Retorna empresa padrão do usuário
  };

  // ✅ VERIFICAR AUTENTICAÇÃO E REDIRECIONAR ADMIN SEM SELEÇÃO
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user && profile && company) {
      // ✅ SE É ADMIN E NÃO TEM EMPRESA SELECIONADA, REDIRECIONAR PARA SELEÇÃO
      if (profile.role === 'admin') {
        const adminSelected = localStorage.getItem('admin_selected_company');
        if (!adminSelected) {
          router.push('/select-company');
          return;
        }
      }
      
      initializeDashboard();
    }
  }, [user, profile, company, authLoading, router]);

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

  // ✅ NAVEGAÇÃO SUAVE ENTRE SEÇÕES COM OFFSETS CORRETOS
  const scrollToSection = (section: 'resumo' | 'graficos' | 'operacoes') => {
    setActiveSection(section);
    
    let targetId = '';
    let offset = 100; // Altura do header
    
    if (section === 'resumo') {
      targetId = 'kpi-section';
      offset = 100;
    } else if (section === 'graficos') {
      targetId = 'charts-section';
      offset = 80; // Menos offset para ir mais para o meio
    } else if (section === 'operacoes') {
      targetId = 'operations-section';
      offset = 100;
    }
    
    const element = document.getElementById(targetId);
    if (element) {
      const elementTop = element.offsetTop;
      window.scrollTo({
        top: elementTop - offset,
        behavior: 'smooth'
      });
    }
  };

  // ✅ HANDLE LOGOUT COM LIMPEZA DE ADMIN
  const handleLogout = async () => {
    try {
      // Limpar seleção de empresa do admin
      localStorage.removeItem('admin_selected_company');
      await signOut();
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // ✅ VERIFICAR ROLES
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager' || profile?.role === 'admin';

  // ✅ OBTER EMPRESA EFETIVA PARA O DASHBOARD
  const effectiveCompany = getEffectiveCompany();

  // ✅ Loading Premium
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity size={32} className="text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Preparando Dashboard</h3>
            <p className="text-gray-600">Carregando dados de {effectiveCompany?.display_name || effectiveCompany?.displayName}...</p>
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
    <div className="min-h-screen bg-white">
      {/* ✅ HEADER PREMIUM COM NAVEGAÇÃO E SISTEMA DE NOTIFICAÇÕES */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between px-6 py-4">
            
        {/* ✅ LOGO + EMPRESA DESTACADA COM BACKGROUND VERMELHO (ESQUERDA) */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto drop-shadow-lg hover:scale-105 transition-transform duration-200"
                />
              </div>
              
              {/* Company Info Destacada */}
              <div className="hidden sm:flex items-center bg-gradient-to-r from-[#b51c26] to-[#dc2626] px-4 py-2 rounded-xl shadow-lg">
                <Building2 size={18} className="text-white mr-3" />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm leading-tight">
                    {effectiveCompany?.display_name || effectiveCompany?.displayName}
                  </span>
                  {isAdmin && (
                    <span className="text-red-100 text-xs font-medium">
                      Admin View
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ NAVEGAÇÃO CENTRAL */}
            <div className="hidden lg:flex items-center space-x-2">
              <button
                onClick={() => scrollToSection('resumo')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 border-2 ${
                  activeSection === 'resumo'
                    ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-xl border-[#b51c26] scale-105'
                    : 'text-gray-700 border-gray-200 hover:border-[#b51c26] hover:text-[#b51c26] hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm'
                }`}
              >
                <BarChart3 size={18} />
                <span>Resumo Executivo</span>
              </button>
              
              <button
                onClick={() => scrollToSection('graficos')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 border-2 ${
                  activeSection === 'graficos'
                    ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-xl border-[#b51c26] scale-105'
                    : 'text-gray-700 border-gray-200 hover:border-[#b51c26] hover:text-[#b51c26] hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm'
                }`}
              >
                <TrendingUp size={18} />
                <span>Gráficos Operacionais</span>
              </button>
              
              <button
                onClick={() => scrollToSection('operacoes')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 border-2 ${
                  activeSection === 'operacoes'
                    ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-xl border-[#b51c26] scale-105'
                    : 'text-gray-700 border-gray-200 hover:border-[#b51c26] hover:text-[#b51c26] hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm'
                }`}
              >
                <List size={18} />
                <span>Operações Detalhadas</span>
              </button>
            </div>

            {/* ✅ USER INFO + NOTIFICAÇÕES + ACTIONS (DIREITA) */}
            <div className="flex items-center space-x-4">
              
              {/* ✅ NAVEGAÇÃO MOBILE */}
              <MobileNavigation 
                activeSection={activeSection}
                onSectionChange={(section) => scrollToSection(section)}
              />
              
              {/* ✅ BOTÃO DE NOTIFICAÇÕES - ADICIONADO AO LADO ESQUERDO DO STATUS */}
              <NotificationsButton userId={user?.id || user?.email || 'default-user'} />
              
              {/* ✅ Status de Conexão */}
              <div className="hidden sm:flex items-center space-x-2">
                {configStatus?.tokenConfigured ? (
                  <Wifi size={16} className="text-green-500" />
                ) : (
                  <WifiOff size={16} className="text-amber-500" />
                )}
                <span className="text-xs text-gray-500 hidden lg:block">
                  {configStatus?.usingMockData ? 'Demo' : 'Conectado'}
                </span>
              </div>

              {/* ✅ BOTÕES ADMIN E SETTINGS ANTES DO USER INFO */}
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin/users')}
                  className="flex items-center space-x-2 px-4 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all duration-200 border border-purple-200/50"
                  title="Administrar usuários do sistema"
                >
                  <Users size={18} />
                  <span className="text-sm font-medium hidden lg:inline">Admin</span>
                </button>
              )}

              {isManager && (
                <button
                  onClick={() => {/* Implementar depois */}}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                  title="Configurações da empresa"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium hidden lg:inline">Config</span>
                </button>
              )}

              {/* ✅ USER INFO REORGANIZADO - EMAIL PRINCIPAL E CARGO EMBAIXO */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                  <div className="flex items-center justify-end space-x-1">
                    {isAdmin && <Shield size={12} className="text-red-400" />}
                    <span className="text-xs text-gray-500 capitalize">
                      {profile?.role === 'admin' ? 'Administrador' : 
                       profile?.role === 'manager' ? 'Gerente' :
                       profile?.role === 'operator' ? 'Operador' : 'Visualizador'}
                    </span>
                  </div>
                </div>

                {/* Avatar + Menu */}
                <div className="relative group">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform">
                    <User size={18} className="text-white" />
                  </div>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => router.push('/admin/users')}
                          className="w-full flex items-center space-x-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Users size={16} />
                          <span>Gerenciar Usuários</span>
                        </button>
                        
                        <button
                          onClick={() => router.push('/select-company')}
                          className="w-full flex items-center space-x-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Building2 size={16} />
                          <span>Trocar Empresa</span>
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ MAIN CONTENT - HERO SIMPLIFICADO COM EMPRESA EFETIVA */}
      <main className="px-6 lg:px-8 py-16">
        
        {/* ✅ SEÇÃO HERO SIMPLIFICADA COM EMPRESA EFETIVA */}
        <section className="mb-12">
          <div className="text-center">
            {/* Título Principal Limpo */}
            <h1 className="text-5xl lg:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
                Sistema de tracking da
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#b51c26] to-[#dc2626] bg-clip-text text-transparent">
                {effectiveCompany?.display_name || effectiveCompany?.displayName}
              </span>
            </h1>
            
            {/* Status Atualizado com indicador de Admin */}
            <div className="flex items-center justify-center space-x-4 mt-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-lg text-gray-600 font-medium">Atualizado em tempo real</span>
              </div>
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-red-400" />
                  <span className="text-sm text-red-500 font-medium">Visualização de Administrador</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ✅ DASHBOARD PRINCIPAL COM EMPRESA EFETIVA */}
        <div className="max-w-[1600px] mx-auto">
          <MaritimeDashboard companyFilter={effectiveCompany?.name} />
        </div>
      </main>

      {/* ✅ FOOTER PREMIUM COM INDICADOR ADMIN */}
      <footer className="relative mt-16 py-8 bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80 text-sm">
            © 2024 Duri Trading • Sistema de Tracking Marítimo • Usuário: {user?.email}
          </p>
          {isAdmin && (
            <p className="text-red-300 text-xs mt-1">
              Acesso de Administrador Ativo - Empresa: {effectiveCompany?.display_name || effectiveCompany?.displayName}
            </p>
          )}
        </div>
      </footer>

      {/* ✅ INDICADOR DE STATUS DAS NOTIFICAÇÕES */}
      <NotificationsStatusIndicator />
    </div>
  );
}