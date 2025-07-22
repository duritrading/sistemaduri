// src/contexts/AuthContext.tsx - CONTEXT ISOLADO (ZERO ERRORS)
'use client';

import { createContext, useContext } from 'react';

// ✅ TIPOS CONCENTRADOS (SEM DEPENDÊNCIAS EXTERNAS)
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    company_slug?: string;
  };
}

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active: boolean;
}

export interface Company {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  active: boolean;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  session: any | null;
  loading: boolean;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companySlug: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ✅ CONTEXT EXPORTADO EXPLICITAMENTE
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ HOOK COM VALIDAÇÃO
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}