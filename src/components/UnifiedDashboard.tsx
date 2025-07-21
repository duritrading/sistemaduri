// src/components/UnifiedDashboard.tsx - Dashboard completamente limpo
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UnifiedDashboardProps {
  companyFilter?: string;
}

export function UnifiedDashboard({ companyFilter }: UnifiedDashboardProps) {
  const [trackings, setTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [companyFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/asana/unified', {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar dados');
      }

      let filteredTrackings = result.data || [];
      
      // Aplicar filtro de empresa se especificado
      if (companyFilter) {
        filteredTrackings = filteredTrackings.filter((tracking: any) => 
          tracking.company === companyFilter
        );
      }

      setTrackings(filteredTrackings);
      setMetrics(result.metrics || calculateBasicMetrics(filteredTrackings));

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

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
      uniqueExporters: Object.keys(exporterDistribution).length,
      totalContainers: data.reduce((sum, t) => sum + (t.transport?.containers?.length || 0), 0)
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
        <div className="flex items-center">
          <span className="mr-3">⚠️</span>
          <div>
            <h3 className="font-semibold">Erro no Dashboard</h3>
            <p className="mt-1">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!metrics || trackings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Nenhum tracking encontrado
        </h3>
        <p className="text-gray-600 mb-4">
          {companyFilter 
            ? `Nenhum tracking encontrado para ${companyFilter}` 
            : 'Nenhum tracking disponível no momento'
          }
        </p>
        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          🔄 Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          📊 Visão Geral {companyFilter && `- ${companyFilter}`}
        </h2>
        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Atualizar</span>
        </button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Operações"
          value={metrics.totalOperations}
          color="blue"
          icon="📋"
        />
        <MetricCard
          title="Em Progresso"
          value={metrics.activeOperations}
          color="yellow"
          icon="⏳"
        />
        <MetricCard
          title="Concluídas"
          value={metrics.completedOperations}
          color="green"
          icon="✅"
        />
        <MetricCard
          title="Taxa Sucesso"
          value={`${metrics.effectiveRate}%`}
          color="purple"
          icon="🎯"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(metrics.statusDistribution).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {Object.entries(metrics.statusDistribution).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(index)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Exporters Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Exportadores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(metrics.exporterDistribution)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 8)
                .map(([name, value]) => ({ 
                  name: name.length > 12 ? name.substring(0, 12) + '...' : name, 
                  value 
                }))
              }
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Trackings Table */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operações Recentes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Navio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ETA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trackings.slice(0, 10).map((tracking, index) => (
                <tr key={tracking.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tracking.company || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {tracking.title || 'Sem título'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(tracking.status)}`}>
                      {tracking.status || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tracking.transport?.vessel || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tracking.schedule?.eta || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, color, icon }: { 
  title: string; 
  value: number | string;
  color: string;
  icon: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center">
        <span className="text-2xl mr-3">{icon}</span>
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(index: number) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return colors[index % colors.length];
}

function getStatusBadgeColor(status: string) {
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