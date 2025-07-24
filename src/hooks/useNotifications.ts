// src/hooks/useNotifications.ts - COM FILTRO POR EMPRESA
import { useState, useEffect, useRef, useCallback } from 'react';
import { CommentNotification, NotificationState, NOTIFICATION_CONFIG } from '@/types/notifications';

interface UseNotificationsProps {
  userId: string;
  companyName?: string; // ✅ NOVO: Filtro por empresa
  enabled?: boolean;
  pollingInterval?: number;
}

interface UseNotificationsReturn extends NotificationState {
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>;
  retryCount: number;
  companyName?: string; // ✅ Para debug
}

export function useNotifications({
  userId,
  companyName, // ✅ NOVO parâmetro
  enabled = true,
  pollingInterval = NOTIFICATION_CONFIG.POLLING_INTERVAL
}: UseNotificationsProps): UseNotificationsReturn {
  
  // ✅ State do hook
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    lastChecked: '',
    loading: false,
    error: null
  });

  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const maxRetries = 3;

  // ✅ Função para buscar notificações COM FILTRO DE EMPRESA
  const fetchNotifications = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      // Cancelar request anterior se ainda estiver em andamento
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, loading: true, error: null }));

      // ✅ CONSTRUIR PARAMS COM FILTRO DE EMPRESA
      const params = new URLSearchParams({ userId });
      
      // ✅ ADICIONAR FILTRO DE EMPRESA SE DISPONÍVEL
      if (companyName && companyName.trim() !== '') {
        params.append('company', companyName);
        console.log(`🔔 [Hook] Buscando notificações para empresa: ${companyName}`);
      } else {
        console.log(`🔔 [Hook] Buscando notificações (todas empresas - admin mode?)`);
      }

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      // ✅ SEMPRE PROCESSAR RESPOSTA, MESMO COM STATUS DIFERENTE DE 200
      const result = await response.json();

      // Se a API retornou dados válidos (mesmo com success: false)
      if (result.data !== undefined && Array.isArray(result.data)) {
        setState(prev => ({
          ...prev,
          notifications: result.data || [],
          unreadCount: result.unreadCount || 0,
          lastChecked: result.lastChecked || new Date().toISOString(),
          loading: false,
          error: null
        }));
        
        // Reset retry count em caso de sucesso
        setRetryCount(0);
        
        console.log(`🔔 [Hook] Notificações carregadas: ${result.data?.length || 0} (empresa: ${companyName || 'todas'})`);
        
        // ✅ LOG DEBUG DA EMPRESA FILTRADA
        if (result.companyFilter) {
          console.log(`📋 [Hook] Filtradas para empresa: ${result.companyFilter}`);
        }
        
        return;
      }

      // Se chegou aqui, algo deu errado, mas não vamos quebrar a UI
      throw new Error(result.error || `API retornou status ${response.status}`);

    } catch (error) {
      // Ignorar erros de abort (quando componente desmonta)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.warn(`⚠️ [Hook] Tentativa ${retryCount + 1}/${maxRetries} falhou:`, error);

      // ✅ ESTRATÉGIA DE RETRY COM BACKOFF
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        
        // Retry com delay progressivo (2s, 4s, 8s)
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          fetchNotifications();
        }, delay);
        
        // Não mostrar erro na UI ainda, só quando esgotar tentativas
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // ✅ APÓS ESGOTAR TENTATIVAS, FALHAR GRACIOSAMENTE
      console.error('❌ [Hook] Todas as tentativas falharam:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Sistema temporariamente indisponível',
        // Manter dados anteriores se existirem
        notifications: prev.notifications || [],
        unreadCount: 0
      }));

    }
  }, [userId, companyName, enabled, retryCount]); // ✅ Adicionar companyName nas deps

  // ✅ Função para marcar todas como lidas (simplificada)
  const markAllAsRead = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          timestamp: new Date().toISOString()
        })
      });

      // Não importa se a API falhou, vamos atualizar localmente
      setState(prev => ({
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map(n => ({ ...n, isNew: false })),
        lastChecked: new Date().toISOString(),
        error: null
      }));

      console.log(`✅ [Hook] Notificações marcadas como lidas (empresa: ${companyName || 'todas'})`);

    } catch (error) {
      console.warn('⚠️ [Hook] Erro ao marcar como lidas (API), mas atualizando localmente:', error);
      
      // Mesmo com erro, atualizar localmente
      setState(prev => ({
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map(n => ({ ...n, isNew: false }))
      }));
    }
  }, [userId, companyName, enabled]); // ✅ Adicionar companyName

  // ✅ Função para limpar notificações
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
      error: null
    }));
    setRetryCount(0);
  }, []);

  // ✅ Função para forçar refresh
  const refreshNotifications = useCallback(async () => {
    // Reset estado para forçar nova busca
    setState(prev => ({ ...prev, lastChecked: '', error: null }));
    setRetryCount(0);
    await fetchNotifications();
  }, [fetchNotifications]);

  // ✅ RESETAR NOTIFICAÇÕES QUANDO EMPRESA MUDAR
  useEffect(() => {
    // Limpar notificações anteriores quando empresa mudar
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
      lastChecked: '',
      error: null
    }));
    setRetryCount(0);
    
    console.log(`🔄 [Hook] Empresa mudou para: ${companyName || 'todas'} - resetando notificações`);
  }, [companyName]);

  // ✅ Setup do polling com proteção contra erros
  useEffect(() => {
    if (!enabled || !userId) return;

    // Buscar inicial após pequeno delay
    const initialTimeout = setTimeout(() => {
      fetchNotifications();
    }, 1000);

    // Configurar polling com intervalo maior em caso de erros
    const effectiveInterval = retryCount > 0 ? pollingInterval * 2 : pollingInterval;
    
    intervalRef.current = setInterval(() => {
      // Só continuar polling se não estiver em estado de erro crítico
      if (retryCount < maxRetries) {
        fetchNotifications();
      }
    }, effectiveInterval);

    // Cleanup
    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [enabled, userId, companyName, pollingInterval, retryCount, fetchNotifications]); // ✅ Adicionar companyName

  // ✅ Cleanup no unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    ...state,
    fetchNotifications,
    markAllAsRead,
    clearNotifications,
    refreshNotifications,
    retryCount,
    companyName // ✅ Para debug/monitoramento
  };
}