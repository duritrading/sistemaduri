// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, clearCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';
import { ProcessesList } from '@/components/dashboard/ProcessesList';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { MetricsCharts } from '@/components/MetricsCharts';
import { RefreshCw } from 'lucide-react';

interface CompanyMetrics {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  recentUpdates: number;
  averageTimeToComplete: string;
  topResponsible: string;
  effectivenessRate: number;
  statusBreakdown: Record<string, number>;
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  effectiveRate: number;
}

export default function DashboardPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [trackings, setTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(true);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/asana/trackings?t=${timestamp}`);
      const result = await response.json();
      
      if (result.success) {
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
      setRefreshing(false);
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
      statusBreakdown,
      totalOperations: totalProcesses,
      activeOperations: activeProcesses,
      completedOperations: completedProcesses,
      effectiveRate: effectivenessRate
    };
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  if (!currentCompany || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
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
            <p className="text-sm text-gray-500">Sistema de Tracking Marítimo</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTrackings}
              disabled={refreshing}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
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

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-6">
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

        {/* Processes Section - PRIMEIRO LUGAR */}
        <ProcessesList processes={trackings} />
        
        {/* Metrics Cards */}
        {metrics && <MetricsCards metrics={metrics} />}
        
        {/* Charts */}
        {metrics && <MetricsCharts trackings={trackings} metrics={metrics} />}
      </main>
    </div>
  );
}