// src/components/NotificationsButton.tsx - COM FILTRO POR EMPRESA
'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, MessageSquare, User, Calendar, X, RefreshCw, Building2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

interface NotificationsButtonProps {
  enabled?: boolean;
}

export function NotificationsButton({ 
  enabled = true 
}: NotificationsButtonProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ OBTER DADOS DO USUÁRIO E EMPRESA
  const { user, profile, company } = useAuth();

  // ✅ OBTER EMPRESA EFETIVA (CONSIDERA SELEÇÃO DO ADMIN)
  const getEffectiveCompany = () => {
    if (profile?.role === 'admin') {
      try {
        const adminSelected = localStorage.getItem('admin_selected_company');
        if (adminSelected) {
          const selectedCompany = JSON.parse(adminSelected);
          return selectedCompany;
        }
      } catch (e) {
        console.warn('Erro ao ler empresa selecionada pelo admin:', e);
      }
    }
    return company; // Retorna empresa padrão do usuário
  };

  const effectiveCompany = getEffectiveCompany();
  const userId = user?.id || 'anonymous';
  const companyName = effectiveCompany?.name; // ✅ Nome da empresa para filtro

  // ✅ Usar hook customizado COM FILTRO DE EMPRESA
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAllAsRead,
    refreshNotifications,
    companyName: hookCompanyName
  } = useNotifications({
    userId,
    companyName, // ✅ PASSAR EMPRESA PARA FILTRO
    enabled: enabled && !!user // Só habilitar se usuário logado
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

  // ✅ NÃO RENDERIZAR SE USUÁRIO NÃO LOGADO
  if (!user || !effectiveCompany) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ✅ Botão de Notificações */}
      <button
        onClick={toggleDropdown}
        className="relative flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-[#b51c26] hover:bg-[#b51c26]/10 rounded-lg transition-all duration-200 group"
        title={`${unreadCount} notificações de ${effectiveCompany.display_name || effectiveCompany.name}`}
      >
        {/* Ícone do sino */}
        {unreadCount > 0 ? (
          <BellRing size={20} className="text-[#b51c26] animate-pulse" />
        ) : (
          <Bell size={20} className="group-hover:text-[#b51c26]" />
        )}

        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#b51c26] text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 border border-[#b51c26] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </button>

      {/* ✅ Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-hidden">
          
          {/* Header do dropdown */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
            <div className="flex items-center space-x-2">
              <BellRing size={18} className="text-[#b51c26]" />
              <h3 className="font-semibold text-gray-900">
                Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="bg-[#b51c26] text-white text-xs px-2 py-1 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* ✅ INDICADOR DA EMPRESA FILTRADA */}
              <div className="flex items-center space-x-1 bg-[#b51c26]/10 px-2 py-1 rounded-lg">
                <Building2 size={12} className="text-[#b51c26]" />
                <span className="text-xs text-[#b51c26] font-medium">
                  {effectiveCompany.display_name || effectiveCompany.name}
                </span>
              </div>
              
              <button
                onClick={handleRefresh}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Atualizar notificações"
                disabled={loading}
              >
                <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <div className="p-4 text-center">
                <div className="text-red-500 text-sm mb-2">
                  {error}
                </div>
                <button
                  onClick={handleRefresh}
                  className="text-[#b51c26] text-sm hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : loading && notifications.length === 0 ? (
              <div className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm">Buscando notificações...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <div className="text-sm font-medium mb-1">Nenhuma notificação</div>
                <div className="text-xs">
                  Você será notificado quando houver novos comentários em processos da {effectiveCompany.display_name || effectiveCompany.name}
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                    notification.isNew ? 'bg-[#b51c26]/5 border-l-2 border-l-[#b51c26]' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <MessageSquare size={16} className="text-[#b51c26]" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {notification.taskTitle}
                        </div>
                        {notification.isNew && (
                          <div className="w-2 h-2 bg-[#b51c26] rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2 line-clamp-2">
                        {notification.commentText}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <User size={12} />
                        <span>{notification.author}</span>
                        <Calendar size={12} className="ml-2" />
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50/50 text-center">
              <div className="text-xs text-gray-500">
                Mostrando comentários de processos da {effectiveCompany.display_name || effectiveCompany.name}
                {profile?.role === 'admin' && (
                  <span className="block mt-1 text-[#b51c26] font-medium">
                    Modo Administrador - Empresa Selecionada
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}