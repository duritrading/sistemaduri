// src/app/dashboard/page.tsx - DASHBOARD FINAL COM NAVEGAÇÃO PERFEITA
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MaritimeDashboard } from '@/components/MaritimeDashboard';
import { LogOut, Activity, Wifi, WifiOff, Sparkles, User, Building2, Shield, Users, BarChart3, List, TrendingUp } from 'lucide-react';
import { MobileNavigation } from '@/components/MobileNavigation';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('resumo');
  
  const { user, profile, company, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

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

  // ✅ LOGOUT COM CONFIRMAÇÃO
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // ✅ VERIFICAR SE É ADMIN
  const isAdmin = profile?.role === 'admin';

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
    <div className="min-h-screen bg-white">
      {/* ✅ HEADER PREMIUM COM NAVEGAÇÃO E REORGANIZAÇÃO */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-white to-red-50/30" />
        
        <div className="relative w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* ✅ LOGO + BRAND + EMPRESA DESTACADA (ESQUERDA) */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto drop-shadow-lg hover:scale-105 transition-transform duration-200"
                />
              </div>
              
              
              <div className="h">
                
              </div>
            </div>

            {/* ✅ NAVEGAÇÃO CENTRAL SEXY - SEM BACKGROUND CINZA */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => scrollToSection('resumo')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 border-2 ${
                  activeSection === 'resumo'
                    ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-xl border-[#b51c26] scale-105'
                    : 'text-gray-700 border-gray-200 hover:border-[#b51c26] hover:text-[#b51c26] hover:shadow-lg hover:scale-105 bg-white/80 backdrop-blur-sm'
                }`}
              >
                <BarChart3 size={18} />
                <span>Resumo Operacional</span>
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

            {/* ✅ USER INFO + ACTIONS (DIREITA) - EMAIL E CARGO REORGANIZADOS */}
            <div className="flex items-center space-x-4">
              
              {/* ✅ NAVEGAÇÃO MOBILE */}
              <MobileNavigation 
                activeSection={activeSection}
                onSectionChange={(section) => scrollToSection(section)}
              />
              
              {/* Status de Conexão */}
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
                      <button
                        onClick={() => router.push('/admin/users')}
                        className="w-full flex items-center space-x-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl transition-colors"
                      >
                        <Users size={16} />
                        <span>Gerenciar Usuários</span>
                      </button>
                    )}
                    
                    <button
                      onClick={handleSignOut}
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

      {/* ✅ MAIN CONTENT - HERO SIMPLIFICADO E PRÓXIMO DO HEADER */}
      <main className="px-6 lg:px-8 py-16">
        
        {/* ✅ SEÇÃO HERO SIMPLIFICADA - SEM BACKGROUND */}
        <section className="mb-12">
          <div className="text-center">
            {/* Título Principal Limpo */}
            <h1 className="text-5xl lg:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
                Sistema de tracking da
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#b51c26] to-[#dc2626] bg-clip-text text-transparent">
                {company?.display_name}
              </span>
            </h1>
            
            {/* Status Atualizado */}
            <div className="flex items-center justify-center space-x-2 mt-6">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg text-gray-600 font-medium">Atualizado em tempo real</span>
            </div>
          </div>
        </section>

        {/* ✅ DASHBOARD PRINCIPAL COM LARGURA MÁXIMA OTIMIZADA */}
        <div className="max-w-[1600px] mx-auto">
          <MaritimeDashboard companyFilter={company?.name} />
        </div>
      </main>

      {/* ✅ FOOTER PREMIUM */}
      <footer className="relative mt-16 py-8 bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900">
        <div className="container mx-auto px-6 text-center">
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