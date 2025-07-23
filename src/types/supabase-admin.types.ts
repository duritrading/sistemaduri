// src/types/supabase-admin.types.ts - TYPES PARA ADMIN API
export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface SupabaseListUsersResponse {
  users: SupabaseUser[];
  nextPage?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  companyId: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
}

export interface UserCreationResult {
  success: boolean;
  user?: SupabaseUser;
  profile?: any;
  error?: string;
}

export interface Company {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

// Type guards para validação runtime
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isSupabaseUser = (user: any): user is SupabaseUser => {
  return user && 
         typeof user === 'object' && 
         typeof user.id === 'string' && 
         typeof user.created_at === 'string';
};

export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const validateUserData = (userData: CreateUserData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!userData.email || !userData.email.trim()) {
    errors.push('Email é obrigatório');
  } else if (!isValidEmail(userData.email)) {
    errors.push('Email inválido');
  }

  if (!userData.password) {
    errors.push('Senha é obrigatória');
  } else if (userData.password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  if (!userData.fullName || !userData.fullName.trim()) {
    errors.push('Nome completo é obrigatório');
  }

  if (!userData.companyId || !userData.companyId.trim()) {
    errors.push('Empresa é obrigatória');
  }

  if (!['admin', 'manager', 'operator', 'viewer'].includes(userData.role)) {
    errors.push('Papel de usuário inválido');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};