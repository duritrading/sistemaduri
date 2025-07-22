// src/components/KPIDashboard.tsx - COMPONENTE ISOLADO PARA KPIs
'use client';

import { useMemo } from 'react';
import { Package, RotateCcw, CheckCircle, XCircle, FilePlus, Ship, Waves, Building, Truck, FileText, Filter } from 'lucide-react';

// ✅ INTERFACES - Copiadas exatamente do MaritimeDashboard
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

interface FilterState {
  reference: string;
  status: string;
  exporter: string;
  product: string;
  orgaoAnuente: string;
}

// ✅ PROPS DO COMPONENTE KPI
interface KPIDashboardProps {
  trackings: Tracking[];
  filteredTrackings: Tracking[];
  filters: FilterState;
  filterOptions: {
    statuses: string[];
    exporters: string[];
    products: string[];
    orgaosAnuentes: string[];
  };
  showFilters: boolean;
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onRefreshData: () => void;
}

export function KPIDashboard({
  trackings,
  filteredTrackings,
  filters,
  filterOptions,
  showFilters,
  hasActiveFilters,
  onFilterChange,
  onToggleFilters,
  onClearFilters,
  onRefreshData
}: KPIDashboardProps) {

  // ✅ Função para identificar operações canceladas (COPIADA EXATA)
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

  // ✅ KPIs calculados (LÓGICA EXATA do original)
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

  return (
    <div id="resumo" className="scroll-mt-24">
      {/* ✅ HEADER da seção KPIs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resumo Operacional</h2>
          <p className="text-gray-600">
            {trackings.length} operações • {filteredTrackings.length} exibidas
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleFilters}
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
            onClick={onRefreshData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw size={16} className="mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {/* ✅ FILTROS (COPIADO EXATO) */}
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
                onChange={(e) => onFilterChange('reference', e.target.value)}
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
                onChange={(e) => onFilterChange('status', e.target.value)}
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
                onChange={(e) => onFilterChange('exporter', e.target.value)}
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
                onChange={(e) => onFilterChange('product', e.target.value)}
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
                onChange={(e) => onFilterChange('orgaoAnuente', e.target.value)}
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
                onClick={onClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ KPI CARDS Premium - Primeira Linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <PremiumKPICard
          title="Total de Operações"
          value={kpis.total}
          icon={Package}
          variant="info"
          subtitle="Todas as operações"
        />
        <PremiumKPICard
          title="Operações Ativas" 
          value={kpis.ativas}
          icon={RotateCcw}
          variant="warning"
          subtitle="Em andamento"
        />
        <PremiumKPICard
          title="Operações Finalizadas"
          value={kpis.processosFinalizados}
          icon={CheckCircle}
          variant="success"
          subtitle="Completamente concluídas"
        />
        <PremiumKPICard
          title="Operações Canceladas"
          value={kpis.canceladas}
          icon={XCircle}
          variant="danger"
          subtitle="Canceladas ou suspensas"
        />
      </div>

      {/* ✅ KPI CARDS Premium - Segunda Linha (Compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <PremiumKPICard
          title="Abertura do Processo"
          value={kpis.aberturaProcesso}
          icon={FilePlus}
          variant="warning"
          subtitle="Processo iniciado"
          compact={true}
        />
        <PremiumKPICard
          title="Pré Embarque"
          value={kpis.preEmbarque}
          icon={Ship}
          variant="warning"
          subtitle="Preparação"
          compact={true}
        />
        <PremiumKPICard
          title="Rastreio da Carga"
          value={kpis.rasteioCarga}
          icon={Waves}
          variant="info"
          subtitle="Em trânsito"
          compact={true}
        />
        <PremiumKPICard
          title="Chegada da Carga"
          value={kpis.chegadaCarga}
          icon={Building}
          variant="primary"
          subtitle="No destino"
          compact={true}
        />
        <PremiumKPICard
          title="Entrega"
          value={kpis.entrega}
          icon={Truck}
          variant="success"
          subtitle="Entregando"
          compact={true}
        />
        <PremiumKPICard
          title="Fechamento"
          value={kpis.fechamento}
          icon={FileText}
          variant="success"
          subtitle="Finalizando"
          compact={true}
        />
      </div>
    </div>
  );
}

// ✅ PREMIUM KPI CARD (MESMO COMPONENTE do artifact anterior)
interface PremiumKPICardProps {
  title: string;
  value: number;
  icon: any;
  variant: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  subtitle?: string;
  compact?: boolean;
}

function PremiumKPICard({ 
  title, 
  value, 
  icon: Icon, 
  variant, 
  subtitle, 
  compact = false
}: PremiumKPICardProps) {
  
  const variants = {
    primary: {
      gradient: 'from-[#b51c26] to-[#dc2626]',
      glow: 'hover:shadow-[0_0_30px_rgba(181,28,38,0.3)]',
      border: 'border-red-200/30',
      bg: 'bg-gradient-to-br from-red-50/80 to-white/90',
      iconBg: 'bg-red-100'
    },
    success: {
      gradient: 'from-emerald-500 to-green-500',
      glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
      border: 'border-emerald-200/30',
      bg: 'bg-gradient-to-br from-emerald-50/80 to-white/90',
      iconBg: 'bg-emerald-100'
    },
    warning: {
      gradient: 'from-amber-500 to-orange-500',
      glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
      border: 'border-amber-200/30',
      bg: 'bg-gradient-to-br from-amber-50/80 to-white/90',
      iconBg: 'bg-amber-100'
    },
    info: {
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
      border: 'border-blue-200/30',
      bg: 'bg-gradient-to-br from-blue-50/80 to-white/90',
      iconBg: 'bg-blue-100'
    },
    danger: {
      gradient: 'from-red-500 to-rose-500',
      glow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
      border: 'border-red-200/30',
      bg: 'bg-gradient-to-br from-red-50/80 to-white/90',
      iconBg: 'bg-red-100'
    }
  };

  const style = variants[variant];

  if (compact) {
    return (
      <div className={`
        relative overflow-hidden rounded-2xl border ${style.border}
        backdrop-blur-sm ${style.bg} ${style.glow}
        transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer group p-4
        shadow-lg hover:shadow-2xl
      `}>
        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
        
        <div className="relative z-10 text-center">
          <div className={`
            inline-flex items-center justify-center w-10 h-10 rounded-xl 
            ${style.iconBg} backdrop-blur-sm mb-3 group-hover:scale-110 transition-transform
          `}>
            <Icon size={20} className="text-gray-700" />
          </div>
          
          <div className="text-3xl font-bold text-gray-900 mb-1 group-hover:scale-105 transition-transform">
            {value.toLocaleString()}
          </div>
          
          <h3 className="font-medium text-sm text-gray-700 leading-tight mb-1">
            {title}
          </h3>
          
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border ${style.border}
      backdrop-blur-sm ${style.bg} ${style.glow}
      transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer group p-6
      shadow-lg hover:shadow-2xl
    `}>
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`
            inline-flex items-center justify-center w-12 h-12 rounded-xl 
            ${style.iconBg} backdrop-blur-sm group-hover:scale-110 transition-transform
          `}>
            <Icon size={24} className="text-gray-700" />
          </div>
        </div>
        
        <div className="text-4xl font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform">
          {value.toLocaleString()}
        </div>
        
        <h3 className="font-semibold text-lg text-gray-800 mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>
    </div>
  );
}