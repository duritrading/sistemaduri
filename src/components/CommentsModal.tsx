// src/components/CommentsModal.tsx - MODAL CORRIGIDO COM FORCE REFRESH
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, MessageSquare, User, Calendar, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface AsanaComment {
  gid: string;
  text: string;
  created_at: string;
  created_by: {
    name: string;
    gid: string;
  };
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export function CommentsModal({ isOpen, onClose, taskId, taskTitle }: CommentsModalProps) {
  const [comments, setComments] = useState<AsanaComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ Função para buscar comentários com force refresh
  const fetchComments = useCallback(async (forceRefresh = false) => {
    if (!taskId) return;

    try {
      // Cancelar request anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      const timestamp = Date.now();
      const url = `/api/asana/comments?taskId=${taskId}&refresh=${timestamp}&t=${timestamp}`;
      
      console.log(`🔄 [CommentsModal] Buscando comentários: ${url}`);

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
      
      console.log(`📊 [CommentsModal] Resposta da API:`, result);
      
      if (result.success) {
        setComments(result.data || []);
        setLastRefresh(new Date().toLocaleTimeString('pt-BR'));
        
        
        console.log(`✅ [CommentsModal] ${result.data?.length || 0} comentários carregados para task ${taskId}`);
        
        // Log detalhado se não encontrou comentários
        if (!result.data || result.data.length === 0) {
          console.log('⚠️ [CommentsModal] NENHUM COMENTÁRIO ENCONTRADO!');
          console.log('🔍 Possíveis causas:');
          console.log('   1. Comentário não começa com "&"');
          console.log('   2. Comentário ainda não foi salvo no Asana');
          console.log('   3. Task ID incorreto');
          console.log('   4. Problemas de permissão no Asana');
          
        }
      } else {
        console.error('❌ [CommentsModal] Erro na API:', result.error);
        setError(result.error || 'Erro ao buscar comentários');
      }
    } catch (err) {
      // Ignorar erros de abort
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('ℹ️ [CommentsModal] Request abortado');
        return;
      }
      
      console.error('❌ [CommentsModal] Erro ao buscar comentários:', err);
      setError(err instanceof Error ? err.message : 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // ✅ Buscar comentários quando modal abrir ou taskId mudar
  useEffect(() => {
    if (isOpen && taskId) {
      console.log(`🚀 [CommentsModal] Modal aberto para task: ${taskId}`);
      fetchComments(true); // SEMPRE force refresh quando abrir
    }
    
    // Cleanup quando fechar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, taskId, fetchComments]);

  // ✅ Formatar data para exibição
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

  // ✅ Handle refresh manual
  const handleRefresh = () => {
    console.log('🔄 [CommentsModal] Refresh manual solicitado');
    fetchComments(true);
  };

  // ✅ Não renderizar se não estiver aberto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#b51c26]/5 to-transparent">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Follow-up dos Analistas
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
                title="Atualizar comentários"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#b51c26] mx-auto mb-4" />
                  <p className="text-gray-600">Buscando comentários mais recentes...</p>
                  <p className="text-xs text-gray-400 mt-2">
                    
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 font-medium mb-2">Erro ao carregar comentários</p>
                  <p className="text-gray-500 text-sm mb-4">{error}</p>                  
                  
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-[#b51c26] text-white rounded-lg hover:bg-[#dc2626] transition-colors mr-3"
                  >
                    Tentar Novamente
                  </button>
                  
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Nenhum Follow-up encontrado</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Ainda não há Follow-up dos analistas nesta operação.
                  </p>
                  
                  <div className="mt-4">
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.gid}
                    className="p-4 bg-gray-50 rounded-lg border-l-4 border-l-[#b51c26]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {comment.created_by.name}
                          </p>
                          <p className="text-xs text-gray-500">Analista</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded-lg p-3 border">
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer com info de sync */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                 {comments.length} comentário(s)
              </span>
              {lastRefresh && (
                <span>Última atualização: {lastRefresh}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}