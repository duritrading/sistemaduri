// src/lib/supabase.ts - CONFIGURAÇÃO PRODUCTION-READY
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// ✅ VALIDAÇÃO DE ENVIRONMENT VARIABLES
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ✅ CLIENTE SUPABASE COM CONFIGURAÇÕES OTIMIZADAS
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
});

// ✅ TIPOS DO BANCO
export type Company = Database['public']['Tables']['companies']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type TrackingData = Database['public']['Tables']['tracking_data']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

// ✅ AUTH HELPERS ESSENCIAIS
export const authHelpers = {
  // Login com email/senha
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Log da ação
    if (data.user) {
      await supabase.rpc('log_user_action', {
        action_name: 'login',
        resource_name: 'auth',
        action_details: { method: 'email_password' }
      });
    }
    
    return data;
  },

  // Registro de novo usuário
  async signUp(email: string, password: string, companySlug: string, fullName?: string) {
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

  // Logout seguro
  async signOut() {
    await supabase.rpc('log_user_action', {
      action_name: 'logout',
      resource_name: 'auth'
    });
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Recuperar usuário atual com perfil
  async getCurrentUser() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { user: null, profile: null, company: null };

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        companies (
          id,
          name,
          display_name,
          slug,
          settings
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError) return { user, profile: null, company: null };
    
    return {
      user,
      profile: profile as UserProfile,
      company: (profile as any).companies as Company
    };
  },

  // Verificar se usuário pertence a empresa
  async checkCompanyAccess(companySlug: string): Promise<boolean> {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('companies!inner(slug)')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    return (profile as any)?.companies?.slug === companySlug;
  }
};

// ✅ DATA HELPERS PARA TRACKING
export const dataHelpers = {
  // Buscar trackings da empresa do usuário
  async getTrackingData(filters?: { status?: string; reference?: string }) {
    let query = supabase
      .from('tracking_data')
      .select('*')
      .order('last_sync', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.reference) {
      query = query.ilike('reference', `%${filters.reference}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Sincronizar dados do Asana para empresa específica
  async syncAsanaData(asanaData: any[], companyId: string) {
    const trackingRecords = asanaData.map(item => ({
      company_id: companyId,
      asana_task_id: item.asanaId,
      raw_data: item,
      processed_data: {
        title: item.title,
        status: item.status,
        maritime_status: item.maritimeStatus,
        reference: item.ref
      },
      status: item.status,
      maritime_status: item.maritimeStatus,
      reference: item.ref
    }));

    const { data, error } = await supabase
      .from('tracking_data')
      .upsert(trackingRecords, { 
        onConflict: 'company_id,asana_task_id',
        ignoreDuplicates: false 
      });

    if (error) throw error;

    await supabase.rpc('log_user_action', {
      action_name: 'sync_asana_data',
      resource_name: 'tracking_data',
      action_details: { count: trackingRecords.length }
    });

    return data;
  },

  // Buscar companies ativas
  async getActiveCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data;
  }
};