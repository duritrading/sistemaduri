// src/app/dashboard/page.tsx - Ordem reorganizada: ProcessesList primeiro
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';
import { ProcessesList } from '@/components/dashboard/ProcessesList';
import { NewMetricsCards } from '@/components/dashboard/NewMetricsCards';
import { NewChartsGrid } from '@/components/dashboard/NewChartsGrid';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [trackings, setTrackings] = useState<any[]>([]);
  const [filteredTrackings, setFilteredTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (!company) {
      router.push('/login');
      return;
    }
    setCurrentCompany(company);
    fetchRealTimeData();
  }, [router]);

  const fetchRealTimeData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/asana/fixed-trackings?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      setTrackings(result.data);
      
      const company = getCurrentCompany();
      if (company) {
        const companyTrackings = filterTrackingsByCompany(result.data, company.name);
        setFilteredTrackings(companyTrackings);
        
        const calculatedMetrics = recalculateMetricsForCompany(companyTrackings);
        setMetrics(calculatedMetrics);
      }
      
      setLastSync(new Date().toLocaleString('pt-BR'));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      console.error('Erro ao buscar dados:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const recalculateMetricsForCompany = (companyTrackings: any[]) => {
    const total = companyTrackings.length;
    const completed = companyTrackings.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    
    // Contagem de containers
    const totalContainers = companyTrackings.reduce((sum, t) => {
      return sum + (t.transport?.containers?.length || 0);
    }, 0);

    // Status distribution
    const statusDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      statusDistribution[t.status] = (statusDistribution[t.status] || 0) + 1;
    });
    
    // Exporters distribution
    const exporterDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      if (t.transport?.exporter && t.transport.exporter.trim()) {
        exporterDistribution[t.transport.exporter] = (exporterDistribution[t.transport.exporter] || 0) + 1;
      }
    });
    
    // Armadores distribution
    const armadorDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      if (t.transport?.shippingCompany && t.transport.shippingCompany.trim()) {
        armadorDistribution[t.transport.shippingCompany] = (armadorDistribution[t.transport.shippingCompany] || 0) + 1;
      }
    });
    
    // Produtos distribution
    const productDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      if (t.transport?.products && Array.isArray(t.transport.products)) {
        t.transport.products.forEach((product: string) => {
          if (product && product.trim()) {
            productDistribution[product] = (productDistribution[product] || 0) + 1;
          }
        });
      }
    });

    // ETD timeline
    const etdTimeline: Record<string, number> = {};
    companyTrackings.forEach(t => {
      if (t.schedule?.etd) {
        try {
          const [day, month, year] = t.schedule.etd.split('/');
          const monthKey = `${month}/${year.substring(2)}`;
          etdTimeline[monthKey] = (etdTimeline[monthKey] || 0) + 1;
        } catch (e) {
          // Ignorar datas inválidas
        }
      }
    });

    // Órgãos Anuentes
    const orgaosAnuentes = new Set<string>();
    companyTrackings.forEach(t => {
      if (t.regulatory?.orgaosAnuentes && Array.isArray(t.regulatory.orgaosAnuentes)) {
        t.regulatory.orgaosAnuentes.forEach((orgao: string) => {
          if (orgao && orgao.trim()) {
            orgaosAnuentes.add(orgao);
          }
        });
      }
    });

    return {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalContainers,
      statusDistribution,
      exporterDistribution,
      armadorDistribution,
      productDistribution,
      etdTimeline,
      orgaosAnuentesDistribution: Array.from(orgaosAnuentes).reduce((acc, orgao) => {
        acc[orgao] = companyTrackings.filter(t => 
          t.regulatory?.orgaosAnuentes?.includes(orgao)
        ).length;
        return acc;
      }, {} as Record<string, number>)
    };
  };

  const handleLogout = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erro no Dashboard</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchRealTimeData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentCompany?.displayName || 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-600">
                Gestão de Processos de Importação
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchRealTimeData}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - PROCESSOS PRIMEIRO */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Debug Info */}
        {lastSync && (
          <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Última sincronização: {lastSync} - {filteredTrackings.length} processos carregados do Asana
            </p>
          </div>
        )}

        <div className="px-4 py-6 sm:px-0 space-y-8">
          {/* 1. PROCESSOS DE IMPORTAÇÃO - PRIMEIRO */}
          <ProcessesList 
            trackings={filteredTrackings}
            company={currentCompany}
          />
          
          {/* 2. CARDS DE MÉTRICAS - Layout da Imagem 2 */}
          <NewMetricsCards metrics={metrics} />
          
          {/* 3. GRÁFICOS - Layout da Imagem 3 */}
          <NewChartsGrid metrics={metrics} />
        </div>
      </main>
    </div>
  );
}