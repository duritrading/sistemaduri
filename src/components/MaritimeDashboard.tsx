// src/components/MaritimeDashboard.tsx - COM SEÇÕES ORGANIZADAS PARA NAVEGAÇÃO
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, RotateCcw, CheckCircle, XCircle, FilePlus, Ship, Waves, Building, Truck, FileText, Filter } from 'lucide-react';
import { ChartsSection } from './ChartsSection';

interface MaritimeDashboardProps {
  companyFilter?: string;
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

export function MaritimeDashboard({ companyFilter }: MaritimeDashboardProps) {
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  // ✅ Função para identificar operações canceladas
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

  // ✅ Fetch dados do Asana
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

  // ✅ Dados filtrados
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

  // ✅ KPIs calculados
  const kpis = useMemo(() => {
    const total = filteredTrackings.length;
    const canceladas = filteredTrackings.filter(tracking => isOperationCancelled(tracking)).length;
    const nonCancelledTrackings = filteredTrackings.filter(tracking => !isOperationCancelled(tracking));
    
    const byStage = nonCancelledTrackings.reduce((acc, tracking) => {
      const stage = tracking.maritimeStatus;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const processosFinalizados = byStage['Processos Finalizados'] || 0;
    const ativas = nonCancelledTrackings.length - processosFinalizados;

    return {
      total,
      ativas,
      processosFinalizados,
      canceladas,
      aberturaProcesso: byStage['Abertura do Processo'] || 0,
      preEmbarque: byStage['Pré Embarque'] || 0,
      rasteioCarga: byStage['Rastreio da Carga'] || 0,
      chegadaCarga: byStage['Chegada da Carga'] || 0,
      entrega: byStage['Entrega'] || 0,
      fechamento: byStage['Fechamento'] || 0
    };
  }, [filteredTrackings]);

  // ✅ Extrair opções únicas para filtros
  const filterOptions = useMemo(() => {
    return {
      statuses: [...new Set(trackings.map(t => t.maritimeStatus))].filter(Boolean).sort(),
      exporters: [...new Set(trackings.map(t => t.transport.exporter))].filter(Boolean).sort(),
      products: [...new Set(trackings.flatMap(t => t.transport.products))].filter(Boolean).sort(),
      orgaosAnuentes: [...new Set(trackings.flatMap(t => t.regulatory.orgaosAnuentes))].filter(Boolean).sort()
    };
  }, [trackings]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchData(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ✅ SEÇÃO RESUMO: KPI Cards */}
      <div id="resumo" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resumo Operacional</h2>
            <p className="text-gray-600">
              {trackings.length} operações • {filteredTrackings.length} exibidas
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} className="mr-2" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => fetchData(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw size={16} className="mr-2" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referência
                </label>
                <input
                  type="text"
                  value={filters.reference}
                  onChange={(e) => handleFilterChange('reference', e.target.value)}
                  placeholder="Buscar por referência..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Marítimo
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os status</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exportador
                </label>
                <select
                  value={filters.exporter}
                  onChange={(e) => handleFilterChange('exporter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os exportadores</option>
                  {filterOptions.exporters.map(exporter => (
                    <option key={exporter} value={exporter}>{exporter}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto
                </label>
                <select
                  value={filters.product}
                  onChange={(e) => handleFilterChange('product', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os produtos</option>
                  {filterOptions.products.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Órgão Anuente
                </label>
                <select
                  value={filters.orgaoAnuente}
                  onChange={(e) => handleFilterChange('orgaoAnuente', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os órgãos</option>
                  {filterOptions.orgaosAnuentes.map(orgao => (
                    <option key={orgao} value={orgao}>{orgao}</option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* KPI Cards - Primeira Linha */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KPICard
            title="Total de Operações"
            value={kpis.total}
            icon={<Package size={24} />}
            color="blue"
            subtitle="Todas as operações"
          />
          <KPICard
            title="Operações Ativas"
            value={kpis.ativas}
            icon={<RotateCcw size={24} />}
            color="orange"
            subtitle="Em andamento"
          />
          <KPICard
            title="Operações Finalizadas"
            value={kpis.processosFinalizados}
            icon={<CheckCircle size={24} />}
            color="green"
            subtitle="Completamente concluídas"
          />
          <KPICard
            title="Operações Canceladas"
            value={kpis.canceladas}
            icon={<XCircle size={24} />}
            color="red"
            subtitle="Canceladas ou suspensas"
          />
        </div>

        {/* KPI Cards - Segunda Linha - Stages Específicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            title="Abertura do Processo"
            value={kpis.aberturaProcesso}
            icon={<FilePlus size={20} />}
            color="yellow"
            subtitle="Processo iniciado"
            compact={true}
          />
          <KPICard
            title="Pré Embarque"
            value={kpis.preEmbarque}
            icon={<Ship size={20} />}
            color="orange"
            subtitle="Preparação"
            compact={true}
          />
          <KPICard
            title="Rastreio da Carga"
            value={kpis.rasteioCarga}
            icon={<Waves size={20} />}
            color="blue"
            subtitle="Em trânsito"
            compact={true}
          />
          <KPICard
            title="Chegada da Carga"
            value={kpis.chegadaCarga}
            icon={<Building size={20} />}
            color="purple"
            subtitle="No destino"
            compact={true}
          />
          <KPICard
            title="Entrega"
            value={kpis.entrega}
            icon={<Truck size={20} />}
            color="green"
            subtitle="Entregando"
            compact={true}
          />
          <KPICard
            title="Fechamento"
            value={kpis.fechamento}
            icon={<FileText size={20} />}
            color="green"
            subtitle="Finalizando"
            compact={true}
          />
        </div>
      </div>

      {/* ✅ SEÇÃO GRÁFICOS */}
      <div id="graficos" className="scroll-mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gráficos Operacionais</h2>
          <p className="text-gray-600">Visualização dos dados de tracking marítimo</p>
        </div>
        
        <ChartsSection trackings={filteredTrackings} />
      </div>

      {/* ✅ SEÇÃO OPERAÇÕES: Tabela */}
      <div id="operacoes" className="scroll-mt-24">
        <div className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Operações</h2>
            <p className="text-gray-600">Lista detalhada de todas as operações de tracking</p>
          </div>
          
          <div className="overflow-x-auto">
            {filteredTrackings.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exportador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETD
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produtos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrackings.map((tracking) => {
                    const isCancelled = isOperationCancelled(tracking);
                    return (
                      <tr key={tracking.id} className={isCancelled ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{tracking.ref}</div>
                          <div className="text-sm text-gray-500">{tracking.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tracking.transport.exporter || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isCancelled ? 'bg-red-100 text-red-800' : getStatusColor(tracking.maritimeStatus)
                          }`}>
                            {isCancelled ? 'Cancelada' : tracking.maritimeStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tracking.schedule.etd || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tracking.transport.products.slice(0, 2).join(', ') || '-'}
                          {tracking.transport.products.length > 2 && ' ...'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma operação encontrada</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Componente KPICard
interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'yellow';
  subtitle?: string;
  compact?: boolean;
}

function KPICard({ title, value, icon, color, subtitle, compact = false }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  };

  if (compact) {
    return (
      <div className={`border rounded-lg p-4 transition-all hover:shadow-md ${colorClasses[color]}`}>
        <div className="text-center">
          <div className="flex justify-center mb-2">{icon}</div>
          <div className="text-2xl font-bold mb-1">{value.toLocaleString()}</div>
          <h3 className="font-medium text-sm leading-tight">{title}</h3>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 transition-all hover:shadow-md ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="mr-3">{icon}</div>
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <div className="text-3xl font-bold mb-1">{value.toLocaleString()}</div>
          {subtitle && <p className="text-sm opacity-75">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ✅ Cores para status marítimos
function getStatusColor(status: string): string {
  const colors = {
    'Abertura do Processo': 'bg-yellow-100 text-yellow-800',
    'Pré Embarque': 'bg-orange-100 text-orange-800',
    'Rastreio da Carga': 'bg-blue-100 text-blue-800',
    'Chegada da Carga': 'bg-purple-100 text-purple-800',
    'Entrega': 'bg-green-100 text-green-800',
    'Fechamento': 'bg-green-100 text-green-800',
    'Processos Finalizados': 'bg-gray-100 text-gray-800'
  };
  
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}