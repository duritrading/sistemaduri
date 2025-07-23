// src/lib/supabase-admin.ts - ADMIN API CORRIGIDA (SEM ERROS TYPESCRIPT)
import { createClient } from '@supabase/supabase-js';

// ✅ INTERFACES INLINE (SEM IMPORTS EXTERNOS)
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

// ✅ VALIDAÇÃO ROBUSTA DAS VARIÁVEIS
function validateEnvironment(): { url: string; serviceKey: string } {
  console.log('🔍 Validando variáveis de ambiente...');
  
  // Múltiplas formas de acessar as variáveis
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  // Debug detalhado das variáveis
  console.log('🔍 DEBUG ENV VARS:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('- All ENV keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  
  // Validação mais permissiva da URL
  if (!url || url.length < 10 || url.includes('your_') || url === 'dummy') {
    throw new Error(`
❌ SUPABASE URL não configurada!

📋 Variável encontrada: ${url || 'NENHUMA'}

Para corrigir:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: Settings > API  
4. Copie o "Project URL"
5. Adicione no .env.local: NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
6. Reinicie: npm run dev
    `);
  }

  // Validação mais permissiva da Service Key
  if (!serviceKey || serviceKey.length < 50 || serviceKey.includes('your_') || serviceKey === 'dummy') {
    throw new Error(`
❌ SERVICE_ROLE_KEY não configurada!

📋 Variável encontrada: ${serviceKey ? `${serviceKey.substring(0, 20)}...` : 'NENHUMA'}

Para corrigir:
1. Acesse: https://supabase.com/dashboard  
2. Selecione seu projeto
3. Vá em: Settings > API
4. Copie a "service_role" key (⚠️ NÃO a anon key!)
5. Adicione no .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui
6. Reinicie: npm run dev

⚠️ IMPORTANTE: Use a SERVICE_ROLE key, não a ANON key!
⚠️ A key deve começar com "eyJ" e ter ~200+ caracteres
    `);
  }

  console.log('✅ URL configurada:', url.substring(0, 30) + '...');
  console.log('✅ Service Key configurada:', serviceKey.substring(0, 20) + '...');

  return { url, serviceKey };
}

// ✅ CRIAR CLIENTE ADMIN COM VALIDAÇÃO CORRIGIDA
function createAdminClient() {
  try {
    const { url, serviceKey } = validateEnvironment();
    
    console.log('🔄 Criando cliente admin...');
    
    const client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    console.log('✅ Cliente admin criado com sucesso');
    return client;
  } catch (error) {
    console.error('❌ Erro ao criar cliente admin:', error);
    throw error;
  }
}

// ✅ FUNÇÕES HELPER INLINE
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function validateUserData(userData: CreateUserData): { valid: boolean; errors: string[] } {
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
}

// ✅ CRIAR USUÁRIO COM TYPE SAFETY COMPLETO
export const createUserWithProfile = async (userData: CreateUserData): Promise<UserCreationResult> => {
  try {
    console.log('🔄 Iniciando criação de usuário:', userData.email);

    // Validar dados usando função robusta
    const validation = validateUserData(userData);
    if (!validation.valid) {
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

    // Normalizar email
    const normalizedEmail = normalizeEmail(userData.email);
    console.log('📧 Email normalizado:', normalizedEmail);

    // Criar cliente admin com debugging
    console.log('🔄 Criando cliente admin...');
    const supabaseAdmin = createAdminClient();
    console.log('✅ Cliente admin criado');

    // 1. Verificar se empresa existe
    console.log('🔍 Verificando empresa:', userData.companyId);
    
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, display_name')
      .eq('id', userData.companyId)
      .single();

    if (companyError || !company) {
      console.error('❌ Empresa não encontrada:', companyError);
      throw new Error(`Empresa não encontrada: ${userData.companyId}`);
    }

    console.log('✅ Empresa encontrada:', company.display_name);

    // 2. Verificar se email já existe (TYPE-SAFE)
    console.log('🔍 Verificando se email já existe...');
    
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      throw new Error(`Erro ao verificar usuários existentes: ${listError.message}`);
    }
    
    // ✅ COMPARAÇÃO TYPE-SAFE (SEM ERROS TYPESCRIPT)
    const emailExists = existingUsers.users.some((user) => {
      // Verificação robusta do email
      if (!user || typeof user !== 'object') return false;
      if (!('email' in user) || !user.email) return false;
      if (typeof user.email !== 'string') return false;
      
      return normalizeEmail(user.email) === normalizedEmail;
    });
    
    if (emailExists) {
      throw new Error('Este email já está cadastrado no sistema');
    }

    console.log('✅ Email disponível:', normalizedEmail);

    // 3. Criar usuário no auth
    console.log('🔄 Criando usuário no Supabase Auth...');
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: userData.password,
      email_confirm: true, // ✅ Confirmar email automaticamente
      user_metadata: {
        full_name: userData.fullName,
        company_id: userData.companyId,
        role: userData.role
      }
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no auth:', authError);
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado corretamente');
    }

    console.log('✅ Usuário criado no auth:', authData.user.id);

    // 4. Criar profile na tabela user_profiles  
    console.log('🔄 Criando profile do usuário...');
    
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        company_id: userData.companyId,
        email: normalizedEmail,
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
      console.warn('⚠️ Erro ao criar profile:', profileError.message);
      // Não falhar completamente se o profile não for criado
    }

    console.log('✅ Usuário criado com sucesso:', normalizedEmail);

    // ✅ RETURN TYPE-SAFE
    return {
      success: true,
      user: authData.user,
      profile: profileData
    };

  } catch (error) {
    console.error('❌ Erro na criação do usuário:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao criar usuário'
    };
  }
};

// ✅ LISTAR TODOS OS USUÁRIOS
export const getAllUsers = async (): Promise<any[]> => {
  try {
    const supabaseAdmin = createAdminClient();
    
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

// ✅ TESTAR CONEXÃO (para debugging)
export const testAdminConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔍 Testando conexão admin...');
    
    const supabaseAdmin = createAdminClient();
    
    // Teste simples: listar usuários
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Conexão admin funcionando!', `${data.users.length} usuários encontrados`);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro na conexão admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};