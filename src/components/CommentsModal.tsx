// src/components/CommentsModal.tsx - MODAL PARA EXIBIR COMENTÁRIOS DO ASANA
'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, User, Calendar, Loader2 } from 'lucide-react';

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

  // ✅ Buscar comentários quando modal abrir
  useEffect(() => {
    if (isOpen && taskId) {
      fetchComments();
    }
  }, [isOpen, taskId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/asana/comments?taskId=${taskId}`);
      const result = await response.json();

      if (result.success) {
        setComments(result.data || []);
      } else {
        setError(result.error || 'Erro ao buscar comentários');
      }
    } catch (err) {
      setError('Erro de conexão ao buscar comentários');
      console.error('Erro ao buscar comentários:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // ✅ Não renderizar se não estiver aberto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* ✅ Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* ✅ Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          
          {/* ✅ Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#b51c26]/5 to-transparent">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Comentários da Operação
                </h3>
                <p className="text-sm text-gray-600 truncate max-w-md">
                  {taskTitle}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* ✅ Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#b51c26] mx-auto mb-4" />
                  <p className="text-gray-600">Buscando comentários...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 font-medium mb-2">Erro ao carregar comentários</p>
                  <p className="text-gray-500 text-sm">{error}</p>
                  <button
                    onClick={fetchComments}
                    className="mt-4 px-4 py-2 bg-[#b51c26] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Nenhum comentário encontrado</p>
                  <p className="text-gray-500 text-sm">
                    Ainda não há Follow-up dos nossos analistas nesta operação.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div 
                    key={comment.gid} 
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    {/* ✅ Comment Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {comment.created_by.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-500 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* ✅ Comment Text */}
                    <div className="ml-10">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {comment.text.startsWith('&') ? comment.text.slice(1).trim() : comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✅ Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Exibindo todos os Follow-ups dos nossos analistas
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}