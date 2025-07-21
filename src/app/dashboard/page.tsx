// src/app/dashboard/page.tsx - Dashboard completamente limpo
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, clearCurrentCompany } from '@/lib/auth';
import { UnifiedDashboard } from '@/components/UnifiedDashboard';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar autenticação
      const currentCompany = getCurrentCompany();
      if (!currentCompany) {
        router.push('/login');
        return;
      }
      
      setCompany(currentCompany);

      // Verificar status da configuração do Asana (sem quebrar se falhar)
      try {
        const statusResponse = await fetch('/api/asana/status');
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          setConfigStatus(status);
        }
      } catch (statusError) {
        console.warn('Não foi possível verificar status do Asana:', statusError);
        // Definir status padrão
        setConfigStatus({
          tokenConfigured: false,
          usingMockData: true,
          message: 'Usando dados de demonstração'
        });
      }

    } catch (err) {
      console.error('Dashboard initialization error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
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
            <button 
              onClick={() => initializeDashboard()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🚢 Dashboard Marítimo
              </h1>
              {company && (
                <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {company.displayName}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status da Configuração */}
              {configStatus && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    configStatus.tokenConfigured ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {configStatus.message}
                  </span>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso sobre dados de demonstração (somente se necessário) */}
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
                  <strong>Modo Demonstração:</strong> Configure a variável ASANA_ACCESS_TOKEN 
                  no arquivo .env.local para conectar aos dados reais do Asana.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UnifiedDashboard companyFilter={company?.name} />
      </div>
    </div>
  );
}