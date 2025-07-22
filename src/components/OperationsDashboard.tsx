// src/components/OperationsDashboard.tsx - PREMIUM REDESIGN ULTRA-SEXY TABLE
'use client';

import { List } from 'lucide-react';

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

interface OperationsDashboardProps {
  filteredTrackings: Tracking[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  loading?: boolean;
}

export function OperationsDashboard({ 
  filteredTrackings, 
  hasActiveFilters, 
  onClearFilters, 
  loading = false 
}: OperationsDashboardProps) {

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

  // ✅ Formatação de datas DD/MM/YYYY
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    
    try {
      // Tenta vários formatos de data
      const patterns = [
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // D/M/YYYY ou DD/M/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      ];

      for (const pattern of patterns) {
        const match = dateString.match(pattern);
        if (match) {
          let day, month, year;
          
          if (pattern === patterns[0]) { // YYYY-MM-DD
            [, year, month, day] = match;
          } else { // DD/MM/YYYY ou DD-MM-YYYY
            [, day, month, year] = match;
          }
          
          // Valida se é uma data válida
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (date.getFullYear() == parseInt(year) && 
              date.getMonth() == parseInt(month) - 1 && 
              date.getDate() == parseInt(day)) {
            
            // Formata para DD/MM/YYYY
            const formattedDay = day.padStart(2, '0');
            const formattedMonth = month.padStart(2, '0');
            return `${formattedDay}/${formattedMonth}/${year}`;
          }
        }
      }
      
      // Se não conseguiu parsear, retorna string original truncada
      return dateString.length > 10 ? dateString.substring(0, 10) : dateString;
    } catch {
      return '-';
    }
  };

  // ✅ Cores para status marítimos (MANTIDAS EXATAS)
  const getStatusColor = (status: string): string => {
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
  };

  // ✅ Extração de dados seguros
  const getTrackingData = (tracking: Tracking) => {
    return {
      referencia: tracking.ref || tracking.title?.substring(0, 20) || 'N/A',
      status: tracking.maritimeStatus || 'N/A',
      exportador: tracking.transport?.exporter || tracking.customFields?.['Exportador'] || tracking.customFields?.['EXPORTADOR'] || '-',
      produto: tracking.transport?.products?.join(', ') || tracking.customFields?.['PRODUTO'] || tracking.customFields?.['Produto'] || '-',
      companhia: tracking.transport?.company || tracking.business?.empresa || tracking.company || '-',
      navio: tracking.transport?.vessel || tracking.customFields?.['NAVIO'] || tracking.customFields?.['Navio'] || '-',
      orgaosAnuentes: tracking.regulatory?.orgaosAnuentes?.join(', ') || tracking.customFields?.['Órgãos Anuentes'] || '-',
      eta: formatDate(tracking.schedule?.eta || tracking.customFields?.['ETA']),
      etd: formatDate(tracking.schedule?.etd || tracking.customFields?.['ETD']),
      responsavel: tracking.schedule?.responsible || tracking.customFields?.['Responsável'] || tracking.customFields?.['RESPONSAVEL'] || '-'
    };
  };

  if (loading) {
    return (
      <div id="operacoes" className="scroll-mt-24 space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-green-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200/50 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <th key={i} className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="operacoes" className="scroll-mt-24 space-y-8">
      
      {/* ✅ HEADER PREMIUM - IGUAL AOS GRÁFICOS OPERACIONAIS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-green-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
        <div className="absolute inset-0 bg-gradient-to-r from-[#b51c26]/5 to-transparent group-hover:from-[#b51c26]/10 transition-all"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <List className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
                  Operações Detalhadas
                </h2>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Lista detalhada de todas as operações de tracking • <span className="text-[#b51c26] font-semibold">{filteredTrackings.length}</span> operações
                </p>
              </div>
            </div>

            {/* ✅ AÇÃO LIMPAR FILTROS (SE ATIVO) */}
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="flex items-center px-4 py-2.5 bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all duration-300"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ✅ TABELA PREMIUM ULTRA-SEXY */}
      <div className="relative overflow-hidden bg-white border border-gray-200/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="overflow-x-auto">
          {filteredTrackings.length > 0 ? (
            <table className="min-w-full">
              {/* ✅ HEADER DA TABELA PREMIUM */}
              <thead className="bg-gradient-to-r from-gray-50 via-white to-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Referência
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Exportador
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Companhia
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Navio
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Órgãos Anuentes
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ETD
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ETA
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Responsável
                  </th>
                </tr>
              </thead>
              
              {/* ✅ BODY DA TABELA PREMIUM */}
              <tbody className="divide-y divide-gray-100">
                {filteredTrackings.map((tracking, index) => {
                  const isCancelled = isOperationCancelled(tracking);
                  const data = getTrackingData(tracking);
                  
                  return (
                    <tr 
                      key={tracking.id} 
                      className={`
                        hover:bg-gradient-to-r hover:from-[#b51c26]/5 hover:to-transparent transition-all duration-300 group
                        ${isCancelled ? 'bg-red-50/50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                      `}
                    >
                      {/* ✅ REFERÊNCIA */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900 group-hover:text-[#b51c26] transition-colors">
                            {data.referencia}
                          </div>
                          {tracking.title && tracking.title !== data.referencia && (
                            <div className="text-xs text-gray-500 truncate max-w-xs mt-1">
                              {tracking.title}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ✅ STATUS */}
                      <td className="px-4 py-4">
                        <span className={`
                          inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-sm
                          ${isCancelled 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : getStatusColor(data.status) + ' border border-opacity-20'
                          }
                        `}>
                          {isCancelled ? 'CANCELADA' : data.status}
                        </span>
                      </td>

                      {/* ✅ EXPORTADOR */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {data.exportador}
                        </div>
                      </td>

                      {/* ✅ PRODUTO */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={data.produto}>
                            {data.produto}
                          </div>
                        </div>
                      </td>

                      {/* ✅ COMPANHIA */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {data.companhia}
                        </div>
                      </td>

                      {/* ✅ NAVIO */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {data.navio}
                        </div>
                      </td>

                      {/* ✅ ÓRGÃOS ANUENTES */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={data.orgaosAnuentes}>
                            {data.orgaosAnuentes}
                          </div>
                        </div>
                      </td>

                      {/* ✅ ETD - DATA FORMATADA */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono text-gray-900">
                          {data.etd}
                        </div>
                      </td>

                      {/* ✅ ETA - DATA FORMATADA */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono text-gray-900">
                          {data.eta}
                        </div>
                      </td>

                      {/* ✅ RESPONSÁVEL */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {data.responsavel}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* ✅ ESTADO VAZIO PREMIUM */
            <div className="relative py-16">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-transparent"></div>
              <div className="relative text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#b51c26] to-[#dc2626] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <List className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma Operação Encontrada</h3>
                <p className="text-gray-600 mb-4">
                  {hasActiveFilters 
                    ? 'Nenhuma operação corresponde aos filtros aplicados.' 
                    : 'Não há operações para exibir no momento.'
                  }
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={onClearFilters}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}