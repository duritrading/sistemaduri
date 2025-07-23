// src/app/api/sync-companies/route.ts - VERSÃO REPLACE ALL + PADRÕES CORRIGIDOS
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface AsanaCompany {
  id: string;
  name: string;
  displayName: string;
  slug: string;
}

interface SyncResult {
  success: boolean;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
  };
  companies?: AsanaCompany[];
  message: string;
  details?: any[];
  errorDetails?: string[];
  skippedTasks?: string[];
  error?: string;
}

// ✅ EXTRAÇÃO CORRIGIDA PARA TODOS OS PADRÕES
function extractCompanyFromTitle(title: string, debugMode = true): string | null {
  if (!title || typeof title !== 'string') {
    if (debugMode) console.log(`❌ [EXTRACT] Título inválido: ${JSON.stringify(title)}`);
    return null;
  }
  
  const cleanTitle = title.trim();
  
  // ✅ PADRÕES SUPORTADOS (baseados nos seus erros):
  const patterns = [
    // 1. Padrão principal: "15º NATURALLY" ou "03º ATACAMAX"
    {
      regex: /^\d+(\.\d+)?º\s+([A-Z][A-Z0-9\s\-&.]+?)(?:\s*\(|$)/i,
      group: 2,
      name: 'Padrão Principal'
    },
    
    // 2. Sem número inicial: "AGRIVALE (01.25 DRAWBACK)" 
    {
      regex: /^([A-Z][A-Z0-9\s\-&.]{2,}?)\s*\(/i,
      group: 1,
      name: 'Sem Número Inicial'
    },
    
    // 3. Nome simples em maiúsculo: "EMPRESA NOME"
    {
      regex: /^([A-Z][A-Z0-9\s\-&.]{2,})$/i,
      group: 1, 
      name: 'Nome Simples'
    },
    
    // 4. Com hífen ou underscore: "EMPRESA-NOME" ou "EMPRESA_NOME"
    {
      regex: /^([A-Z][A-Z0-9\-_&.]{2,})/i,
      group: 1,
      name: 'Com Separadores'
    }
  ];
  
  for (const pattern of patterns) {
    const match = cleanTitle.match(pattern.regex);
    if (match && match[pattern.group]) {
      let companyName = match[pattern.group].trim();
      
      // Limpar caracteres especiais do final
      companyName = companyName.replace(/[\s\-.,_]+$/, '');
      
      // Validar tamanho
      if (companyName.length >= 2 && companyName.length <= 50) {
        const formatted = formatCompanyName(companyName);
        if (debugMode) console.log(`✅ [EXTRACT] "${cleanTitle}" → "${formatted}" (${pattern.name})`);
        return formatted;
      } else {
        if (debugMode) console.log(`❌ [EXTRACT] Nome inválido (${companyName.length} chars): "${companyName}"`);
      }
    }
  }
  
  if (debugMode) console.log(`❌ [EXTRACT] Nenhum padrão reconhecido: "${cleanTitle}"`);
  return null;
}

function formatCompanyName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      // Manter siglas em maiúsculo (3 letras ou menos)
      if (word.length <= 3 && /^[A-Z]+$/i.test(word)) {
        return word.toUpperCase();
      }
      // Capitalizar primeira letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ✅ GERAR SLUG ÚNICO (RESOLVER CONSTRAINT VIOLATION)
function generateUniqueSlug(name: string, existingSlugs: Set<string>): string {
  // Slug base
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiais
    .replace(/\s+/g, '-')        // Espaços para hífens
    .replace(/-+/g, '-')         // Múltiplos hífens para um
    .replace(/^-|-$/g, '');      // Remover hífens do início/fim
  
  // Se slug base não existe, usar ele
  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug);
    return baseSlug;
  }
  
  // Se existe, adicionar número sequencial
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
}

