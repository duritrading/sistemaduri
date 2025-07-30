// src/components/AttachmentsModal.tsx - MODAL PARA VISUALIZAR ANEXOS
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Paperclip, Download, Calendar, Loader2, RefreshCw, AlertCircle, 
  FileText, Image, File, Table, Archive
} from 'lucide-react';

interface AsanaAttachment {
  gid: string;
  name: string;
  download_url: string;
  size: number;
  content_type: string;
  created_at: string;
  parent: {
    gid: string;
    name: string;
  };
  fileExtension: string;
  fileType: string;
  formattedSize: string;
  iconName: string;
}

interface AttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export function AttachmentsModal({ isOpen, onClose, taskId, taskTitle }: AttachmentsModalProps) {
  const [attachments, setAttachments] = useState<AsanaAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ Fetch attachments
  const fetchAttachments = useCallback(async (forceRefresh = false) => {
    if (!taskId) return;

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      const timestamp = Date.now();
      const url = `/api/asana/attachments?taskId=${taskId}&refresh=${timestamp}&t=${timestamp}`;
      
      console.log(`📎 [AttachmentsModal] Buscando anexos: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        signal: abortControllerRef.current.signal
      });

      const result = await response.json();
      
      console.log(`📊 [AttachmentsModal] Resposta da API:`, result);
      
      if (result.success) {
        setAttachments(result.data || []);
        setLastRefresh(new Date().toLocaleTimeString('pt-BR'));
        console.log(`✅ [AttachmentsModal] ${result.data?.length || 0} anexos carregados para task ${taskId}`);
      } else {
        console.error('❌ [AttachmentsModal] Erro na API:', result.error);
        setError(result.error || 'Erro ao buscar anexos');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('ℹ️ [AttachmentsModal] Request abortado');
        return;
      }
      
      console.error('❌ [AttachmentsModal] Erro ao buscar anexos:', err);
      setError(err instanceof Error ? err.message : 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) {
      console.log(`🚀 [AttachmentsModal] Modal aberto para task: ${taskId}`);
      fetchAttachments(true);
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, taskId, fetchAttachments]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleRefresh = () => {
    console.log('🔄 [AttachmentsModal] Refresh manual solicitado');
    fetchAttachments(true);
  };

  const handleDownload = async (attachment: AsanaAttachment) => {
    try {
      const link = document.createElement('a');
      link.href = attachment.download_url;
      link.download = attachment.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    const iconMap = {
      'pdf': FileText,
      'image': Image,
      'document': FileText,
      'spreadsheet': Table,
      'presentation': FileText,
      'archive': Archive,
      'file': File
    };

    const IconComponent = iconMap[fileType as keyof typeof iconMap] || File;
    return <IconComponent className="w-8 h-8" />;
  };

  const getFileTypeColor = (fileType: string): string => {
    const colorMap = {
      'pdf': 'text-red-600 bg-red-100',
      'image': 'text-green-600 bg-green-100',
      'document': 'text-blue-600 bg-blue-100',
      'spreadsheet': 'text-emerald-600 bg-emerald-100',
      'presentation': 'text-orange-600 bg-orange-100',
      'archive': 'text-purple-600 bg-purple-100',
      'file': 'text-gray-600 bg-gray-100'
    };

    return colorMap[fileType as keyof typeof colorMap] || 'text-gray-600 bg-gray-100';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Anexos do Processo
                  </h3>
                  <p className="text-sm text-gray-600 truncate max-w-md">
                    {taskTitle}
                  </p>
                  {lastRefresh && (
                    <p className="text-xs text-gray-500">
                      Atualizado às {lastRefresh}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Atualizar anexos"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                  <span className="text-gray-600">Carregando anexos...</span>
                </div>
                
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
                  <span className="text-red-600">{error}</span>
                </div>
                
              ) : attachments.length === 0 ? (
                <div className="text-center py-12">
                  <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum anexo encontrado</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Arquivos anexados no Asana aparecerão aqui automaticamente
                  </p>
                </div>
                
              ) : (
                <div>
                  {/* Summary */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-blue-900 font-semibold">
                          {attachments.length} arquivo{attachments.length > 1 ? 's' : ''} encontrado{attachments.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-blue-700 text-sm">
                          Total: {attachments.reduce((sum, att) => sum + att.size, 0) > 0 
                            ? `${(attachments.reduce((sum, att) => sum + att.size, 0) / 1024 / 1024).toFixed(1)} MB`
                            : 'Tamanho não disponível'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attachments.map((attachment) => (
                      <div key={attachment.gid} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start space-x-3">
                          
                          {/* File Icon */}
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileTypeColor(attachment.fileType)}`}>
                            {getFileIcon(attachment.fileType)}
                          </div>
                          
                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 truncate pr-2">
                                {attachment.name}
                              </h4>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                              <span>{attachment.formattedSize}</span>
                              <span>•</span>
                              <span>{attachment.fileExtension.toUpperCase()}</span>
                              <span>•</span>
                              <span>{formatDate(attachment.created_at)}</span>
                            </div>
                            
                            {/* Actions - Apenas Download */}
                            <div className="flex items-center">
                              <button
                                onClick={() => handleDownload(attachment)}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar Arquivo
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}