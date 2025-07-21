// src/app/dashboard/page.tsx - Dashboard Integrado com Custom Fields
'use client';

import { useState, useEffect } from 'react';
import { getCurrentCompany, filterTrackingsByCompany } from '@/lib/auth';
import { CustomFieldsDashboard } from '@/components/CustomFieldsDashboard';

export default function IntegratedDashboardPage() {
  const [trackings, setTrackings] = useState([]);
  const [customFieldsAnalysis, setCustomFieldsAnalysis] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'custom-fields'>('overview');

  useEffect(() => {
    console.log('🚀 Integrated Dashboard iniciando...');
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Verificar autenticação  
      console.log('1️⃣ Verificando autenticação...');
      const currentCompany = getCurrentCompany();
      console.log('Current company:', currentCompany);
      setCompany(currentCompany);

      if (!currentCompany) {
        console.warn('⚠️ Usuário não autenticado, redirecionando...');
        window.location.href = '/login';
        return;
      }

      // 2. Buscar dados com custom fields
      console.log('2️⃣ Buscando dados com custom fields...');
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
        trackings: result.data.length,
        customFields: result.customFieldsAnalysis?.totalFields || 0,
        insights: result.customFieldsAnalysis?.insights.length || 0
      });

      // 3. Filtrar por empresa
      console.log('3️⃣ Filtrando por empresa...');
      const filteredTrackings = filterTrackingsByCompany(result.data, currentCompany.name);
      console.log('Trackings filtrados:', filteredTrackings.length);

      setTrackings(filteredTrackings);
      setCustomFieldsAnalysis(result.customFieldsAnalysis);
      setMetrics(result.metrics);

      console.log('✅ Dashboard integrado carregado com sucesso!');

    } catch (err) {
      console.error('❌ Erro no dashboard integrado:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando analytics avançados...</p>
          <p className="text-sm text-gray-400 mt-2">Analisando custom fields e gerando insights...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">🚨 Erro no Dashboard</h1>
          
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            <strong>Erro:</strong> {error}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={initializeDashboard}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Tentar Novamente
            </button>
            
            <button
              onClick={() => window.location.href = '/login'}
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Marítimo Avançado</h1>
              <p className="text-gray-600">
                {company?.displayName || company?.name} - {trackings.length} operações
                {customFieldsAnalysis && (
                  <span className="ml-2 text-blue-600">
                    | {customFieldsAnalysis.totalFields} campos personalizados
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={initializeDashboard}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Atualizar
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('custom-fields')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'custom-fields'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔍 Campos Personalizados
                {customFieldsAnalysis && customFieldsAnalysis.totalFields > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {customFieldsAnalysis.totalFields}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab trackings={trackings} metrics={metrics} company={company} />
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum Campo Personalizado</h3>
                <p className="text-gray-600 mb-4">
                  Os campos personalizados do Asana aparecerão aqui automaticamente quando disponíveis.
                </p>
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
                  <strong>💡 Dica:</strong> Para ver análises avançadas, adicione campos personalizados às suas tasks no Asana.
                  <br />
                  Exemplos: Status de Entrega, Valor do Frete, Tipo de Produto, etc.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Overview Tab
function OverviewTab({ trackings, metrics, company }: { trackings: any[], metrics: any, company: any }) {
  const basicMetrics = calculateBasicMetrics(trackings);

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Operações"
          value={basicMetrics.totalOperations}
          icon="📊"
          color="blue"
        />
        <MetricCard
          title="Concluídas"
          value={basicMetrics.completedOperations}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Ativas"
          value={basicMetrics.activeOperations}
          icon="🔄"
          color="orange"
        />
        <MetricCard
          title="Taxa Efetividade"
          value={`${basicMetrics.effectiveRate}%`}
          icon="📈"
          color="purple"
        />
      </div>

      {/* Recent Trackings */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Operações Recentes</h2>
        
        {trackings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma operação encontrada para {company?.name}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exportador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custom Fields</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trackings.slice(0, 10).map((tracking) => (
                  <tr key={tracking.id || tracking.asanaId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.ref || tracking.id?.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tracking.company || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tracking.transport?.exporter || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        tracking.status === 'Concluído' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tracking.status || 'Em Progresso'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tracking.schedule?.eta || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tracking.customFields ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {Object.keys(tracking.customFields).filter(k => !k.startsWith('_original_')).length} campos
                        </span>
                      ) : '0 campos'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color]} px-4 py-3`}>
        <div className="flex items-center justify-between text-white">
          <span className="text-2xl">{icon}</span>
          <span className="text-xs opacity-90">MÉTRICA</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
      </div>
    </div>
  );
}

// Helper Functions
function calculateBasicMetrics(trackings: any[]) {
  if (!Array.isArray(trackings)) {
    return {
      totalOperations: 0,
      activeOperations: 0,
      completedOperations: 0,
      effectiveRate: 0
    };
  }
  
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}