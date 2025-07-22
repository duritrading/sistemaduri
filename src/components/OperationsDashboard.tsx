// src/components/OperationsDashboard.tsx - COMPONENTE ISOLADO PARA OPERAÇÕES
'use client';

// ✅ INTERFACES - Mesmas dos outros componentes
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

// ✅ PROPS DO COMPONENTE OPERATIONS
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

  // ✅ Cores para status marítimos (COPIADA EXATA)
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

  if (loading) {
    return (
      <div id="operacoes" className="scroll-mt-24">
        <div className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
          </div>
          
          <div className="p-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex space-x-4 py-4 border-b border-gray-100 last:border-0">
                <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="operacoes" className="scroll-mt-24">
      <div className="bg-white border rounded-lg shadow-sm">
        {/* ✅ HEADER da seção Operações */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Operações Detalhadas</h2>
          <p className="text-gray-600">
            Lista detalhada de todas as operações de tracking • {filteredTrackings.length} operações
          </p>
        </div>
        
        {/* ✅ TABELA DE OPERAÇÕES */}
        <div className="overflow-x-auto">
          {filteredTrackings.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
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
                    <tr 
                      key={tracking.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        isCancelled ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {tracking.ref}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {tracking.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tracking.transport.company || tracking.business.empresa || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          inline-flex px-2 py-1 text-xs font-semibold rounded-full
                          ${isCancelled 
                            ? 'bg-red-100 text-red-800' 
                            : getStatusColor(tracking.maritimeStatus)
                          }
                        `}>
                          {isCancelled ? 'Cancelada' : tracking.maritimeStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tracking.schedule.etd || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tracking.transport.products.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tracking.transport.products.slice(0, 2).map((product, index) => (
                              <span 
                                key={index}
                                className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {product}
                              </span>
                            ))}
                            {tracking.transport.products.length > 2 && (
                              <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                                +{tracking.transport.products.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* ✅ ESTADO VAZIO */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma operação encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Não há operações que atendam aos filtros aplicados.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={onClearFilters}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}