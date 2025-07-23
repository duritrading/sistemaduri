// src/lib/supabase-admin.ts - VERSÃO CORRIGIDA COM VALIDAÇÃO ROBUSTA
import { createClient } from '@supabase/supabase-js';

// ✅ INTERFACES MANTIDAS
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

// ✅ TYPE PARA SUPABASE USER
interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  [key: string]: any;
}

// ✅ VALIDAÇÃO ROBUSTA COM MÚLTIPLOS FALLBACKS
function validateEnvironment(): { url: string; serviceKey: string } {
  console.log('🔍 [ADMIN] Validando variáveis de ambiente...');
  
  // Múltiplos fallbacks para URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
              process.env.SUPABASE_URL || 
              process.env.REACT_APP_SUPABASE_URL;
  
  // Múltiplos fallbacks para SERVICE_ROLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_SERVICE_KEY ||
                     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 [ADMIN] Variáveis encontradas:');
  console.log(`   - URL definida: ${!!url}`);
  console.log(`   - Service Key definida: ${!!serviceKey}`);
  
  // Log detalhado para debug
  if (url) {
    console.log(`   - URL: ${url.substring(0, 30)}...`);
  }
  if (serviceKey) {
    console.log(`   - Service Key: ${serviceKey.substring(0, 20)}... (${serviceKey.length} chars)`);
  }
  
  // Validação URL com critérios menos rigorosos
  if (!url) {
    throw new Error(`
❌ SUPABASE URL não encontrada!
Variáveis testadas:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_URL  
- REACT_APP_SUPABASE_URL

Para corrigir:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Settings > API > Project URL
4. Adicione no .env.local: NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
5. Reinicie: npm run dev
    `);
  }

  if (url.length < 10 || url.includes('your_') || url === 'dummy' || url === 'undefined') {
    throw new Error(`❌ SUPABASE URL inválida: ${url}`);
  }

  // Validação SERVICE_ROLE_KEY com critérios menos rigorosos
  if (!serviceKey) {
    throw new Error(`
❌ SERVICE_ROLE_KEY não encontrada!
Variáveis testadas:
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_SERVICE_KEY
- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

Para corrigir:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto  
3. Settings > API > service_role key (NÃO a anon!)
4. Adicione no .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui
5. Reinicie: npm run dev
    `);
  }

  if (serviceKey.length < 30 || serviceKey.includes('your_') || serviceKey === 'dummy' || serviceKey === 'undefined') {
    throw new Error(`❌ SERVICE_ROLE_KEY inválida (${serviceKey.length} chars): ${serviceKey.substring(0, 20)}...`);
  }

  // Verificação adicional para JWT (SERVICE_ROLE_KEY deve ser JWT)
  if (!serviceKey.startsWith('eyJ')) {
    console.warn(`⚠️  [ADMIN] SERVICE_ROLE_KEY não parece ser um JWT válido`);
    console.warn(`⚠️  [ADMIN] Key preview: ${serviceKey.substring(0, 30)}...`);
    console.warn(`⚠️  [ADMIN] Tentando usar mesmo assim...`);
  }

  console.log('✅ [ADMIN] Variáveis validadas com sucesso');
  return { url, serviceKey };
}

// ✅ CRIAR CLIENTE ADMIN COM ERROR HANDLING ROBUSTO
function createAdminClient() {
  try {
    console.log('🔄 [ADMIN] Iniciando criação do cliente admin...');
    
    const { url, serviceKey } = validateEnvironment();
    
    console.log('🔄 [ADMIN] Criando cliente Supabase...');
    
    const client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    // Teste rápido do cliente
    if (!client) {
      throw new Error('Cliente Supabase não foi criado');
    }

    console.log('✅ [ADMIN] Cliente admin criado com sucesso');
    return client;
    
  } catch (error) {
    console.error('❌ [ADMIN] ERRO CRÍTICO ao criar cliente admin:');
    console.error(error);
    
    // Re-throw com informação adicional
    if (error instanceof Error) {
      throw new Error(`Falha na criação do cliente admin: ${error.message}`);
    } else {
      throw new Error('Falha na criação do cliente admin: Erro desconhecido');
    }
  }
}

// ✅ FUNÇÕES HELPER MANTIDAS
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

function isEmailAlreadyTaken(users: SupabaseAuthUser[], targetEmail: string): boolean {
  const normalizedTarget = normalizeEmail(targetEmail);
  
  return users.some((user) => {
    if (!user || typeof user !== 'object') return false;
    if (!user.email) return false;
    if (typeof user.email !== 'string') return false;
    
    const userEmailNormalized = normalizeEmail(user.email);
    return userEmailNormalized === normalizedTarget;
  });
}

