// src/components/OperationsDashboard.tsx - ENHANCED COM ANEXOS + NOTIFICAÇÕES ETA
'use client';

import { useState } from 'react';
import { List, Eye, Paperclip, MessageSquare } from 'lucide-react';
import { CommentsModal } from './CommentsModal';
import { AttachmentsModal } from './AttachmentsModal';

// ✅ INTERFACES (mantidas iguais)
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
  
  // ✅ STATES PARA MODAIS
  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    taskId: string;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: '',
    taskTitle: ''
  });

  const [attachmentsModal, setAttachmentsModal] = useState<{
    isOpen: boolean;
    taskId: string;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: '',
    taskTitle: ''
  });

  // ✅ FUNÇÕES PARA ABRIR MODAIS
  const openCommentsModal = (taskId: string, taskTitle: string) => {
    setCommentsModal({
      isOpen: true,
      taskId,
      taskTitle
    });
  };

  const openAttachmentsModal = (taskId: string, taskTitle: string) => {
    setAttachmentsModal({
      isOpen: true,
      taskId,
      taskTitle
    });
  };

  // ✅ FUNÇÕES PARA FECHAR MODAIS
  const closeCommentsModal = () => {
    setCommentsModal({
      isOpen: false,
      taskId: '',
      taskTitle: ''
    });
  };

  const closeAttachmentsModal = () => {
    setAttachmentsModal({
      isOpen: false,
      taskId: '',
      taskTitle: ''
    });
  };

  // ✅ Função para identificar operações canceladas (mantida)
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

  // ✅ Helper functions (mantidas)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      'Processos Finalizados': 'bg-gray-100 text-gray-800',
      'Fechamento': 'bg-green-100 text-green-800',
      'Entrega': 'bg-green-100 text-green-800',
      'Chegada da Carga': 'bg-purple-100 text-purple-800',
      'Rastreio da Carga': 'bg-blue-100 text-blue-800',
      'Pré Embarque': 'bg-orange-100 text-orange-800',
      'Abertura do Processo': 'bg-yellow-100 text-yellow-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTableRowData = (tracking: Tracking) => {
    const companhia = tracking.transport?.company || 
                     tracking.business?.empresa || 
                     tracking.customFields?.['EMPRESA'] || 
                     tracking.customFields?.['CIA DE TRANSPORTE'] || 
                     '-';

    return {
      ref: tracking.ref || tracking.title.split(' ')[0] || '-',
      empresa: tracking.company || '-',
      exportador: tracking.transport?.exporter || tracking.customFields?.['Exportador'] || tracking.customFields?.['EXPORTADOR'] || '-',
      produto: tracking.transport?.products?.join(', ') || tracking.customFields?.['PRODUTO'] || tracking.customFields?.['Produto'] || '-',
      companhia: companhia,
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
                  {Array.from({ length: 12 }).map((_, i) => (
                    <th key={i} className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 12 }).map((_, j) => (
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
    <>
      <div id="operacoes" className="scroll-mt-24 space-y-8">
        
        {/* ✅ HEADER PREMIUM (mantido) */}
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
                    Lista detalhada com anexos e notificações • <span className="text-[#b51c26] font-semibold">{filteredTrackings.length}</span> operações
                  </p>
                </div>
              </div>

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

        {/* ✅ TABELA ENHANCED COM ANEXOS + COMENTÁRIOS */}
        <div className="relative overflow-hidden bg-white border border-gray-200/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="overflow-x-auto">
            {filteredTrackings.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Empresa</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Exportador</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Produto</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Companhia</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Navio</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Órgãos</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ETD</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ETA</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Responsável</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Follow-up</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Anexos</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredTrackings.map((tracking) => {
                    const rowData = getTableRowData(tracking);
                    const isCancelled = isOperationCancelled(tracking);

                    return (
                      <tr key={tracking.id} className={`hover:bg-gray-50 transition-colors ${isCancelled ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {rowData.ref}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {rowData.empresa}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tracking.maritimeStatus)}`}>
                            {tracking.maritimeStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {rowData.exportador}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {rowData.produto}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {rowData.companhia}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {rowData.navio}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {rowData.orgaosAnuentes}
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {rowData.etd}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                          {rowData.eta}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {rowData.responsavel}
                        </td>

                          {/* ✅ NOVA COLUNA: FOLLOW-UP + NOTIFICAÇÕES */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => openCommentsModal(tracking.id, tracking.title)}
                            className="inline-flex items-center justify-center w-8 h-8 bg-[#b51c26]/10 hover:bg-[#b51c26]/20 text-[#b51c26] hover:text-[#dc2626] rounded-lg transition-all duration-200 hover:scale-105"
                            title="Ver follow-up e notificações"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </td>
                        
                        {/* ✅ NOVA COLUNA: ANEXOS */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => openAttachmentsModal(tracking.id, tracking.title)}
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200 hover:scale-105"
                            title="Ver anexos"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        </td>
                    
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <List className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {hasActiveFilters ? 'Nenhum resultado encontrado' : 'Nenhuma operação disponível'}
                  </h3>
                  <p className="text-gray-500 mb-6">
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

      {/* ✅ MODAL DE COMENTÁRIOS + NOTIFICAÇÕES ETA */}
      <CommentsModal
        isOpen={commentsModal.isOpen}
        onClose={closeCommentsModal}
        taskId={commentsModal.taskId}
        taskTitle={commentsModal.taskTitle}
      />

      {/* ✅ MODAL DE ANEXOS */}
      <AttachmentsModal
        isOpen={attachmentsModal.isOpen}
        onClose={closeAttachmentsModal}
        taskId={attachmentsModal.taskId}
        taskTitle={attachmentsModal.taskTitle}
      />
    </>
  );
}