// src/components/UnifiedDashboard.tsx - Exemplo de Migração Completa
'use client';

import { useState, useEffect } from 'react';
import { TrackingService, UnifiedTracking, TrackingMetrics } from '@/lib/tracking-service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UnifiedDashboardProps {
  companyFilter?: string;
}

export function UnifiedDashboard({ companyFilter }: UnifiedDashboardProps) {
  const [trackings, setTrackings] = useState<UnifiedTracking[]>([]);
  const [metrics, setMetrics] = useState<TrackingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackingData();
  }, [companyFilter]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const trackingService = new TrackingService();
      
      let data: UnifiedTracking[];
      
      if (companyFilter) {
        // Buscar por empresa específica
        data = await trackingService.getTrackingsByCompany(companyFilter);
        
        // Calcular métricas para a empresa filtrada
        const response = await trackingService.getAllTrackings();
        if (response.success) {
          setMetrics(calculateFilteredMetrics(data));
        }
      } else {
        // Buscar todos os trackings
        const response = await trackingService.getAllTrackings();
        
        if (!response.success) {
          setError(response.error || 'Failed to fetch data');
          return;
        }
        
        data = response.data;
        setMetrics(response.metrics);
      }
      
      setTrackings(data);

    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando dados...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        <strong>Erro:</strong> {error}
        <button 
          onClick={() => fetchTrackingData()} 
          className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // No data state
  if (!metrics || trackings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <h3 className="text-lg font-medium">Nenhum tracking encontrado</h3>
        {companyFilter && (
          <p className="mt-2">Filtro aplicado: {companyFilter}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtro */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard Marítimo {companyFilter && `- ${companyFilter}`}
        </h1>
        <button
          onClick={() => fetchTrackingData()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Atualizar Dados
        </button>
      </div>

      {/* Métricas Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Operações"
          value={metrics.totalOperations}
          color="blue"
          icon="📊"
        />
        <MetricCard
          title="Taxa Efetividade"
          value={`${metrics.effectiveRate}%`}
          color="green"
          icon="✅"
        />
        <MetricCard
          title="Exportadores Únicos"
          value={metrics.uniqueExporters}
          color="purple"
          icon="🏢"
        />
        <MetricCard
          title="Total Containers"
          value={metrics.totalContainers}
          color="orange"
          icon="📦"
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

        {/* Top Exporters */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Exportadores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={Object.entries(metrics.exporterDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([name, value]) => ({ name: name.length > 12 ? name.substring(0, 12) + '...' : name, value }))}
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
                  Exportador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Navio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ETA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trackings.slice(0, 10).map((tracking) => (
                <tr key={tracking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tracking.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tracking.transport.exporter || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tracking.transport.vessel || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(tracking.status)}`}>
                      {tracking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tracking.schedule.eta || 'N/A'}
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
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600', 
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} px-4 py-2`}>
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
function getStatusColor(index: number): string {
  const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
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

// Helper to calculate metrics for filtered data
function calculateFilteredMetrics(trackings: UnifiedTracking[]): TrackingMetrics {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  const statusDistribution: Record<string, number> = {};
  const exporterDistribution: Record<string, number> = {};
  const armadorDistribution: Record<string, number> = {};
  const productDistribution: Record<string, number> = {};
  const terminals = new Set<string>();
  const shippingLines = new Set<string>();
  
  let totalContainers = 0;
  
  trackings.forEach(tracking => {
    statusDistribution[tracking.status] = (statusDistribution[tracking.status] || 0) + 1;
    
    if (tracking.transport.exporter) {
      exporterDistribution[tracking.transport.exporter] = 
        (exporterDistribution[tracking.transport.exporter] || 0) + 1;
    }
    
    if (tracking.transport.company) {
      armadorDistribution[tracking.transport.company] = 
        (armadorDistribution[tracking.transport.company] || 0) + 1;
      shippingLines.add(tracking.transport.company);
    }
    
    if (tracking.transport.terminal) {
      terminals.add(tracking.transport.terminal);
    }
    
    tracking.transport.products.forEach(product => {
      if (product) {
        productDistribution[product] = (productDistribution[product] || 0) + 1;
      }
    });
    
    totalContainers += tracking.transport.containers.length;
  });

  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    
    statusDistribution,
    exporterDistribution,
    armadorDistribution,
    productDistribution,
    
    uniqueExporters: Object.keys(exporterDistribution).length,
    uniqueShippingLines: shippingLines.size,
    uniqueTerminals: terminals.size,
    totalContainers,
    
    allShippingLines: Array.from(shippingLines),
    allTerminals: Array.from(terminals)
  };
}