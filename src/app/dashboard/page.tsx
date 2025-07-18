// src/app/dashboard/page.tsx - Dashboard com métricas gerais da empresa
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentCompany, clearCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';

interface CompanyMetrics {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  recentUpdates: number;
  averageTimeToComplete: string;
  topResponsible: string;
  statusBreakdown: {
    [key: string]: number;
  };
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
    
    // Processos atualizados nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUpdates = trackings.filter(t => {
      const updateDate = new Date(t.lastUpdate.split('/').reverse().join('-'));
      return updateDate > sevenDaysAgo;
    }).length;

    // Responsável mais frequente
    const responsibleCount: { [key: string]: number } = {};
    trackings.forEach(t => {
      if (t.schedule?.responsible) {
        responsibleCount[t.schedule.responsible] = (responsibleCount[t.schedule.responsible] || 0) + 1;
      }
    });
    const topResponsible = Object.keys(responsibleCount).reduce((a, b) => 
      responsibleCount[a] > responsibleCount[b] ? a : b, ''
    );

    // Breakdown por status
    const statusBreakdown: { [key: string]: number } = {};
    trackings.forEach(t => {
      statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1;
    });

    return {
      totalProcesses,
      activeProcesses,
      completedProcesses,
      recentUpdates,
      averageTimeToComplete: '45 dias', // Placeholder
      topResponsible,
      statusBreakdown
    };
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Em Progresso': 'bg-blue-100 text-blue-800',
      'Concluído': 'bg-green-100 text-green-800',
      'Planejamento': 'bg-yellow-100 text-yellow-800',
      'Atrasado': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!currentCompany) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {currentCompany.displayName}
            </h1>
            <p className="text-sm text-gray-500">
              Sistema de Tracking Marítimo
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTrackings}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              🔄 Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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

        {!loading && !error && (
          <>
            {/* Dashboard Metrics */}
            {metrics && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Dashboard - {currentCompany.displayName}
                </h2>
                
                {/* Key Metrics */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100">
                        <span className="text-2xl">📦</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total de Processos</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.totalProcesses}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100">
                        <span className="text-2xl">✅</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Concluídos</p>
                        <p className="text-2xl font-bold text-green-600">{metrics.completedProcesses}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-orange-100">
                        <span className="text-2xl">🚢</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                        <p className="text-2xl font-bold text-orange-600">{metrics.activeProcesses}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-purple-100">
                        <span className="text-2xl">🔄</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Atualizações Recentes</p>
                        <p className="text-2xl font-bold text-purple-600">{metrics.recentUpdates}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow border mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Processos</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(metrics.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                        <span className="font-medium text-gray-700">{status}</span>
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid gap-6 md:grid-cols-2 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Responsável Principal</h3>
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">👤</span>
                      <span className="text-gray-700">{metrics.topResponsible || 'Não definido'}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tempo Médio</h3>
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">⏱️</span>
                      <span className="text-gray-700">{metrics.averageTimeToComplete}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Processes List */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Seus Processos de Importação ({trackings.length})
                </h3>
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
                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {trackings.map((tracking) => (
                      <Link
                        key={tracking.id}
                        href={`/tracking/${tracking.id}`}
                        className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow hover:border-blue-300 group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {tracking.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tracking.status)}`}>
                            {tracking.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {tracking.description || 'Processo de importação marítima'}
                        </p>
                        
                        <div className="space-y-1 text-xs text-gray-500">
                          {tracking.transport?.vessel && (
                            <div className="flex items-center gap-2">
                              🚢 <span>{tracking.transport.vessel}</span>
                            </div>
                          )}
                          
                          {tracking.schedule?.eta && (
                            <div className="flex items-center gap-2">
                              📅 <span>ETA: {tracking.schedule.eta}</span>
                            </div>
                          )}
                          
                          {tracking.schedule?.responsible && (
                            <div className="flex items-center gap-2">
                              👤 <span>{tracking.schedule.responsible}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            Atualizado: {tracking.lastUpdate}
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