// src/types/notifications.ts - TIPOS PARA SISTEMA DE NOTIFICAÇÕES
export interface CommentNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  commentText: string;
  author: string;
  createdAt: string;
  isNew: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  data: CommentNotification[];
  unreadCount: number;
  lastChecked: string;
  error?: string;
  details?: string;
}

export interface NotificationState {
  notifications: CommentNotification[];
  unreadCount: number;
  lastChecked: string;
  loading: boolean;
  error: string | null;
}

export interface MarkAsReadRequest {
  userId: string;
  timestamp?: string;
}

export interface MarkAsReadResponse {
  success: boolean;
  message: string;
  lastChecked: string;
  error?: string;
}

// ✅ Configurações do sistema de notificações
export const NOTIFICATION_CONFIG = {
  POLLING_INTERVAL: 30000, // 30 segundos
  MAX_NOTIFICATIONS: 50,   // Máximo de notificações exibidas
  NOTIFICATION_TIMEOUT: 5000, // Timeout para requests da API
  DEFAULT_LOOKBACK_HOURS: 24, // Buscar comentários das últimas 24h por padrão
} as const;

// ✅ Estados do sistema de notificações
export type NotificationStatus = 'idle' | 'loading' | 'success' | 'error';

// ✅ Ações do sistema de notificações
export type NotificationAction = 
  | 'FETCH_START'
  | 'FETCH_SUCCESS' 
  | 'FETCH_ERROR'
  | 'MARK_READ'
  | 'RESET_NOTIFICATIONS';

// ✅ Filtros para comentários especiais (reutilizando do comments.ts)
export { COMMENT_FILTERS } from './comments';
export type { CommentFilterType } from './comments';