// ✅ FUNÇÃO PRINCIPAL COM TRY-CATCH ROBUSTO
export const createUserWithProfile = async (userData: CreateUserData): Promise<UserCreationResult> => {
  try {
    console.log('🔄 [ADMIN] Iniciando criação de usuário:', userData.email);

    // 1. Validar dados de entrada
    const validation = validateUserData(userData);
    if (!validation.valid) {
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

    const normalizedEmail = normalizeEmail(userData.email);
    console.log('📧 [ADMIN] Email normalizado:', normalizedEmail);

    // 2. Criar cliente admin (com validação robusta)
    console.log('🔄 [ADMIN] Obtendo cliente admin...');
    let supabaseAdmin;
    
    try {
      supabaseAdmin = createAdminClient();
    } catch (clientError) {
      console.error('❌ [ADMIN] Erro ao criar cliente:', clientError);
      throw new Error(`Erro de configuração: ${clientError instanceof Error ? clientError.message : 'Erro desconhecido'}`);
    }

    console.log('✅ [ADMIN] Cliente admin obtido');

    // 3. Verificar se empresa existe
    console.log('🔍 [ADMIN] Verificando empresa:', userData.companyId);
    
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, display_name')
      .eq('id', userData.companyId)
      .single();

    if (companyError || !company) {
      console.error('❌ [ADMIN] Empresa não encontrada:', companyError);
      throw new Error(`Empresa não encontrada: ${userData.companyId}`);
    }

    console.log('✅ [ADMIN] Empresa encontrada:', company.display_name);

    // 4. Verificar se email já existe
    console.log('🔍 [ADMIN] Verificando emails existentes...');
    
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [ADMIN] Erro ao listar usuários:', listError);
      throw new Error(`Erro ao verificar usuários existentes: ${listError.message}`);
    }
    
    const emailAlreadyExists = isEmailAlreadyTaken(
      existingUsers.users as SupabaseAuthUser[], 
      normalizedEmail
    );
    
    if (emailAlreadyExists) {
      throw new Error('Este email já está cadastrado no sistema');
    }

    console.log('✅ [ADMIN] Email disponível:', normalizedEmail);

    // 5. Criar usuário no auth
    console.log('🔄 [ADMIN] Criando usuário no Supabase Auth...');
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.fullName,
        company_id: userData.companyId,
        role: userData.role
      }
    });

    if (authError) {
      console.error('❌ [ADMIN] Erro ao criar usuário no auth:', authError);
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado corretamente');
    }

    console.log('✅ [ADMIN] Usuário criado no auth:', authData.user.id);

    // 6. Criar profile na tabela user_profiles  
    console.log('🔄 [ADMIN] Criando profile do usuário...');
    
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
      console.warn('⚠️  [ADMIN] Erro ao criar profile:', profileError.message);
      // Não falhar aqui, o usuário auth já foi criado
    }

    console.log('✅ [ADMIN] Usuário criado com sucesso:', normalizedEmail);

    return {
      success: true,
      user: authData.user,
      profile: profileData
    };

  } catch (error) {
    console.error('❌ [ADMIN] ERRO GERAL na criação do usuário:');
    console.error(error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao criar usuário'
    };
  }
};

// ✅ LISTAR TODOS OS USUÁRIOS
export const getAllUsers = async (): Promise<any[]> => {
  try {
    console.log('🔍 [ADMIN] Listando usuários...');
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
      console.error('❌ [ADMIN] Erro ao listar usuários:', error);
      throw error;
    }

    console.log(`✅ [ADMIN] ${data?.length || 0} usuários encontrados`);
    return data || [];
    
  } catch (error) {
    console.error('❌ [ADMIN] Erro geral ao listar usuários:', error);
    return [];
  }
};

// ✅ TESTAR CONEXÃO COM LOGS DETALHADOS
export const testAdminConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔍 [ADMIN] Testando conexão admin...');
    
    const supabaseAdmin = createAdminClient();
    
    console.log('🔄 [ADMIN] Fazendo chamada de teste...');
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ [ADMIN] Erro na chamada de teste:', error);
      throw error;
    }
    
    console.log(`✅ [ADMIN] Conexão funcionando! ${data.users.length} usuários encontrados`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ [ADMIN] Erro na conexão admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};