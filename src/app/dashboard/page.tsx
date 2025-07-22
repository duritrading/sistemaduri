// ✅ ATUALIZAÇÃO RÁPIDA: src/app/dashboard/page.tsx
// Use esta versão que não precisa dos componentes premium ainda

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, clearCurrentCompany, Company } from '@/lib/auth';
import { MaritimeDashboard } from '@/components/MaritimeDashboard';
import { LogOut, Activity, Wifi, WifiOff, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('resumo');
  const router = useRouter();

  // ✅ Refs para navegação suave
  const resumoRef = useRef<HTMLDivElement>(null);
  const graficosRef = useRef<HTMLDivElement>(null);
  const operacoesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentCompany = getCurrentCompany();
      if (!currentCompany) {
        router.push('/login');
        return;
      }
      
      setCompany(currentCompany);

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
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId: 'resumo' | 'graficos' | 'operacoes') => {
    const refs = { resumo: resumoRef, graficos: graficosRef, operacoes: operacoesRef };
    const targetRef = refs[sectionId];
    
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });
      setActiveSection(sectionId);
    }
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  // ✅ Loading Premium
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#b51c26]/20 border-t-[#b51c26] rounded-full animate-spin mx-auto mb-6" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-[#b51c26] bg-clip-text text-transparent">
              Carregando Dashboard
            </h2>
            <p className="text-gray-600">Preparando dados operacionais...</p>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-2 text-[#b51c26]">
            <Sparkles size={20} />
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
      {/* ✅ HEADER PREMIUM (usando componentes existentes) */}
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
                  className="h-16 w-auto drop-shadow-lg hover:scale-105 transition-transform"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-3">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
                    Sistema de Tracking
                  </h1>
                  <div className="px-3 py-1 bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white text-sm font-medium rounded-full shadow-lg">
                    {company?.displayName}
                  </div>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  Maritime Operations Dashboard
                </p>
              </div>
            </div>

            {/* Navegação Premium */}
            <nav className="flex items-center space-x-2">
              {[
                { id: 'resumo', label: 'Resumo Operacional' },
                { id: 'graficos', label: 'Analytics' },
                { id: 'operacoes', label: 'Operações' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id as any)}
                  className={`
                    relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300
                    ${activeSection === item.id 
                      ? 'bg-gradient-to-r from-[#b51c26] via-[#dc2626] to-[#ef4444] text-white shadow-xl' 
                      : 'text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:shadow-lg'
                    }
                  `}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Status + Logout */}
            <div className="flex items-center space-x-4">
              {configStatus && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      configStatus.tokenConfigured 
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                        : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    }`} />
                    <div className="flex items-center space-x-1 text-sm">
                      {configStatus.tokenConfigured ? (
                        <Wifi size={16} className="text-emerald-600" />
                      ) : (
                        <WifiOff size={16} className="text-amber-600" />
                      )}
                      <span className={`font-medium ${
                        configStatus.tokenConfigured ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {configStatus.tokenConfigured ? 'Conectado' : 'Modo Demo'}
                      </span>
                    </div>
                  </div>
                  <Activity size={16} className="text-gray-400 animate-pulse" />
                </div>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
              >
                <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b51c26]/30 to-transparent" />
      </header>

      {/* ✅ MAIN CONTENT Premium */}
      <main className="relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[#b51c26]/10 to-red-300/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-gradient-to-r from-blue-200/10 to-purple-200/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Seções */}
          <section ref={resumoRef} id="resumo" className="scroll-mt-24">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200/50 shadow-lg mb-4">
                <div className="w-2 h-2 bg-[#b51c26] rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Dashboard em Tempo Real</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent mb-2">
                Operações Marítimas
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Monitoramento completo das suas operações de trading internacional com métricas em tempo real
              </p>
            </div>
          </section>

          <section ref={graficosRef} id="graficos" className="scroll-mt-24" />
          <section ref={operacoesRef} id="operacoes" className="scroll-mt-24" />

          {/* Dashboard Principal usando componente existente */}
          <MaritimeDashboard companyFilter={company?.name} />
        </div>
      </main>

      {/* Footer Premium */}
      <footer className="relative mt-16 py-8 bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/80 text-sm">
            © 2024 Duri Trading • Sistema de Tracking Marítimo
          </p>
        </div>
      </footer>
    </div>
  );
}