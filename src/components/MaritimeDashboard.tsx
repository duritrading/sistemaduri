// src/components/MaritimeDashboard.tsx - Dashboard com Filtros + KPI Cards
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, X, ChevronDown, Package, RotateCcw, CheckCircle, XCircle, FileText, Ship, Waves, Building, Truck, FilePlus } from 'lucide-react';

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
  transport: {
    exporter: string;
    products: string[];
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

// ✅ Status exatos do Asana conforme processo marítimo real
const ASANA_MARITIME_STAGES = [
  'Abertura do Processo',
  'Pré Embarque', 
  'Rastreio da Carga',
  'Chegada da Carga',
  'Entrega',
  'Fechamento',
  'Processos Finalizados'
];

// ✅ Mapeamento de status genéricos do Asana para stages específicos
const STATUS_MAPPING: Record<string, string> = {
  'Concluído': 'Processos Finalizados',
  'Em Progresso': 'Rastreio da Carga', 
  'A Embarcar': 'Pré Embarque',
  'Completed': 'Processos Finalizados',
  'In Progress': 'Rastreio da Carga',
  'To Ship': 'Pré Embarque',
  // Mapeamentos diretos para stages do Asana
  'Abertura do Processo': 'Abertura do Processo',
  'Pré Embarque': 'Pré Embarque',
  'Rastreio da Carga': 'Rastreio da Carga',
  'Chegada da Carga': 'Chegada da Carga',
  'Entrega': 'Entrega',
  'Fechamento': 'Fechamento',
  'Processos Finalizados': 'Processos Finalizados'
};

const MARITIME_STATUS_OPTIONS = ASANA_MARITIME_STAGES;

export function MaritimeDashboard({ companyFilter }: MaritimeDashboardProps) {
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

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

      // ✅ Mapear status do Asana para status marítimos com debug detalhado
      const mappedTrackings = (result.data || []).map((tracking: any, index: number) => {
        const maritimeStatus = mapToMaritimeStatus(
          tracking.status, 
          tracking.customFields || {}, 
          tracking.title || tracking.name || ''
        );
        
        // Debug detalhado para TODAS as operações se debugMode ativo
        console.log(`🔍 [${index + 1}/${result.data.length}] Processing: ${tracking.title || 'Sem título'}`);
        console.log(`   Status Asana: "${tracking.status}"`);
        console.log(`   Custom Fields:`, tracking.customFields || {});
        console.log(`   Status Final: "${maritimeStatus}"`);
        console.log('   ═══════════════════════════════════════');
        
        return {
          ...tracking,
          maritimeStatus
        };
      });

      // Analisar distribuição final dos status para debug
      const statusDistribution = mappedTrackings.reduce((acc, tracking) => {
        acc[tracking.maritimeStatus] = (acc[tracking.maritimeStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 DISTRIBUIÇÃO FINAL DOS STATUS:');
      Object.entries(statusDistribution).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} operações`);
      });

      setTrackings(mappedTrackings);

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

  // ✅ Mapear status do Asana para stages marítimos reais - VERSÃO MELHORADA
  const mapToMaritimeStatus = (asanaStatus: string, customFields: Record<string, any>, taskTitle: string = ''): string => {
    console.log(`🔍 Analisando task: ${taskTitle}`);
    console.log(`   Status Asana original: ${asanaStatus}`);
    console.log(`   Custom fields disponíveis:`, Object.keys(customFields));
    
    // STEP 1: Verificar custom fields específicos do Asana (busca EXATA)
    const exactStageFields = [
      'Stage',
      'Status_Maritimo', 
      'Status_Operacional',
      'Etapa',
      'Fase',
      'Estado',
      'Status',
      'Situacao',
      'Current_Stage',
      'Flow',
      'Workflow_Stage'
    ];
    
    // Verificar campos exatos
    for (const fieldName of exactStageFields) {
      const fieldValue = customFields[fieldName];
      if (fieldValue && typeof fieldValue === 'string') {
        // Verificar se o valor corresponde exatamente a um dos stages do Asana
        if (ASANA_MARITIME_STAGES.includes(fieldValue)) {
          console.log(`✅ EXACT MATCH no campo ${fieldName}: ${fieldValue}`);
          return fieldValue;
        }
      }
    }

    // STEP 2: Busca CASE INSENSITIVE e variações
    for (const fieldName of exactStageFields) {
      // Tentar também versões em lowercase
      const fieldValue = customFields[fieldName] || customFields[fieldName.toLowerCase()];
      if (fieldValue && typeof fieldValue === 'string') {
        // Match case insensitive
        const matchedStage = ASANA_MARITIME_STAGES.find(stage => 
          stage.toLowerCase() === fieldValue.toLowerCase()
        );
        if (matchedStage) {
          console.log(`✅ CASE INSENSITIVE MATCH no campo ${fieldName}: ${fieldValue} → ${matchedStage}`);
          return matchedStage;
        }
      }
    }

    // STEP 3: Busca PARCIAL - procurar palavras-chave nos valores
    for (const [fieldName, fieldValue] of Object.entries(customFields)) {
      if (fieldValue && typeof fieldValue === 'string') {
        // Buscar por palavras-chave dos stages
        const stageKeywords = {
          'Abertura do Processo': ['abertura', 'inicio', 'criacao', 'abertura do processo'],
          'Pré Embarque': ['pre embarque', 'pré embarque', 'preparacao', 'pre-embarque'],
          'Rastreio da Carga': ['rastreio', 'tracking', 'transit', 'navegando', 'rastreio da carga'],
          'Chegada da Carga': ['chegada', 'arrived', 'porto', 'chegada da carga'],
          'Entrega': ['entrega', 'delivery', 'entregar'],
          'Fechamento': ['fechamento', 'closing', 'finalizando'],
          'Processos Finalizados': ['finalizado', 'concluido', 'finished', 'completed', 'processos finalizados']
        };

        for (const [stage, keywords] of Object.entries(stageKeywords)) {
          if (keywords.some(keyword => 
            fieldValue.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(fieldValue.toLowerCase())
          )) {
            console.log(`✅ KEYWORD MATCH no campo ${fieldName}: ${fieldValue} → ${stage}`);
            return stage;
          }
        }
      }
    }

    // STEP 4: Verificar se o próprio status do Asana corresponde (busca direta)
    if (ASANA_MARITIME_STAGES.includes(asanaStatus)) {
      console.log(`✅ STATUS DIRETO do Asana: ${asanaStatus}`);
      return asanaStatus;
    }

    // STEP 5: Busca parcial no status do Asana
    const statusKeywords = {
      'Processos Finalizados': ['concluido', 'finalizado', 'completed', 'finished'],
      'Rastreio da Carga': ['progresso', 'progress', 'em andamento', 'rastreio'],
      'Pré Embarque': ['embarcar', 'shipping', 'pre'],
      'Fechamento': ['fechamento', 'closing']
    };

    for (const [stage, keywords] of Object.entries(statusKeywords)) {
      if (keywords.some(keyword => 
        asanaStatus.toLowerCase().includes(keyword.toLowerCase())
      )) {
        console.log(`✅ STATUS KEYWORD MATCH: ${asanaStatus} → ${stage}`);
        return stage;
      }
    }

    // STEP 6: Mapeamento de status genéricos (fallback inteligente)
    const mappedStatus = STATUS_MAPPING[asanaStatus];
    if (mappedStatus) {
      console.log(`✅ STATUS MAPPING: ${asanaStatus} → ${mappedStatus}`);
      return mappedStatus;
    }

    // STEP 7: Fallback baseado no título da task (último recurso)
    if (taskTitle) {
      const titleKeywords = {
        'Processos Finalizados': ['finalizado', 'concluido', 'entregue'],
        'Fechamento': ['fechamento', 'closing'],
        'Entrega': ['entrega', 'delivery'],
        'Chegada da Carga': ['chegada', 'arrived'],
        'Rastreio da Carga': ['rastreio', 'tracking', 'transit'],
        'Pré Embarque': ['embarque', 'shipping'],
        'Abertura do Processo': ['abertura', 'inicio', 'novo']
      };

      for (const [stage, keywords] of Object.entries(titleKeywords)) {
        if (keywords.some(keyword => 
          taskTitle.toLowerCase().includes(keyword.toLowerCase())
        )) {
          console.log(`✅ TITLE KEYWORD MATCH: ${taskTitle} → ${stage}`);
          return stage;
        }
      }
    }

    // STEP 8: Fallback padrão com log detalhado para debug
    console.log(`⚠️ FALLBACK USADO para task: ${taskTitle}`);
    console.log(`   Status original: ${asanaStatus}`);
    console.log(`   Custom fields checados:`, Object.keys(customFields));
    console.log(`   Valores dos custom fields:`, Object.values(customFields));
    console.log(`   Usando fallback: Abertura do Processo`);
    
    return 'Abertura do Processo';
  };

  // ✅ Dados filtrados baseados nos filtros aplicados
  const filteredTrackings = useMemo(() => {
    return trackings.filter(tracking => {
      // Filtro por referência
      if (filters.reference && !tracking.ref.toLowerCase().includes(filters.reference.toLowerCase()) 
          && !tracking.title.toLowerCase().includes(filters.reference.toLowerCase())) {
        return false;
      }

      // Filtro por status marítimo
      if (filters.status && tracking.maritimeStatus !== filters.status) {
        return false;
      }

      // Filtro por exportador
      if (filters.exporter && tracking.company !== filters.exporter) {
        return false;
      }

      // Filtro por produto
      if (filters.product) {
        const hasProduct = tracking.transport?.products?.some(p => 
          p.toLowerCase().includes(filters.product.toLowerCase())
        );
        if (!hasProduct) return false;
      }

      // Filtro por órgão anuente
      if (filters.orgaoAnuente) {
        const hasOrgao = tracking.regulatory?.orgaosAnuentes?.some(o => 
          o.toLowerCase().includes(filters.orgaoAnuente.toLowerCase())
        );
        if (!hasOrgao) return false;
      }

      return true;
    });
  }, [trackings, filters]);

  // ✅ Calcular KPIs baseados nos dados filtrados com status reais do Asana
  const kpis = useMemo(() => {
    const total = filteredTrackings.length;
    
    // Contar por stage do Asana
    const byStage = filteredTrackings.reduce((acc, tracking) => {
      const stage = tracking.maritimeStatus;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcular agrupamentos baseados nos stages reais
    const processosFinalizados = byStage['Processos Finalizados'] || 0;
    const ativas = total - processosFinalizados; // Todas exceto finalizadas
    const fechamento = byStage['Fechamento'] || 0;
    
    // Canceladas (se existir no Asana)
    const canceladas = byStage['Cancelado'] || 0;

    return {
      total,
      ativas,
      processosFinalizados,
      fechamento,
      aberturaProcesso: byStage['Abertura do Processo'] || 0,
      preEmbarque: byStage['Pré Embarque'] || 0,
      rasteioCarga: byStage['Rastreio da Carga'] || 0,
      chegadaCarga: byStage['Chegada da Carga'] || 0,
      entrega: byStage['Entrega'] || 0,
      canceladas // Para manter compatibilidade se houver
    };
  }, [filteredTrackings]);

  // ✅ Extrair opções únicas para os filtros
  const filterOptions = useMemo(() => {
    const exporters = [...new Set(trackings.map(t => t.company))].filter(Boolean).sort();
    
    const products = [...new Set(
      trackings.flatMap(t => t.transport?.products || [])
    )].filter(Boolean).sort();

    const orgaos = [...new Set(
      trackings.flatMap(t => t.regulatory?.orgaosAnuentes || [])
    )].filter(Boolean).sort();

    return { exporters, products, orgaos };
  }, [trackings]);

  // ✅ Limpar filtros
  const clearFilters = () => {
    setFilters(initialFilters);
  };

  // ✅ Verificar se há filtros ativos
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // ✅ Função para formatar datas
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Se não for uma data válida, retorna o string original
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // ✅ Função para cores de status baseada nos stages reais do Asana
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'Abertura do Processo':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pré Embarque':
        return 'bg-orange-100 text-orange-800';
      case 'Rastreio da Carga':
        return 'bg-blue-100 text-blue-800';
      case 'Chegada da Carga':
        return 'bg-purple-100 text-purple-800';
      case 'Entrega':
        return 'bg-green-100 text-green-800';
      case 'Fechamento':
        return 'bg-green-200 text-green-900';
      case 'Processos Finalizados':
        return 'bg-green-300 text-green-900';
      // Fallbacks para status genéricos antigos
      case 'Concluído':
      case 'Em Fechamento':
        return 'bg-green-100 text-green-800';
      case 'Em Progresso':
      case 'Em Trânsito':
        return 'bg-blue-100 text-blue-800';
      case 'A Embarcar':
        return 'bg-orange-100 text-orange-800';
      case 'No Porto':
        return 'bg-purple-100 text-purple-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando operações marítimas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Erro ao carregar dados</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchData(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Header com informações e toggle de filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Marítimo</h2>
          <p className="text-gray-600">
            {trackings.length} operações carregadas 
            {filteredTrackings.length !== trackings.length && 
              ` • ${filteredTrackings.length} filtradas`
            }
            {companyFilter && ` • Empresa: ${companyFilter}`}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter size={16} />
            <span>Filtros</span>
            <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
            >
              <X size={16} />
              <span>Limpar</span>
            </button>
          )}

          <button
            onClick={() => fetchData(true)}
            className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* ✅ Painel de Filtros */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Filtro por Referência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referência da Tarefa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={filters.reference}
                  onChange={(e) => setFilters(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Buscar por ref..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                {MARITIME_STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Exportador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exportador
              </label>
              <select
                value={filters.exporter}
                onChange={(e) => setFilters(prev => ({ ...prev, exporter: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos exportadores</option>
                {filterOptions.exporters.map(exporter => (
                  <option key={exporter} value={exporter}>{exporter}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Produto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produto
              </label>
              <select
                value={filters.product}
                onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos produtos</option>
                {filterOptions.products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Órgão Anuente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Órgão Anuente
              </label>
              <select
                value={filters.orgaoAnuente}
                onChange={(e) => setFilters(prev => ({ ...prev, orgaoAnuente: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos órgãos</option>
                {filterOptions.orgaos.map(orgao => (
                  <option key={orgao} value={orgao}>{orgao}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Indicador de filtros ativos */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Filtros ativos:</span>
              {filters.reference && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Ref: {filters.reference}
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, reference: '' }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Status: {filters.status}
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.exporter && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Exportador: {filters.exporter}
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, exporter: '' }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.product && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Produto: {filters.product}
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, product: '' }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.orgaoAnuente && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Órgão: {filters.orgaoAnuente}
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, orgaoAnuente: '' }))}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ✅ NOVO: Resumo de Operações da Empresa */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Operações da Empresa
                {companyFilter && (
                  <span className="ml-2 text-blue-600">• {companyFilter}</span>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                {filteredTrackings.length} operações
                {hasActiveFilters && ' (filtradas)'}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>📋 Resumo Executivo</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {filteredTrackings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operação
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Armador
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETD
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETA
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Terminal
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrackings.map((tracking, index) => (
                    <tr key={tracking.id || index} className="hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {tracking.title || tracking.name}
                          </div>
                          {tracking.ref && (
                            <div className="text-xs text-gray-500">
                              Ref: {tracking.ref}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(tracking.maritimeStatus || tracking.status)}`}>
                          {tracking.maritimeStatus || tracking.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {tracking.transport?.vessel || '-'}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {tracking.schedule?.etd ? formatDate(tracking.schedule.etd) : '-'}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {tracking.schedule?.eta ? formatDate(tracking.schedule.eta) : '-'}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {tracking.transport?.terminal || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-sm text-gray-900">
                          {tracking.transport?.products?.length > 0 ? (
                            <div className="truncate max-w-xs" title={tracking.transport.products.join(', ')}>
                              {tracking.transport.products[0]}
                              {tracking.transport.products.length > 1 && (
                                <span className="text-gray-500"> +{tracking.transport.products.length - 1}</span>
                              )}
                            </div>
                          ) : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900">
                        {tracking.schedule?.responsible || tracking.metadata?.assignee?.name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📋</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma operação encontrada</h4>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Nenhuma operação corresponde aos filtros aplicados. Tente ajustar os filtros.'
                  : 'Não há operações carregadas para esta empresa.'}
              </p>
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

      {/* ✅ KPI Cards - Primeira Linha (4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          subtitle="Canceladas"
        />
      </div>

      {/* ✅ KPI Cards - Segunda Linha (6 cards) */}
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

      {/* ✅ Resumo dos filtros aplicados (se houver) */}
      {hasActiveFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Resultado da Filtragem</h4>
              <p className="text-sm text-gray-600">
                {filteredTrackings.length} de {trackings.length} operações correspondem aos filtros aplicados
              </p>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas as operações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
          <div className="flex justify-center mb-2">
            {icon}
          </div>
          <div className="text-2xl font-bold mb-1">{value.toLocaleString()}</div>
          <h3 className="font-medium text-sm leading-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs opacity-75 mt-1">{subtitle}</p>
          )}
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
          {subtitle && (
            <p className="text-sm opacity-75">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}