// src/components/UnifiedDashboard.tsx - Atualizado para modo strict Asana
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UnifiedDashboardProps {
  companyFilter?: string;
}

interface AsanaError {
  success: false;
  error: string;
  code: string;
  details?: string;
  troubleshooting?: string[];
  setupInstructions?: Record<string, string>;
  availableProjects?: Array<{ gid: string; name: string }>;
  availableCompanies?: string[];
}

interface MetricsData {
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  effectiveRate: number;
  statusDistribution: Record<string, number>;
  exporterDistribution: Record<string, number>;
  productDistribution: Record<string, number>;
  armadorDistribution: Record<string, number>;
  terminalDistribution: Record<string, number>;
  orgaosAnuentesDistribution: Record<string, number>;
  etdTimeline: Array<{ month: string; operations: number }>;
  uniqueExporters: number;
  uniqueShippingLines: number;
  uniqueTerminals: number;
  totalContainers: number;
}

export function UnifiedDashboard({ companyFilter }: UnifiedDashboardProps) {
  const [trackings, setTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsanaError | null>(null);
  const [apiMeta, setApiMeta] = useState<any>(null);
  const [customFieldsAnalysis, setCustomFieldsAnalysis] = useState<any>(null);

  // ✅ Fetch otimizado com strict Asana mode
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Construir URL com filtro de empresa
      const params = new URLSearchParams();
      if (companyFilter) {
        params.append('company', companyFilter);
      }
      if (forceRefresh) {
        params.append('refresh', 'true');
      }

      const url = `/api/asana/unified?${params.toString()}`;
      console.log(`🔍 Fetching strict Asana data: ${url}`);

      const startTime = Date.now();
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });
      const fetchTime = Date.now() - startTime;

      const result = await response.json();

      if (!result.success) {
        // ✅ Tratar diferentes tipos de erro do Asana
        setError(result as AsanaError);
        return;
      }

      // ✅ Dados reais do Asana carregados com sucesso
      const filteredTrackings = result.data || [];
      
      setTrackings(filteredTrackings);
      setMetrics(result.metrics || calculateBasicMetrics(filteredTrackings));
      setCustomFieldsAnalysis(result.customFieldsAnalysis);
      setApiMeta({
        ...result.meta,
        fetchTime: `${fetchTime}ms`,
        clientFilterApplied: false
      });

      console.log(`✅ Asana data loaded: ${filteredTrackings.length} trackings para empresa ${companyFilter || 'ALL'} em ${fetchTime}ms`);

    } catch (err) {
      console.error('❌ Erro ao buscar dados do Asana:', err);
      setError({
        success: false,
        error: 'Erro de conectividade',
        code: 'NETWORK_ERROR',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
        troubleshooting: [
          'Verifique sua conexão com a internet',
          'Confirme se o servidor está rodando (npm run dev)',
          'Verifique se a API do Asana está acessível'
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  // ✅ Effect otimizado - recarrega quando empresa muda
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateBasicMetrics = (data: any[]) => {
    const total = data.length;
    const completed = data.filter(t => t.status === 'Concluído').length;
    const active = total - completed;

    const statusDistribution: Record<string, number> = {};
    const exporterDistribution: Record<string, number> = {};

    data.forEach(tracking => {
      const status = tracking.status || 'Não definido';
      const company = tracking.company || 'Não definido';
      
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      exporterDistribution[company] = (exporterDistribution[company] || 0) + 1;
    });

    return {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      statusDistribution,
      exporterDistribution,
      productDistribution: {},
      armadorDistribution: {},
      terminalDistribution: {},
      orgaosAnuentesDistribution: {},
      etdTimeline: [],
      uniqueExporters: Object.keys(exporterDistribution).length,
      uniqueShippingLines: 0,
      uniqueTerminals: 0,
      totalContainers: 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Carregando dados do Asana{companyFilter ? ` para ${companyFilter}` : ''}...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Conectando diretamente com a API do Asana
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <AsanaErrorDisplay error={error} onRetry={() => fetchData(true)} />;
  }

  return (
    <div className="space-y-6">
      {/* ✅ Asana Connection Info */}
      {apiMeta && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-green-900">
                ✅ Conectado ao Asana: {metrics?.totalOperations || 0} operações
                {companyFilter && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded">
                    {companyFilter}
                  </span>
                )}
              </span>
              {apiMeta.cached && (
                <span className="text-green-600">⚡ Cache ({apiMeta.cacheAge}s)</span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-green-600">
              <span>🚀 {apiMeta.fetchTime}</span>
              <span>📊 Projeto: {apiMeta.project}</span>
              {apiMeta.performance?.dataReduction && (
                <span>📉 -{apiMeta.performance.dataReduction}</span>
              )}
              <button
                onClick={() => fetchData(true)}
                className="text-green-600 hover:text-green-800 font-medium"
              >
                🔄 Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Custom Fields Analysis */}
      {customFieldsAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Custom Fields Detectados</h4>
              <p className="text-sm text-blue-700">
                {customFieldsAnalysis.uniqueFieldNames?.length || 0} campos personalizados encontrados
              </p>
            </div>
            <div className="text-sm text-blue-600">
              {customFieldsAnalysis.uniqueFieldNames?.slice(0, 5).join(', ')}
              {customFieldsAnalysis.uniqueFieldNames?.length > 5 && '...'}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total de Operações"
          value={metrics?.totalOperations || 0}
          icon="📦"
          color="blue"
        />
        <KPICard
          title="Operações Ativas"
          value={metrics?.activeOperations || 0}
          icon="🚢"
          color="orange"
        />
        <KPICard
          title="Concluídas"
          value={metrics?.completedOperations || 0}
          icon="✅"
          color="green"
        />
        <KPICard
          title="Taxa de Efetividade"
          value={`${metrics?.effectiveRate || 0}%`}
          icon="📈"
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <ChartCard title="Distribuição por Status">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.entries(metrics.statusDistribution).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {Object.entries(metrics.statusDistribution).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(index)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Exporter Distribution */}
          <ChartCard title="Distribuição por Exportador">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.entries(metrics.exporterDistribution).map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Data Table */}
      {trackings.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              Operações do Asana
              {companyFilter && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Filtrado para {companyFilter})
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ETD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Armador
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trackings.slice(0, 10).map((tracking, index) => (
                  <tr key={tracking.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tracking.title || tracking.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tracking.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(tracking.status)}`}>
                        {tracking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tracking.schedule?.etd || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tracking.transport?.vessel || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Componente para exibir erros do Asana de forma clara
function AsanaErrorDisplay({ error, onRetry }: { error: AsanaError; onRetry: () => void }) {
  const getErrorIcon = (code: string) => {
    switch (code) {
      case 'MISSING_TOKEN': return '🔑';
      case 'AUTH_FAILED': return '🚫';
      case 'PROJECT_NOT_FOUND': return '📁';
      case 'NO_TASKS': return '📋';
      case 'NO_COMPANY_DATA': return '🏢';
      case 'NETWORK_ERROR': return '🌐';
      default: return '⚠️';
    }
  };

  const getErrorColor = (code: string) => {
    switch (code) {
      case 'MISSING_TOKEN':
      case 'AUTH_FAILED':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'PROJECT_NOT_FOUND':
      case 'NO_TASKS':
      case 'NO_COMPANY_DATA':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-orange-200 bg-orange-50 text-orange-800';
    }
  };

  return (
    <div className="min-h-96 flex items-center justify-center">
      <div className="max-w-2xl mx-auto">
        <div className={`border rounded-lg p-6 ${getErrorColor(error.code)}`}>
          <div className="flex items-start">
            <div className="text-3xl mr-4">{getErrorIcon(error.code)}</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">
                Erro de Conexão com Asana
              </h2>
              <p className="mb-4 font-medium">{error.error}</p>
              
              {error.details && (
                <div className="mb-4 p-3 bg-white bg-opacity-50 rounded">
                  <code className="text-sm">{error.details}</code>
                </div>
              )}

              {/* Setup Instructions */}
              {error.setupInstructions && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Configuração Necessária:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {Object.entries(error.setupInstructions).map(([key, value]) => (
                      <li key={key}>{value}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Available Projects */}
              {error.availableProjects && error.availableProjects.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Projetos Disponíveis:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {error.availableProjects.map(project => (
                      <li key={project.gid}>"{project.name}" ({project.gid})</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Available Companies */}
              {error.availableCompanies && error.availableCompanies.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Empresas Disponíveis:</h4>
                  <p className="text-sm">{error.availableCompanies.join(', ')}</p>
                </div>
              )}

              {/* Troubleshooting */}
              {error.troubleshooting && error.troubleshooting.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Solução:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {error.troubleshooting.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-3">
                <button 
                  onClick={onRetry}
                  className="bg-white bg-opacity-50 hover:bg-opacity-70 px-4 py-2 rounded font-medium transition-colors"
                >
                  🔄 Tentar Novamente
                </button>
                
                {error.code === 'MISSING_TOKEN' && (
                  <button
                    onClick={() => window.open('https://developers.asana.com/docs/personal-access-token', '_blank')}
                    className="bg-white bg-opacity-50 hover:bg-opacity-70 px-4 py-2 rounded font-medium transition-colors"
                  >
                    📖 Como Obter Token
                  </button>
                )}

                <button
                  onClick={() => window.open('/api/asana/debug', '_blank')}
                  className="bg-white bg-opacity-50 hover:bg-opacity-70 px-4 py-2 rounded font-medium transition-colors"
                >
                  🔍 Debug API
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'orange' | 'green' | 'purple';
}

function KPICard({ title, value, icon, color }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-center">
        <div className="text-2xl mr-3">{icon}</div>
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function getStatusColor(index: number): string {
  const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];
  return colors[index % colors.length];
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'Concluído':
      return 'bg-green-100 text-green-800';
    case 'Em Progresso':
      return 'bg-blue-100 text-blue-800';
    case 'A Embarcar':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}