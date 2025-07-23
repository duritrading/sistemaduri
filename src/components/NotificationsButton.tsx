// src/components/NotificationsButton.tsx - BOTÃO DE NOTIFICAÇÕES OTIMIZADO COM HOOK
'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, MessageSquare, User, Calendar, X, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationsButtonProps {
  userId?: string;
  enabled?: boolean;
}

export function NotificationsButton({ 
  userId = 'default-user',
  enabled = true 
}: NotificationsButtonProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Usar hook customizado
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAllAsRead,
    refreshNotifications
  } = useNotifications({
    userId,
    enabled
  });

  // ✅ Formatar data para exibição
  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Agora mesmo';
      if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h atrás`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d atrás`;
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // ✅ Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // ✅ Toggle dropdown e marcar como lidas
  const toggleDropdown = async () => {
    if (!isOpen && unreadCount > 0) {
      // Ao abrir, marcar como lidas
      await markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  // ✅ Função para refresh manual
  const handleRefresh = async () => {
    await refreshNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ✅ Botão de Notificações */}
      <button
        onClick={toggleDropdown}
        className="relative flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-[#b51c26] hover:bg-[#b51c26]/10 rounded-lg transition-all duration-200 group"
        title={`${unreadCount} notificações não lidas`}
      >
        {/* Ícone do sino */}
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 group-hover:scale-110 transition-transform text-[#b51c26]" />
        ) : (
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}

        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#b51c26] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Texto (desktop) */}
        <span className="text-xs text-gray-500 hidden lg:block">
          {unreadCount > 0 ? 'Notificações' : 'Sem alertas'}
        </span>
      </button>

      {/* ✅ Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#b51c26]/5 to-transparent">
            <div className="flex items-center space-x-2">
              <BellRing className="w-5 h-5 text-[#b51c26]" />
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              {notifications.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({notifications.length})
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Atualizar notificações"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Bell className="w-8 h-8 animate-pulse text-[#b51c26] mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Buscando notificações...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Bell className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-600 font-medium mb-1">Erro ao carregar</p>
                  <p className="text-gray-500 text-xs mb-3">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-1 bg-[#b51c26] text-white text-xs rounded hover:bg-[#dc2626] transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-1">Nenhuma notificação</p>
                  <p className="text-gray-500 text-sm">
                    Você será notificado quando houver novos comentários
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notification.isNew ? 'bg-[#b51c26]/5 border-l-2 border-l-[#b51c26]' : ''
                    }`}
                  >
                    {/* Header da notificação */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#b51c26] to-[#dc2626] rounded-full flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Novo comentário
                          </p>
                          <p className="text-xs text-gray-500">
                            por {notification.author}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                      </div>
                    </div>

                    {/* Tarefa */}
                    <p className="text-sm text-gray-700 mb-2 font-medium truncate">
                      📋 {notification.taskTitle}
                    </p>

                    {/* Comentário */}
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-2 border-l-2 border-l-[#b51c26]">
                      "{notification.commentText}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                Atualizações automáticas a cada 30 segundos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}