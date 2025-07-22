// src/lib/supabase.ts - SUPABASE CLIENT ESSENTIAL
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ✅ VALIDAÇÃO SEGURA DE ENV VARS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ✅ CLIENTE SUPABASE (FUNCIONA MESMO SEM CONFIGURAÇÃO)
export const supabase = createClient<Database>(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy_key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'duri-trading@1.0.0'
      }
    }
  }
);

// ✅ TIPOS EXPORTADOS
export type Company = Database['public']['Tables']['companies']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type TrackingData = Database['public']['Tables']['tracking_data']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

// ✅ VERIFICAR SE SUPABASE ESTÁ CONFIGURADO
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && 
           supabaseAnonKey && 
           !supabaseUrl.includes('dummy') && 
           !supabaseAnonKey.includes('dummy') &&
           !supabaseUrl.includes('your_') && 
           !supabaseAnonKey.includes('your_'));
};

// ✅ AUTH HELPERS SIMPLIFICADOS (SEM DEPENDÊNCIAS CIRCULARES)
export const authHelpers = {
  // Login direto
  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Registro direto
  async signUp(email: string, password: string, companySlug: string, fullName?: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado');
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_slug: companySlug
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Logout direto
  async signOut() {
    if (!isSupabaseConfigured()) {
      return;
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Buscar dados do usuário (usado pelo useAuth)
  async getCurrentUser() {
    if (!isSupabaseConfigured()) {
      return { user: null, profile: null, company: null };
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { user: null, profile: null, company: null };
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            name,
            display_name,
            slug,
            active
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        return { user, profile: null, company: null };
      }
      
      return {
        user,
        profile: profile as UserProfile,
        company: (profile as any).companies as Company
      };
    } catch (error) {
      return { user, profile: null, company: null };
    }
  }
};

// ✅ DATA HELPERS PARA TRACKING
export const dataHelpers = {
  // Buscar dados de tracking
  async getTrackingData(companySlug: string, filters?: { status?: string; reference?: string }) {
    if (!isSupabaseConfigured()) {
      return [];
    }
    
    try {
      let query = supabase
        .from('tracking_data')
        .select(`
          *,
          companies!inner (slug)
        `)
        .eq('companies.slug', companySlug);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.reference) {
        query = query.ilike('reference', `%${filters.reference}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      return [];
    }
  }
};