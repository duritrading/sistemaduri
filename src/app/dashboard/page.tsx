// src/app/dashboard/page.tsx - Dashboard atualizado para usar dados reais
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';
import { ProcessesList } from '@/components/dashboard/ProcessesList';
import { DuriDashboard } from '@/components/dashboard/DuriDashboard';
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
      
      // Usar nova API com mapeamento corrigido + cache bypass
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/asana/fixed-trackings?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Dados recebidos do Asana:', result.meta);
        
        const company = getCurrentCompany();
        if (company) {
          // Filtrar por empresa usando campo company extraído do título
          const companyTrackings = result.data.filter((tracking: any) => 
            tracking.company && 
            tracking.company.toLowerCase().includes(company.name.toLowerCase())
          );
          
          console.log(`📊 Filtrados ${companyTrackings.length} trackings para ${company.name}`);
          
          setTrackings(result.data);
          setFilteredTrackings(companyTrackings);
          
          // Recalcular métricas apenas para dados filtrados
          const filteredMetrics = recalculateMetricsForCompany(companyTrackings);
          setMetrics(filteredMetrics);
          setLastSync(new Date().toLocaleTimeString('pt-BR'));
          
          console.log('📈 Métricas finais:', filteredMetrics);
        }
      } else {
        setError(result.error || 'Erro ao carregar dados do Asana');
        console.error('❌ Erro na resposta:', result);
      }
    } catch (err) {
      setError('Erro de conexão com Asana');
      console.error('❌ Erro de conexão:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const recalculateMetricsForCompany = (companyTrackings: any[]) => {
    const total = companyTrackings.length;
    const completed = companyTrackings.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    
    // Status distribution
    const statusDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      statusDistribution[t.status] = (statusDistribution[t.status] || 0) + 1;
    });
    
    // Exporters from Exportador field
    const exporterDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      if (t.transport?.exporter && t.transport.exporter.trim()) {
        exporterDistribution[t.transport.exporter] = (exporterDistribution[t.transport.exporter] || 0) + 1;
      }
    });
    
    // Shipping companies from CIA DE TRANSPORTE field
    const shippingLines = new Set<string>();
    const armadorDistribution: Record<string, number> = {};
    companyTrackings.forEach(t => {
      if (t.transport?.shippingCompany && t.transport.shippingCompany.trim()) {
        shippingLines.add(t.transport.shippingCompany);
        armadorDistribution[t.transport.shippingCompany] = (armadorDistribution[t.transport.shippingCompany] || 0) + 1;
      }
    });
    
    // Terminals
    const terminals = new Set<string>();
    companyTrackings.forEach(t => {
      if (t.transport?.terminal && t.transport.terminal.trim()) {
        terminals.add(t.transport.terminal);
      }
    });
    
    // Products from PRODUTO field
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
    
    // Containers count
    const totalContainers = companyTrackings.reduce((sum, t) => {
      return sum + (t.transport?.containers?.length || 0);
    }, 0);
    
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

    return {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      
      // For cards
      uniqueExporters: Object.keys(exporterDistribution).length,
      uniqueShippingLines: shippingLines.size,
      uniqueTerminals: terminals.size,
      totalContainers,
      
      // For charts
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
      }, {} as Record<string, number>),
      
      // Arrays for charts
      allShippingLines: Array.from(shippingLines),
      allTerminals: Array.from(terminals),
      allProducts: Object.keys(productDistribution),
      allOrgaosAnuentes: Array.from(orgaosAnuentes)
    };
  };

  const handleLogout = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Carregando dados do Asana...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchRealTimeData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
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
      <header className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-red-600">duri</div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">UNIVAR</h1>
                <p className="text-sm text-gray-500">Sistema de Tracking Marítimo</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchRealTimeData}
                disabled={refreshing}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Debug Info */}
        {lastSync && (
          <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Última sincronização: {lastSync} - {filteredTrackings.length} processos carregados do Asana
            </p>
          </div>
        )}

        {/* Dashboard */}
        <div className="px-4 py-6 sm:px-0">
          <DuriDashboard 
            trackings={filteredTrackings} 
            metrics={metrics}
          />
          
          <div className="mt-8">
            <ProcessesList 
              trackings={filteredTrackings}
              company={currentCompany}
            />
          </div>
        </div>
      </main>
    </div>
  );
}