// ✅ BUSCAR EMPRESAS DO ASANA COM PADRÕES CORRIGIDOS
async function fetchAsanaCompaniesWithPatterns(): Promise<{
  companies: AsanaCompany[];
  errorDetails: string[];
  skippedTasks: string[];
  totalTasks: number;
}> {
  console.log('🔄 [SYNC] Buscando empresas do Asana com padrões corrigidos...');

  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token || token.trim() === '' || token.includes('your_')) {
    throw new Error('ASANA_ACCESS_TOKEN não configurado');
  }

  // 1. Buscar workspace
  const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!workspacesResponse.ok) {
    throw new Error(`Erro ao buscar workspaces: ${workspacesResponse.status}`);
  }
  
  const workspacesData = await workspacesResponse.json();
  const workspace = workspacesData.data?.[0];

  if (!workspace) {
    throw new Error('Nenhum workspace encontrado');
  }

  console.log(`✅ [SYNC] Workspace: ${workspace.name}`);

  // 2. Buscar projeto operacional
  const projectsResponse = await fetch(
    `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
    { 
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(15000)
    }
  );
  
  if (!projectsResponse.ok) {
    throw new Error(`Erro ao buscar projetos: ${projectsResponse.status}`);
  }
  
  const projectsData = await projectsResponse.json();
  const operationalProject = projectsData.data?.find((p: any) => 
    p.name && p.name.toLowerCase().includes('operacional')
  );

  if (!operationalProject) {
    throw new Error('Projeto "operacional" não encontrado');
  }

  console.log(`✅ [SYNC] Projeto: ${operationalProject.name}`);

  // 3. Buscar tasks
  const allTasks = [];
  let offset = undefined;
  
  do {
    const endpoint = `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=name,custom_fields.name,custom_fields.display_value&limit=100${
      offset ? `&offset=${offset}` : ''
    }`;

    const tasksResponse = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(20000)
    });

    if (!tasksResponse.ok) {
      throw new Error(`Erro ao buscar tasks: ${tasksResponse.status}`);
    }

    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data || [];
    
    allTasks.push(...tasks);
    offset = tasksData.next_page?.offset;
    
  } while (offset);

  console.log(`📊 [SYNC] ${allTasks.length} tasks encontradas`);

  if (allTasks.length === 0) {
    throw new Error('Nenhuma task encontrada no projeto');
  }

  // 4. Extrair empresas com padrões corrigidos
  const companySet = new Set<string>();
  const errorDetails: string[] = [];
  const skippedTasks: string[] = [];
  const existingSlugs = new Set<string>();
  let successfulExtractions = 0;

  console.log('\n🔍 [SYNC] Analisando tasks com padrões corrigidos...');

  allTasks.forEach((task: any, index) => {
    const taskNumber = index + 1;
    
    console.log(`\n📝 [${taskNumber}/${allTasks.length}] Task: "${task.name}"`);
    
    if (!task.name) {
      skippedTasks.push(`${taskNumber}. Task sem nome (ID: ${task.gid})`);
      console.log(`   ⚠️ SKIP: Task sem nome`);
      return;
    }

    // Tentar extrair do título com padrões corrigidos
    const titleCompany = extractCompanyFromTitle(task.name, true);
    if (titleCompany) {
      companySet.add(titleCompany);
      successfulExtractions++;
      console.log(`   ✅ SUCESSO: "${titleCompany}"`);
    } else {
      errorDetails.push(`${taskNumber}. "${task.name}" - Padrão não reconhecido`);
      console.log(`   ❌ ERRO: Padrão não reconhecido`);
    }

    // Também verificar custom field "EMPRESA"
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      const empresaField = task.custom_fields.find((field: any) => 
        field.name === 'EMPRESA' && field.display_value
      );
      
      if (empresaField?.display_value) {
        const fieldCompany = formatCompanyName(empresaField.display_value.toString().trim());
        if (fieldCompany.length >= 1 && fieldCompany.length <= 50) {
          companySet.add(fieldCompany);
          console.log(`   ✅ CUSTOM FIELD: "${fieldCompany}"`);
        }
      }
    }
  });

  // 5. Converter para formato final com slugs únicos
  const companies: AsanaCompany[] = Array.from(companySet)
    .filter(name => name && name !== 'Não Identificado')
    .map(name => {
      const slug = generateUniqueSlug(name, existingSlugs);
      return {
        id: slug,
        name: name,
        displayName: name,
        slug: slug
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  console.log(`\n📊 [SYNC] ESTATÍSTICAS FINAIS:`);
  console.log(`   📋 Total de tasks: ${allTasks.length}`);
  console.log(`   ✅ Extrações bem-sucedidas: ${successfulExtractions}`);
  console.log(`   ❌ Erros de extração: ${errorDetails.length}`);
  console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);
  console.log(`   🏢 Empresas únicas: ${companies.length}`);

  console.log(`\n🏢 [SYNC] Empresas para sincronizar:`);
  companies.forEach((company, i) => {
    console.log(`   ${i + 1}. ${company.name} (slug: ${company.slug})`);
  });

  return {
    companies,
    errorDetails,
    skippedTasks,
    totalTasks: allTasks.length
  };
}

// ✅ POST - SINCRONIZAÇÃO REPLACE ALL
export async function POST() {
  console.log('🚀 [SYNC] Sincronização REPLACE ALL iniciada...');
  
  try {
    // 1. Verificar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    // 2. Buscar empresas do Asana
    const { companies, errorDetails, skippedTasks, totalTasks } = await fetchAsanaCompaniesWithPatterns();
    
    console.log(`🏢 [SYNC] ${companies.length} empresas para sincronizar`);

    // 3. Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ [SYNC] Conexão Supabase estabelecida');

    // 4. ✅ REPLACE ALL STRATEGY
    console.log('\n🔄 [SYNC] Executando strategy REPLACE ALL...');

    // 4.1. Desativar todas as empresas existentes
    console.log('📝 [SYNC] Desativando todas as empresas existentes...');
    const { error: deactivateError } = await supabase
      .from('companies')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('active', true);

    if (deactivateError) {
      console.error('❌ [SYNC] Erro ao desativar empresas:', deactivateError);
      throw new Error(`Erro ao desativar empresas: ${deactivateError.message}`);
    }

    console.log('✅ [SYNC] Empresas existentes desativadas');

    // 4.2. Inserir/reativar empresas da sincronização atual
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const company of companies) {
      try {
        // Verificar se empresa já existe (por nome)
        const { data: existing, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('name', company.name)
          .single();

        if (existing && !fetchError) {
          // Reativar e atualizar empresa existente
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              display_name: company.displayName,
              slug: company.slug,
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ [SYNC] Erro ao reativar ${company.name}:`, updateError);
            errorCount++;
            results.push({ 
              company: company.name, 
              status: 'error', 
              error: updateError.message 
            });
          } else {
            console.log(`✅ [SYNC] Reativada: ${company.name}`);
            updatedCount++;
            results.push({ company: company.name, status: 'reactivated' });
          }
        } else {
          // Criar nova empresa
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.slug,
              active: true
            });

          if (insertError) {
            console.error(`❌ [SYNC] Erro ao criar ${company.name}:`, insertError);
            errorCount++;
            results.push({ 
              company: company.name, 
              status: 'error', 
              error: insertError.message 
            });
          } else {
            console.log(`✅ [SYNC] Criada: ${company.name}`);
            createdCount++;
            results.push({ company: company.name, status: 'created' });
          }
        }
      } catch (companyError) {
        console.error(`❌ [SYNC] Erro geral para ${company.name}:`, companyError);
        errorCount++;
        const errorMsg = companyError instanceof Error ? companyError.message : 'Erro desconhecido';
        results.push({ company: company.name, status: 'error', error: errorMsg });
      }
    }

    // 4.3. Contar empresas desativadas
    const { data: deactivatedCompanies, error: countError } = await supabase
      .from('companies')
      .select('name')
      .eq('active', false);

    const deactivatedCount = deactivatedCompanies?.length || 0;

    // 5. Resultado final
    const finalResult: SyncResult = {
      success: true,
      message: `Sincronização REPLACE ALL concluída: ${createdCount} criadas, ${updatedCount} reativadas, ${deactivatedCount} desativadas, ${errorCount} erros`,
      stats: {
        totalProcessed: companies.length,
        created: createdCount,
        updated: updatedCount,
        deactivated: deactivatedCount,
        errors: errorCount
      },
      companies: companies,
      details: results,
      errorDetails: [
        ...errorDetails.map(e => `EXTRAÇÃO: ${e}`),
        ...results.filter(r => r.status === 'error').map(r => `DATABASE: ${r.company} - ${r.error}`)
      ],
      skippedTasks
    };

    console.log(`\n🎯 [SYNC] RESULTADO FINAL:`);
    console.log(`   📊 Tasks processadas: ${totalTasks}`);
    console.log(`   🏢 Empresas extraídas: ${companies.length}`);
    console.log(`   ✅ Criadas: ${createdCount}`);
    console.log(`   🔄 Reativadas: ${updatedCount}`);
    console.log(`   ⛔ Desativadas: ${deactivatedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('❌ [SYNC] ERRO FATAL:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json({
      success: false,
      error: 'Falha na sincronização com Asana',
      details: errorMessage,
      message: `Erro: ${errorMessage}`,
      stats: { totalProcessed: 0, created: 0, updated: 0, deactivated: 0, errors: 1 },
      errorDetails: [errorMessage],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// ✅ GET - STATUS
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: companies, error } = await supabase
      .from('companies')
      .select('name, display_name, active, created_at')
      .eq('active', true)
      .order('name');

    if (error) {
      throw error;
    }

    const companiesInDatabase = companies?.length || 0;
    const token = process.env.ASANA_ACCESS_TOKEN;
    const asanaConfigured = !!(token && token.trim() !== '' && !token.includes('your_'));

    return NextResponse.json({
      success: true,
      companiesInDatabase,
      companiesInAsana: asanaConfigured ? 'Configurado' : 'Token não configurado',
      needsSync: companiesInDatabase === 0,
      asanaConfigured,
      companies: companies || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [GET] Erro ao verificar status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status das empresas',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      companiesInDatabase: 0,
      companiesInAsana: 'Erro',
      needsSync: true,
      asanaConfigured: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}