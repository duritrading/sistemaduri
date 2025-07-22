// src/lib/supabase-admin.ts - ADMIN API COM VALIDAÇÃO ROBUSTA
import { createClient } from '@supabase/supabase-js';

// ✅ VALIDAÇÃO EXPLÍCITA DAS VARIÁVEIS
function validateEnvironment(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Validando variáveis de ambiente...');
  console.log('URL configurada:', !!url ? '✅' : '❌');
  console.log('Service Key configurada:', !!serviceKey ? '✅' : '❌');

  if (!url || url.includes('your_') || url === '') {
    throw new Error(`
❌ NEXT_PUBLIC_SUPABASE_URL não configurada!

📋 Para corrigir:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: Settings > API
4. Copie o "Project URL"
5. Adicione no .env.local: NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
6. Reinicie: npm run dev
    `);
  }

  if (!serviceKey || serviceKey.includes('your_') || serviceKey === '') {
    throw new Error(`
❌ SUPABASE_SERVICE_ROLE_KEY não configurada!

📋 Para corrigir:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto  
3. Vá em: Settings > API
4. Copie a "service_role" key (⚠️ NÃO a anon key!)
5. Adicione no .env.local: SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui
6. Reinicie: npm run dev

⚠️ IMPORTANTE: Use a SERVICE_ROLE key, não a ANON key!
    `);
  }

  return { url, serviceKey };
}

// ✅ CRIAR CLIENTE ADMIN COM VALIDAÇÃO
function createAdminClient() {
  const { url, serviceKey } = validateEnvironment();
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
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
  user?: any;
  profile?: any;
  error?: string;
}

// ✅ CRIAR USUÁRIO COM VALIDAÇÃO ROBUSTA
export const createUserWithProfile = async (userData: CreateUserData): Promise<UserCreationResult> => {
  try {
    console.log('🔄 Iniciando criação de usuário:', userData.email);

    // Validar dados de entrada
    if (!userData.email || !userData.password || !userData.fullName || !userData.companyId) {
      throw new Error('Todos os campos são obrigatórios');
    }

    if (userData.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Criar cliente admin com validação
    const supabaseAdmin = createAdminClient();

    // 1. Verificar se empresa existe
    console.log('🔍 Verificando se empresa existe:', userData.companyId);
    
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, display_name')
      .eq('id', userData.companyId)
      .single();

    if (companyError || !company) {
      throw new Error(`Empresa não encontrada: ${userData.companyId}`);
    }

    console.log('✅ Empresa encontrada:', company.name);

    // 2. Verificar se email já existe
    console.log('🔍 Verificando se email já existe...');
    
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser.users.some(u => u.email === userData.email);
    
    if (emailExists) {
      throw new Error('Este email já está cadastrado no sistema');
    }

    // 3. Criar usuário no auth
    console.log('🔄 Criando usuário no Supabase Auth...');
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
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
      console.warn('⚠️ Erro ao criar profile:', profileError.message);
      // Não falhar completamente se o profile não for criado
    }

    console.log('✅ Usuário criado com sucesso:', userData.email);

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