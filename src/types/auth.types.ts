// src/types/auth.types.ts - Type-safe definitions
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    company_slug?: string;
  };
  [key: string]: any; // Allow additional Supabase user properties
}

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active: boolean;
  created_at?: string;
  updated_at?: string;
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

export interface AuthHelperResult {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  session: any | null;
  loading: boolean;
  supabaseConfigured: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companySlug: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface TrackingFilters {
  status?: string;
  reference?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TrackingData {
  id: string;
  reference: string;
  status: string;
  created_at: string;
  updated_at: string;
  company_id: string;
}

export interface UseTrackingDataReturn {
  data: TrackingData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface Permissions {
  isAdmin: boolean;
  isManager: boolean;
  isOperator: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

export type AuthContextType = AuthState & AuthActions;

// ✅ Type guards for runtime safety
export const isValidUser = (user: any): user is User => {
  return user && typeof user === 'object' && 
         typeof user.id === 'string' && 
         typeof user.email === 'string';
};

export const isValidProfile = (profile: any): profile is UserProfile => {
  return profile && typeof profile === 'object' &&
         typeof profile.id === 'string' &&
         typeof profile.company_id === 'string' &&
         typeof profile.email === 'string' &&
         typeof profile.role === 'string' &&
         typeof profile.active === 'boolean';
};

export const isValidCompany = (company: any): company is Company => {
  return company && typeof company === 'object' &&
         typeof company.id === 'string' &&
         typeof company.name === 'string' &&
         typeof company.slug === 'string' &&
         typeof company.active === 'boolean';
};