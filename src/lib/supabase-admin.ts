// src/lib/supabase-admin.ts - ADMIN API HELPER PARA CRIAR USUÁRIOS
import { createClient } from '@supabase/supabase-js';

// ✅ ADMIN CLIENT COM SERVICE ROLE
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Use SERVICE ROLE para admin
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  companyId: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
}

export interface UserCreationResult {
  success: boolean;
  user?: any;
  profile?: any;
  error?: string;
}

// ✅ CRIAR USUÁRIO USANDO ADMIN API
export const createUserWithProfile = async (userData: CreateUserData): Promise<UserCreationResult> => {
  try {
    console.log('🔄 Criando usuário via Admin API:', userData.email);

    // Verificar se service role está configurado
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your_')) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado no .env.local');
    }

    // 1. Criar usuário no auth usando Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: userData.fullName,
        company_id: userData.companyId,
        role: userData.role
      }
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário:', authError);
      
      if (authError.message.includes('User already registered')) {
        throw new Error('Este email já está cadastrado no sistema');
      }
      
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado corretamente');
    }

    console.log('✅ Usuário criado no auth:', authData.user.id);

    // 2. Criar profile na tabela user_profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        company_id: userData.companyId,
        email: userData.email,
        full_name: userData.fullName,
        role: userData.role,
        active: true
      })
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
      .single();

    if (profileError) {
      console.warn('⚠️ Erro ao criar profile (pode já existir):', profileError.message);
      // Não falhar se o profile já existir pelo trigger
    }

    console.log('✅ Profile criado/atualizado:', profileData?.email);

    return {
      success: true,
      user: authData.user,
      profile: profileData
    };

  } catch (error) {
    console.error('❌ Erro geral na criação do usuário:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao criar usuário'
    };
  }
};

// ✅ LISTAR TODOS OS USUÁRIOS (ADMIN ONLY)
export const getAllUsers = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabaseAdmin
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao listar usuários:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro geral ao listar usuários:', error);
    return [];
  }
};

// ✅ ATUALIZAR USUÁRIO (ADMIN ONLY)
export const updateUserProfile = async (userId: string, updates: Partial<CreateUserData>): Promise<UserCreationResult> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: updates.fullName,
        company_id: updates.companyId,
        role: updates.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      profile: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar usuário'
    };
  }
};

// ✅ DESATIVAR USUÁRIO (SOFT DELETE)
export const deactivateUser = async (userId: string): Promise<UserCreationResult> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({ active: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      profile: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao desativar usuário'
    };
  }
};

// ✅ VERIFICAR SE SERVICE ROLE ESTÁ CONFIGURADO
export const checkAdminAccess = (): boolean => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(serviceKey && !serviceKey.includes('your_') && serviceKey.length > 50);
};

export default supabaseAdmin;