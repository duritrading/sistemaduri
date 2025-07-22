// src/app/dashboard/page.tsx - HEADER REDESIGNED + NAVEGAÇÃO FUNCIONAL
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, clearCurrentCompany, Company } from '@/lib/auth';
import { MaritimeDashboard } from '@/components/MaritimeDashboard';
import { LogOut } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('resumo');
  const router = useRouter();

  // ✅ Refs para navegação suave entre seções
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

      // ✅ Verificar autenticação - empresa DEVE estar selecionada
      const currentCompany = getCurrentCompany();
      if (!currentCompany) {
        console.log('❌ Nenhuma empresa selecionada, redirecionando para login');
        router.push('/login');
        return;
      }
      
      console.log(`✅ Dashboard inicializado para empresa: ${currentCompany.name}`);
      setCompany(currentCompany);

      // ✅ Verificar status da configuração do Asana (não bloquear se falhar)
      try {
        const statusResponse = await fetch('/api/asana/status');
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setConfigStatus(status);
          console.log('📊 Status Asana:', status.tokenConfigured ? 'Conectado' : 'Modo Demo');
        }
      } catch (statusError) {
        console.warn('⚠️ Não foi possível verificar status do Asana:', statusError);
        setConfigStatus({
          tokenConfigured: false,
          usingMockData: true,
          message: 'Verificando configuração...'
        });
      }

    } catch (err) {
      console.error('❌ Dashboard initialization error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Logout - limpando empresa selecionada');
    clearCurrentCompany();
    router.push('/login');
  };

  // ✅ Função para navegação suave entre seções
  const scrollToSection = (section: string) => {
    setActiveSection(section);
    
    let targetRef;
    switch (section) {
      case 'resumo':
        targetRef = resumoRef;
        break;
      case 'graficos':
        targetRef = graficosRef;
        break;
      case 'operacoes':
        targetRef = operacoesRef;
        break;
      default:
        return;
    }

    if (targetRef.current) {
      targetRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Inicializando sistema de tracking...</p>
          {company && (
            <p className="text-sm text-gray-500 mt-2">Empresa: {company.displayName}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Erro no Dashboard</h2>
            <p className="mb-4">{error}</p>
            <div className="space-x-2">
              <button 
                onClick={() => initializeDashboard()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Voltar ao Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ HEADER REDESIGNED - LAYOUT MODERNO */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px10 sm:px10 lg:px10">
          <div className="flex justify-between items-center h-20">
            
            {/* ✅ LADO ESQUERDO: Logo + Título (Mais Afastados) */}
            <div className="flex items-center">
              <img 
                src="/duriLogo.webp" 
                alt="Duri Trading" 
                className="h-14 w-auto mr-4" // ✅ Logo maior (h-14) + mais espaçamento (mr-8)
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">
                  Sistema de Tracking
                </h1>
                <p className="text-sm font-medium text-blue-600">
                  {company.displayName}
                </p>
              </div>
            </div>

            {/* ✅ CENTRO: Navegação Compacta e Funcional */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => scrollToSection('resumo')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeSection === 'resumo' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Resumo Operacional
              </button>
              
              <button
                onClick={() => scrollToSection('graficos')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeSection === 'graficos' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Gráficos Operacionais
              </button>
              
              <button
                onClick={() => scrollToSection('operacoes')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeSection === 'operacoes' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Operações Detalhadas
              </button>
            </nav>

            {/* ✅ LADO DIREITO: Status + Sair */}
            <div className="flex items-center space-x-4">
              {/* Status da Configuração */}
              {configStatus && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    configStatus.tokenConfigured ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {configStatus.tokenConfigured ? 'Online' : 'Verificando'}
                  </span>
                </div>
              )}
              
              {/* Botão Sair */}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                title="Sair do sistema"
              >
                <LogOut size={16} className="mr-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Aviso sobre configuração (se necessário) */}
      {configStatus && !configStatus.tokenConfigured && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Verificando Conexão:</strong> {configStatus.message || 'Conectando com Asana...'}
                  {!configStatus.tokenConfigured && (
                    <>
                      {' '}Configure ASANA_ACCESS_TOKEN no .env.local para dados reais.
                      <button
                        onClick={() => window.open('https://developers.asana.com/docs/personal-access-token', '_blank')}
                        className="ml-2 text-yellow-800 underline hover:text-yellow-900"
                      >
                        Como obter token →
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Dashboard Content com Seções Identificadas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div ref={resumoRef} id="resumo" className="scroll-mt-24">
          <MaritimeDashboard companyFilter={company.name} />
        </div>
        
        {/* ✅ Seções adicionais serão renderizadas dentro do MaritimeDashboard */}
        <div ref={graficosRef} id="graficos" className="scroll-mt-24"></div>
        <div ref={operacoesRef} id="operacoes" className="scroll-mt-24"></div>
      </div>
    </div>
  );
}