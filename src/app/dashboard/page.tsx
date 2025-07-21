// src/app/dashboard/page.tsx - Dashboard com Sistema de Empresas Atualizado
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, filterTrackingsByCompany, clearCurrentCompany } from '@/lib/auth';
import { CustomFieldsDashboard } from '@/components/CustomFieldsDashboard';
import { CompanyDebugPanel, useCompanyDebug } from '@/components/CompanyDebugPanel';
import { UnifiedDashboard } from '@/components/UnifiedDashboard';

// Importar helper de teste em desenvolvimento
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('@/utils/browser-test-helper');
}

export default function IntegratedDashboardPage() {
  const [trackings, setTrackings] = useState([]);
  const [allTrackings, setAllTrackings] = useState([]); // Para debug
  const [customFieldsAnalysis, setCustomFieldsAnalysis] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'custom-fields' | 'debug'>('overview');
  
  const router = useRouter();
  const { debugVisible, toggleDebug } = useCompanyDebug();

  useEffect(() => {
    console.log('🚀 Dashboard integrado iniciando...');
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Verificar autenticação  
      console.log('1️⃣ Verificando autenticação...');
      const currentCompany = getCurrentCompany();
      
      if (!currentCompany) {
        console.warn('⚠️ Usuário não autenticado, redirecionando...');
        router.push('/login');
        return;
      }
      
      console.log('✅ Empresa autenticada:', currentCompany);
      setCompany(currentCompany);

      // 2. Buscar dados do Asana
      console.log('2️⃣ Buscando dados do Asana...');
      const response = await fetch('/api/asana/unified', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      console.log('✅ Dados recebidos:', {
        total: result.data.length,
        customFields: result.customFieldsAnalysis?.totalFields || 0,
        insights: result.customFieldsAnalysis?.insights.length || 0
      });

      // Armazenar todos os trackings para debug
      setAllTrackings(result.data);

      // 3. Filtrar por empresa usando novo sistema
      console.log('3️⃣ Filtrando trackings para empresa:', currentCompany.name);
      const filteredTrackings = filterTrackingsByCompany(result.data, currentCompany.name);
      
      console.log(`📊 Trackings da empresa ${currentCompany.name}:`, filteredTrackings.length);

      // Verificar se encontrou trackings para a empresa
      if (filteredTrackings.length === 0) {
        console.warn(`⚠️ Nenhum tracking encontrado para empresa ${currentCompany.name}`);
        console.log('💡 Títulos disponíveis:', result.data.slice(0, 5).map(t => t.title));
      }

      setTrackings(filteredTrackings);
      setCustomFieldsAnalysis(result.customFieldsAnalysis);
      setMetrics(result.metrics);

      console.log('✅ Dashboard carregado com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      // Não limpar a empresa automaticamente em caso de erro da API
      // setTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Fazendo logout...');
    clearCurrentCompany();
    router.push('/login');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Carregando Dashboard</h2>
              <p className="text-gray-600">
                {company ? `Buscando dados para ${company.displayName}...` : 'Preparando sistema...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro no Sistema</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-3">
              <button
                onClick={initializeDashboard}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🔄 Tentar Novamente
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                🚪 Voltar ao Login
              </button>
            </div>
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
          
          {/* Top Header */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                🚢 Dashboard Marítimo
                {process.env.NODE_ENV === 'development' && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    DEV
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {company?.displayName || company?.name} 
                {trackings.length > 0 && (
                  <span className="ml-2">
                    • {trackings.length} operações
                    {customFieldsAnalysis && customFieldsAnalysis.totalFields > 0 && (
                      <span className="text-blue-600">
                        • {customFieldsAnalysis.totalFields} campos personalizados
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={initializeDashboard}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                🔄 Atualizar
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                🚪 Sair
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: '📊 Visão Geral', badge: trackings.length },
                { 
                  id: 'custom-fields', 
                  label: '🔍 Campos Personalizados',
                  badge: customFieldsAnalysis?.totalFields || 0,
                  disabled: !customFieldsAnalysis || customFieldsAnalysis.totalFields === 0
                }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  disabled={tab.disabled}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <div>
                <h3 className="text-red-800 font-medium">Erro na conexão com o sistema</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && trackings.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma operação encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              Não foram encontrados trackings para a empresa {company?.name}.
            </p>
            <div className="space-x-3">
              <button
                onClick={initializeDashboard}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🔄 Recarregar Dados
              </button>
              <button
                onClick={() => toggleDebug(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                🔧 Debug
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {trackings.length > 0 && (
          <>
            {activeTab === 'overview' && (
              <UnifiedDashboard 
                trackings={trackings} 
                metrics={metrics}
                company={company}
              />
            )}

            {activeTab === 'custom-fields' && (
              <div className="space-y-6">
                {customFieldsAnalysis && customFieldsAnalysis.totalFields > 0 ? (
                  <CustomFieldsDashboard 
                    trackings={trackings} 
                    companyFilter={company?.name}
                  />
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow border text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Nenhum Campo Personalizado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Os campos personalizados do Asana aparecerão aqui quando disponíveis.
                    </p>
                    <button
                      onClick={initializeDashboard}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      🔄 Verificar Novamente
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && allTrackings.length > 0 && (
        <CompanyDebugPanel 
          trackings={allTrackings}
          isVisible={debugVisible}
          onToggle={toggleDebug}
        />
      )}
    </div>
  );
}