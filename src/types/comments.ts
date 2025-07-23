// src/types/comments.ts - TIPOS PARA SISTEMA DE COMENTÁRIOS DO ASANA
export interface AsanaComment {
  gid: string;
  text: string;
  created_at: string;
  created_by: {
    name: string;
    gid: string;
  };
}

export interface CommentsAPIResponse {
  success: boolean;
  data: AsanaComment[];
  taskId: string;
  total: number;
  timestamp: string;
  error?: string;
  details?: string;
}

export interface CommentsModalState {
  isOpen: boolean;
  taskId: string;
  taskTitle: string;
}

// ✅ Filtros para comentários especiais
export const COMMENT_FILTERS = {
  AMPERSAND: '&', // Comentários que começam com &
  HASH: '#',      // Comentários que começam com # (para futuras implementações)
  AT: '@'         // Comentários que começam com @ (para futuras implementações)
} as const;

export type CommentFilterType = typeof COMMENT_FILTERS[keyof typeof COMMENT_FILTERS];