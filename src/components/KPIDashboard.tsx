// src/components/KPIDashboard.tsx - PREMIUM REDESIGN ULTRA-SEXY
'use client';

import { useMemo } from 'react';
import { Package, RotateCcw, CheckCircle, XCircle, FilePlus, Ship, Waves, Building, Truck, FileText, Filter } from 'lucide-react';

// ✅ INTERFACES - Mantidas exatamente iguais
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

  // ✅ KPIs calculados (LÓGICA MANTIDA EXATA)
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
    <div id="resumo" className="scroll-mt-24 space-y-8">
      
      {/* ✅ HEADER PREMIUM - IGUAL AOS GRÁFICOS OPERACIONAIS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#b51c26]/5 to-transparent group-hover:from-[#b51c26]/10 transition-all"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
                  Resumo Operacional
                </h2>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Visualização dos dados de tracking marítimo • <span className="text-[#b51c26] font-semibold">{filteredTrackings.length}</span> operações
                </p>
              </div>
            </div>

            {/* ✅ CONTROLES PREMIUM */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onToggleFilters}
                className={`
                  flex items-center px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shadow-lg hover:shadow-xl
                  ${hasActiveFilters 
                    ? 'bg-gradient-to-r from-[#b51c26] via-[#dc2626] to-[#ef4444] text-white' 
                    : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <Filter size={16} className="mr-2" />
                Filtros
                {hasActiveFilters && (
                  <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </button>

              <button
                onClick={onRefreshData}
                className="flex items-center px-4 py-2.5 bg-white/80 text-gray-700 border border-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <RotateCcw size={16} className="mr-2" />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FILTROS PREMIUM (SE ATIVO) */}
      {showFilters && (
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50/20 border border-gray-200/50 rounded-2xl p-6 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent"></div>
          
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Filter size={20} className="mr-2 text-[#b51c26]" />
              Filtros Avançados
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Referência</label>
                <input
                  type="text"
                  value={filters.reference}
                  onChange={(e) => onFilterChange('reference', e.target.value)}
                  placeholder="Buscar por referência..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b51c26] focus:border-transparent transition-all bg-white/80"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => onFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b51c26] focus:border-transparent transition-all bg-white/80"
                >
                  <option value="">Todos os status</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exportador</label>
                <select
                  value={filters.exporter}
                  onChange={(e) => onFilterChange('exporter', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b51c26] focus:border-transparent transition-all bg-white/80"
                >
                  <option value="">Todos os exportadores</option>
                  {filterOptions.exporters.map(exporter => (
                    <option key={exporter} value={exporter}>{exporter}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Produto</label>
                <select
                  value={filters.product}
                  onChange={(e) => onFilterChange('product', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b51c26] focus:border-transparent transition-all bg-white/80"
                >
                  <option value="">Todos os produtos</option>
                  {filterOptions.products.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Órgão Anuente</label>
                <select
                  value={filters.orgaoAnuente}
                  onChange={(e) => onFilterChange('orgaoAnuente', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b51c26] focus:border-transparent transition-all bg-white/80"
                >
                  <option value="">Todos os órgãos</option>
                  {filterOptions.orgaosAnuentes.map(orgao => (
                    <option key={orgao} value={orgao}>{orgao}</option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-6 pt-4 border-t border-gray-200/50">
                <button
                  onClick={onClearFilters}
                  className="text-sm text-[#b51c26] hover:text-[#8b1119] font-semibold transition-colors flex items-center"
                >
                  <XCircle size={16} className="mr-1" />
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ KPI CARDS ULTRA-SEXY - PRIMEIRA LINHA (PRINCIPAIS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UltraSexyKPICard
          title="Total de Operações"
          value={kpis.total}
          icon={Package}
          gradient="from-blue-500 via-blue-600 to-blue-700"
          accentColor="blue"
          subtitle="Todas as operações"
          iconBg="bg-blue-500"
        />
        <UltraSexyKPICard
          title="Operações Ativas" 
          value={kpis.ativas}
          icon={RotateCcw}
          gradient="from-amber-500 via-orange-600 to-red-500"
          accentColor="amber"
          subtitle="Em andamento"
          iconBg="bg-amber-500"
        />
        <UltraSexyKPICard
          title="Operações Finalizadas"
          value={kpis.processosFinalizados}
          icon={CheckCircle}
          gradient="from-emerald-500 via-green-600 to-teal-500"
          accentColor="emerald"
          subtitle="Completamente concluídas"
          iconBg="bg-emerald-500"
        />
        <UltraSexyKPICard
          title="Operações Canceladas"
          value={kpis.canceladas}
          icon={XCircle}
          gradient="from-red-500 via-pink-600 to-rose-500"
          accentColor="red"
          subtitle="Canceladas ou suspensas"
          iconBg="bg-red-500"
        />
      </div>

      {/* ✅ KPI CARDS ULTRA-SEXY - SEGUNDA LINHA (ESTÁGIOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <CompactSexyKPICard
          title="Abertura do Processo"
          value={kpis.aberturaProcesso}
          icon={FilePlus}
          gradient="from-yellow-400 to-orange-500"
          subtitle="Processo iniciado"
        />
        <CompactSexyKPICard
          title="Pré Embarque"
          value={kpis.preEmbarque}
          icon={Ship}
          gradient="from-orange-400 to-red-500"
          subtitle="Preparação"
        />
        <CompactSexyKPICard
          title="Rastreio da Carga"
          value={kpis.rasteioCarga}
          icon={Waves}
          gradient="from-blue-400 to-indigo-600"
          subtitle="Em trânsito"
        />
        <CompactSexyKPICard
          title="Chegada da Carga"
          value={kpis.chegadaCarga}
          icon={Building}
          gradient="from-purple-500 to-pink-600"
          subtitle="No destino"
        />
        <CompactSexyKPICard
          title="Entrega"
          value={kpis.entrega}
          icon={Truck}
          gradient="from-green-400 to-emerald-600"
          subtitle="Entregando"
        />
        <CompactSexyKPICard
          title="Fechamento"
          value={kpis.fechamento}
          icon={FileText}
          gradient="from-emerald-500 to-teal-600"
          subtitle="Finalizando"
        />
      </div>
    </div>
  );
}

// ✅ ULTRA SEXY KPI CARD - PRINCIPAIS
interface UltraSexyKPICardProps {
  title: string;
  value: number;
  icon: any;
  gradient: string;
  accentColor: string;
  subtitle?: string;
  iconBg: string;
}

function UltraSexyKPICard({ title, value, icon: Icon, gradient, accentColor, subtitle, iconBg }: UltraSexyKPICardProps) {
  return (
    <div className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
      {/* ✅ BACKGROUND GRADIENT EFFECT */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
      
      {/* ✅ SHINE EFFECT */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      
      <div className="relative z-10">
        {/* ✅ HEADER COM ÍCONE */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{subtitle}</div>
          </div>
        </div>

        {/* ✅ VALOR PRINCIPAL */}
        <div className="mb-2">
          <div className={`text-4xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 inline-block`}>
            {value}
          </div>
        </div>

        {/* ✅ TÍTULO */}
        <div className="text-base font-bold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2">
          {title}
        </div>

        {/* ✅ PROGRESS BAR DECORATIVO */}
        <div className="mt-4 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${gradient} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left`}
          ></div>
        </div>
      </div>
    </div>
  );
}

// ✅ COMPACT SEXY KPI CARD - ESTÁGIOS
interface CompactSexyKPICardProps {
  title: string;
  value: number;
  icon: any;
  gradient: string;
  subtitle?: string;
}

function CompactSexyKPICard({ title, value, icon: Icon, gradient, subtitle }: CompactSexyKPICardProps) {
  return (
    <div className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200/50 rounded-xl p-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* ✅ BACKGROUND GRADIENT EFFECT */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      
      <div className="relative z-10">
        {/* ✅ HEADER COMPACTO */}
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value}
          </div>
        </div>

        {/* ✅ TÍTULO COMPACTO */}
        <div className="text-sm font-bold text-gray-900 group-hover:text-gray-700 transition-colors mb-1 line-clamp-2">
          {title}
        </div>
        
        {/* ✅ SUBTITLE */}
        <div className="text-xs text-gray-500 font-medium">
          {subtitle}
        </div>
      </div>
    </div>
  );
}