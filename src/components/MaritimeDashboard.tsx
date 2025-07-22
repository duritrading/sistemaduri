// src/components/MaritimeDashboard.tsx - ORQUESTRADOR DOS 3 COMPONENTES
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { KPIDashboard } from './KPIDashboard';
import { ChartsDashboard } from './ChartsDashboard';  
import { OperationsDashboard } from './OperationsDashboard';

// ✅ INTERFACES - Mantidas exatamente iguais
interface MaritimeDashboardProps {
  companyFilter?: string;
  refs?: {
    resumo: React.RefObject<HTMLDivElement>;
    graficos: React.RefObject<HTMLDivElement>;
    operacoes: React.RefObject<HTMLDivElement>;
  };
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

interface FilterState {
  reference: string;
  status: string;
  exporter: string;
  product: string;
  orgaoAnuente: string;
}

interface Tracking {
  id: string;
  title: string;
  company: string;
  ref: string;
  status: string;
  maritimeStatus: string;
  transport: {
    exporter: string | null;
    company: string | null;
    vessel: string | null;
    blAwb: string | null;
    containers: string[];
    terminal: string | null;
    products: string[];
    transportadora: string | null;
    despachante: string | null;
  };
  schedule: {
    etd: string | null;
    eta: string | null;
    fimFreetime: string | null;
    fimArmazenagem: string | null;
    responsible: string | null;
  };
  business: {
    empresa: string | null;
    servicos: string | null;
    beneficioFiscal: string | null;
    canal: string | null;
    prioridade: string | null;
    adiantamento: string | null;
  };
  documentation: {
    invoice: string | null;
    blAwb: string | null;
  };
  regulatory: {
    orgaosAnuentes: string[];
  };
  customFields: Record<string, any>;
}

const initialFilters: FilterState = {
  reference: '',
  status: '',
  exporter: '',
  product: '',
  orgaoAnuente: ''
};

export function MaritimeDashboard({ 
  companyFilter,
  refs,
  activeSection,
  onSectionChange
}: MaritimeDashboardProps) {
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  // ✅ Função para identificar operações canceladas (MANTIDA EXATA)
  const isOperationCancelled = (tracking: Tracking): boolean => {
    const cancelKeywords = ['cancel', 'suspens', 'abort', 'parad'];
    
    if (tracking.maritimeStatus && tracking.maritimeStatus.toLowerCase().includes('cancel')) {
      return true;
    }

    if (tracking.title) {
      const titleLower = tracking.title.toLowerCase();
      if (cancelKeywords.some(keyword => titleLower.includes(keyword))) {
        return true;
      }
    }

    if (tracking.customFields) {
      const fieldValues = Object.values(tracking.customFields).join(' ').toLowerCase();
      if (cancelKeywords.some(keyword => fieldValues.includes(keyword))) {
        return true;
      }
    }

    return false;
  };

  // ✅ Fetch dados do Asana (MANTIDO EXATO)
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (companyFilter) {
        params.append('company', companyFilter);
      }
      if (forceRefresh) {
        params.append('refresh', 'true');
      }

      const response = await fetch(`/api/asana/unified?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar dados');
      }

      const trackingsData = Array.isArray(result.data) ? result.data : [];
      setTrackings(trackingsData);

    } catch (err) {
      console.error('❌ Erro ao buscar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Dados filtrados (LÓGICA MANTIDA EXATA)
  const filteredTrackings = useMemo(() => {
    return trackings.filter(tracking => {
      if (filters.reference && 
          !tracking.ref.toLowerCase().includes(filters.reference.toLowerCase()) && 
          !tracking.title.toLowerCase().includes(filters.reference.toLowerCase())) {
        return false;
      }

      if (filters.status && tracking.maritimeStatus !== filters.status) {
        return false;
      }

      if (filters.exporter && tracking.transport.exporter && 
          !tracking.transport.exporter.toLowerCase().includes(filters.exporter.toLowerCase())) {
        return false;
      }

      if (filters.product) {
        const hasProduct = tracking.transport.products.some(p => 
          p.toLowerCase().includes(filters.product.toLowerCase())
        );
        if (!hasProduct) return false;
      }

      if (filters.orgaoAnuente) {
        const hasOrgao = tracking.regulatory.orgaosAnuentes.some(o => 
          o.toLowerCase().includes(filters.orgaoAnuente.toLowerCase())
        );
        if (!hasOrgao) return false;
      }

      return true;
    });
  }, [trackings, filters]);

  // ✅ Extrair opções únicas para filtros (MANTIDO EXATO)
  const filterOptions = useMemo(() => {
    return {
      statuses: [...new Set(trackings.map(t => t.maritimeStatus))].filter(Boolean).sort(),
      exporters: [...new Set(trackings.map(t => t.transport.exporter))].filter(Boolean).sort(),
      products: [...new Set(trackings.flatMap(t => t.transport.products))].filter(Boolean).sort(),
      orgaosAnuentes: [...new Set(trackings.flatMap(t => t.regulatory.orgaosAnuentes))].filter(Boolean).sort()
    };
  }, [trackings]);

  // ✅ HANDLERS para callbacks
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const refreshData = () => {
    fetchData(true);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // ✅ LOADING GLOBAL
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-6">
          {/* Loading KPIs */}
          <div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          
          {/* Loading Charts */}
          <div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          
          {/* Loading Operations */}
          <div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="bg-gray-200 h-64 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ERROR GLOBAL
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ✅ COMPONENTE KPI - Seção de KPIs e Filtros */}
      <KPIDashboard
        trackings={trackings}
        filteredTrackings={filteredTrackings}
        filters={filters}
        filterOptions={filterOptions}
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilterChange}
        onToggleFilters={toggleFilters}
        onClearFilters={clearFilters}
        onRefreshData={refreshData}
      />

      {/* ✅ COMPONENTE CHARTS - Seção de Gráficos */}
      <ChartsDashboard
        filteredTrackings={filteredTrackings}
        loading={false}
      />

      {/* ✅ COMPONENTE OPERATIONS - Seção de Operações */}
      <OperationsDashboard
        filteredTrackings={filteredTrackings}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        loading={false}
      />
    </div>
  );
}