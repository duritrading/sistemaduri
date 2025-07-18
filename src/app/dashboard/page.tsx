// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, clearCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';
import { ProcessesList } from '@/components/dashboard/ProcessesList';
import { DuriDashboard } from '@/components/dashboard/DuriDashboard';
import { RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [trackings, setTrackings] = useState<any[]>([]);
  const [filteredTrackings, setFilteredTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (!company) {
      router.push('/login');
      return;
    }
    setCurrentCompany(company);
    fetchAccurateData();
  }, [router]);

  const fetchAccurateData = async () => {
    try {
      setRefreshing(true);
      const timestamp = new Date().getTime();
      
      // Use accurate API that only pulls from Asana
      const response = await fetch(`/api/asana/accurate-trackings?t=${timestamp}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('Raw data from Asana:', result);
        
        const company = getCurrentCompany();
        if (company) {
          const companyTrackings = filterTrackingsByCompany(result.data, company.name);
          
          console.log(`Filtered ${companyTrackings.length} trackings for ${company.name}`);
          
          setTrackings(companyTrackings);
          setFilteredTrackings(companyTrackings);
          
          // Recalculate metrics for filtered data
          const filteredMetrics = recalculateMetricsForFiltered(companyTrackings);
          setMetrics(filteredMetrics);
          setDebugInfo(result.debug);
          
          console.log('Final metrics for company:', filteredMetrics);
        }
      } else {
        setError(result.error || 'Erro ao carregar dados precisos');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error fetching accurate data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const recalculateMetricsForFiltered = (companyTrackings: any[]) => {
    const total = companyTrackings.length;
    const completed = companyTrackings.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    
    // Count EXACT status distribution
    const statusDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      const status = t.schedule?.operationalStatus || t.status;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });
    
    const totalContainers = companyTrackings.reduce((sum, t) => {
      return sum + (t.transport?.containers?.length || 0);
    }, 0);
    
    const now = new Date();
    const withDelays = companyTrackings.filter(t => {
      if (t.schedule?.eta && t.status !== 'Concluído') {
        try {
          const etaDate = new Date(t.schedule.eta.split('/').reverse().join('-'));
          return etaDate < now;
        } catch {
          return false;
        }
      }
      return false;
    }).length;
    
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const embarquesThisMonth = companyTrackings.filter(t => {
      if (t.schedule?.etd) {
        try {
          const etdDate = new Date(t.schedule.etd.split('/').reverse().join('-'));
          return etdDate.getMonth() === currentMonth && etdDate.getFullYear() === currentYear;
        } catch {
          return false;
        }
      }
      return false;
    }).length;

    const result = {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      statusDistribution,
      totalContainers,
      withDelays,
      embarquesThisMonth
    };
    
    // Validation
    const statusTotal = Object.values(statusDistribution).reduce((sum: number, count: number) => sum + count, 0);
    console.log('Metrics validation for company:', {
      totalOperations: total,
      statusTotal,
      statusBreakdown: statusDistribution,
      mathCheck: statusTotal === total
    });
    
    return result;
  };

  const handleFiltersChange = (filters: any) => {
    let filtered = [...trackings];
    
    if (filters.ref !== 'Todas as REF') {
      filtered = filtered.filter(t => t.title.includes(filters.ref));
    }
    
    if (filters.status !== 'Todos os Status') {
      filtered = filtered.filter(t => 
        (t.schedule?.operationalStatus || t.status) === filters.status
      );
    }
    
    if (filters.exportador !== 'Todos Exportadores') {
      filtered = filtered.filter(t => 
        t.transport?.exporter === filters.exportador
      );
    }
    
    if (filters.produto !== 'Todos Produtos') {
      filtered = filtered.filter(t => 
        t.transport?.products?.includes(filters.produto) ||
        t.transport?.commodity === filters.produto
      );
    }
    
    if (filters.orgaoAnuente !== 'Todos Órgãos') {
      filtered = filtered.filter(t => 
        t.regulatory?.orgaosAnuentes?.includes(filters.orgaoAnuente)
      );
    }
    
    setFilteredTrackings(filtered);
    setMetrics(recalculateMetricsForFiltered(filtered));
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  if (!currentCompany || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados precisos do Asana...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-red-600 mr-4">duri</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentCompany.displayName}
              </h1>
              <p className="text-sm text-gray-500">Sistema de Tracking Marítimo</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchAccurateData}
              disabled={refreshing}
              className="flex items-center text-red-600 hover:text-red-800 text-sm"
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
              onClick={fetchAccurateData}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Debug Info - Remove in production */}
        {debugInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
            <strong>Debug:</strong> {debugInfo.totalTasksFromAsana} tasks do Asana → {debugInfo.processedTrackings} processados
            {debugInfo.metricsBreakdown?.validation && !debugInfo.metricsBreakdown.validation.mathValid && (
              <span className="text-red-600 ml-2">⚠️ Inconsistência matemática detectada</span>
            )}
          </div>
        )}

        <ProcessesList processes={filteredTrackings} />
        
        {metrics && (
          <DuriDashboard 
            trackings={filteredTrackings} 
            metrics={metrics} 
            onFiltersChange={handleFiltersChange}
          />
        )}
      </main>
    </div>
  );
}