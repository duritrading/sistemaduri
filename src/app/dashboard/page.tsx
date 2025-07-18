// src/app/dashboard/page.tsx - Compact grid + enhanced metrics
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentCompany, clearCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';
import { MetricsCharts } from '@/components/MetricsCharts';

interface CompanyMetrics {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  recentUpdates: number;
  averageTimeToComplete: string;
  topResponsible: string;
  effectivenessRate: number;
  statusBreakdown: Record<string, number>;
}

export default function DashboardPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [trackings, setTrackings] = useState<any[]>([]);
  const [allTrackings, setAllTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (!company) {
      router.push('/login');
      return;
    }
    setCurrentCompany(company);
    fetchTrackings();
  }, [router]);

  const fetchTrackings = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/asana/trackings?t=${timestamp}`);
      const result = await response.json();
      
      if (result.success) {
        setAllTrackings(result.data);
        
        const company = getCurrentCompany();
        if (company) {
          const filteredTrackings = filterTrackingsByCompany(result.data, company.name);
          setTrackings(filteredTrackings);
          setMetrics(calculateMetrics(filteredTrackings));
        }
      } else {
        setError(result.error || 'Erro ao carregar trackings');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error fetching trackings:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (trackings: any[]): CompanyMetrics => {
    const totalProcesses = trackings.length;
    const completedProcesses = trackings.filter(t => t.status === 'Concluído').length;
    const activeProcesses = totalProcesses - completedProcesses;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUpdates = trackings.filter(t => {
      const updateDate = new Date(t.lastUpdate.split('/').reverse().join('-'));
      return updateDate > sevenDaysAgo;
    }).length;

    const responsibleCount: Record<string, number> = {};
    trackings.forEach(t => {
      if (t.schedule?.responsible) {
        responsibleCount[t.schedule.responsible] = (responsibleCount[t.schedule.responsible] || 0) + 1;
      }
    });
    const topResponsible = Object.keys(responsibleCount).reduce((a, b) => 
      responsibleCount[a] > responsibleCount[b] ? a : b, ''
    );

    const statusBreakdown: Record<string, number> = {};
    trackings.forEach(t => {
      const status = t.status === 'Concluído' ? 'Concluído' : 'Em dia';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    const effectivenessRate = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;

    return {
      totalProcesses,
      activeProcesses,
      completedProcesses,
      recentUpdates,
      averageTimeToComplete: '45 dias',
      topResponsible,
      effectivenessRate,
      statusBreakdown
    };
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  if (!currentCompany) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {currentCompany.displayName}
            </h1>
            <p className="text-sm text-gray-500">Sistema de Tracking Marítimo</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Ocultar Métricas</span>
            <button
              onClick={fetchTrackings}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Carregando dashboard...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-6 mb-8">
            <p className="text-red-800 font-medium">❌ Erro:</p>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchTrackings}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {!loading && !error && metrics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-500 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total de Operações</p>
                    <p className="text-2xl font-bold">{metrics.totalProcesses}</p>
                  </div>
                  <span className="text-2xl">📦</span>
                </div>
              </div>

              <div className="bg-orange-500 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Taxa de Efetividade</p>
                    <p className="text-2xl font-bold">{metrics.effectivenessRate}%</p>
                  </div>
                  <span className="text-2xl">✓</span>
                </div>
              </div>

              <div className="bg-orange-500 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Operações Ativas</p>
                    <p className="text-2xl font-bold">{metrics.activeProcesses}</p>
                  </div>
                  <span className="text-2xl">🚢</span>
                </div>
              </div>

              <div className="bg-orange-500 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Atualizações Recentes</p>
                    <p className="text-2xl font-bold">{metrics.recentUpdates}</p>
                  </div>
                  <span className="text-2xl">🔄</span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <MetricsCharts trackings={trackings} metrics={metrics} />

            {/* Processes Grid */}
            <div className="bg-white rounded-lg shadow border mt-8">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Seus Processos de Importação ({trackings.length})
                </h3>
                <span className="text-sm text-gray-500">Ocultar Métricas</span>
              </div>

              {trackings.length === 0 ? (
                <div className="p-8 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    📦 Nenhum processo encontrado
                  </h3>
                  <p className="text-gray-600">
                    Não há processos para <strong>{currentCompany.displayName}</strong> no momento.
                  </p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {trackings.map((tracking) => (
                      <Link
                        key={tracking.id}
                        href={`/tracking/${tracking.id}`}
                        className="border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow hover:border-blue-300 group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">
                            {tracking.title}
                          </h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 flex-shrink-0">
                            Em Progresso
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                          Processo de importação marítima
                        </p>
                        
                        <div className="space-y-1 text-xs text-gray-500">
                          {tracking.transport?.vessel && (
                            <div className="flex items-center gap-1">
                              <span>🚢</span>
                              <span className="truncate">{tracking.transport.vessel}</span>
                            </div>
                          )}
                          
                          {tracking.schedule?.eta && (
                            <div className="flex items-center gap-1">
                              <span>📅</span>
                              <span>ETA: {tracking.schedule.eta}</span>
                            </div>
                          )}
                          
                          {tracking.schedule?.responsible && (
                            <div className="flex items-center gap-1">
                              <span>👤</span>
                              <span className="truncate">{tracking.schedule.responsible}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            {tracking.lastUpdate}
                          </span>
                          <span className="text-blue-600 text-xs font-medium group-hover:text-blue-800">
                            Ver Detalhes →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}