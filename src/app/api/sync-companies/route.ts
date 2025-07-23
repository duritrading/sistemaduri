// src/app/api/sync-companies/route.ts - VERSÃO DEBUG PARA IDENTIFICAR OS 26 ERROS
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface AsanaCompany {
  id: string;
  name: string;
  displayName: string;
}

interface SyncResult {
  success: boolean;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    errors: number;
  };
  companies?: AsanaCompany[];
  message: string;
  details?: any[];
  errorDetails?: string[];
  skippedTasks?: string[];
  error?: string;
}

// ✅ EXTRAÇÃO COM DEBUG DETALHADO
function extractCompanyFromTitle(title: string, debugMode = true): string | null {
  if (!title || typeof title !== 'string') {
    if (debugMode) console.log(`❌ [EXTRACT] Título inválido: ${JSON.stringify(title)}`);
    return null;
  }
  
  const cleanTitle = title.trim();
  
  // PADRÃO PRINCIPAL
  const mainPattern = /^\d+(\.\d+)?º\s+([A-Z][A-Z0-9\s\-&.]+?)(?:\s*\(|$)/i;
  const match = cleanTitle.match(mainPattern);
  
  if (match && match[2]) {
    let companyName = match[2].trim();
    companyName = companyName.replace(/[\s\-.,]+$/, '');
    
    if (companyName.length >= 1 && companyName.length <= 50) {
      const formatted = formatCompanyName(companyName);
      if (debugMode) console.log(`✅ [EXTRACT] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    } else {
      if (debugMode) console.log(`❌ [EXTRACT] Nome muito longo/curto: "${companyName}" (${companyName.length} chars)`);
    }
  } else {
    if (debugMode) console.log(`❌ [EXTRACT] Padrão não reconhecido: "${cleanTitle}"`);
  }
  
  return null;
}

function formatCompanyName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (word.length <= 3 && /^[A-Z]+$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ✅ BUSCAR EMPRESAS COM ANÁLISE DETALHADA DE ERROS
async function fetchAsanaCompaniesWithDebug(): Promise<{
  companies: AsanaCompany[];
  errorDetails: string[];
  skippedTasks: string[];
  totalTasks: number;
}> {
  console.log('🔄 [DEBUG] Buscando empresas do Asana com análise detalhada...');

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

  console.log(`✅ [DEBUG] Workspace: ${workspace.name}`);

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

  console.log(`✅ [DEBUG] Projeto: ${operationalProject.name}`);

  // 3. Buscar tasks com análise detalhada
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

  console.log(`📊 [DEBUG] ${allTasks.length} tasks encontradas`);

  if (allTasks.length === 0) {
    throw new Error('Nenhuma task encontrada no projeto');
  }

  // 4. Análise detalhada de cada task
  const companySet = new Set<string>();
  const errorDetails: string[] = [];
  const skippedTasks: string[] = [];
  let successfulExtractions = 0;

  console.log('\n🔍 [DEBUG] Analisando cada task...');

  allTasks.forEach((task: any, index) => {
    const taskNumber = index + 1;
    
    // Log básico da task
    console.log(`\n📝 [${taskNumber}/${allTasks.length}] Task: "${task.name}"`);
    
    if (!task.name) {
      skippedTasks.push(`${taskNumber}. Task sem nome (ID: ${task.gid})`);
      console.log(`   ⚠️ SKIP: Task sem nome`);
      return;
    }

    // Tentar extrair do título
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

  // 5. Estatísticas finais
  const companies: AsanaCompany[] = Array.from(companySet)
    .filter(name => name && name !== 'Não Identificado')
    .map(name => ({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: name,
      displayName: name
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  console.log(`\n📊 [DEBUG] ESTATÍSTICAS FINAIS:`);
  console.log(`   📋 Total de tasks: ${allTasks.length}`);
  console.log(`   ✅ Extrações bem-sucedidas: ${successfulExtractions}`);
  console.log(`   ❌ Erros de extração: ${errorDetails.length}`);
  console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);
  console.log(`   🏢 Empresas únicas: ${companies.length}`);

  console.log(`\n🏢 [DEBUG] Empresas extraídas:`);
  companies.forEach((company, i) => {
    console.log(`   ${i + 1}. ${company.name}`);
  });

  return {
    companies,
    errorDetails,
    skippedTasks,
    totalTasks: allTasks.length
  };
}

// ✅ POST - SINCRONIZAR COM DEBUG COMPLETO
export async function POST() {
  console.log('🚀 [DEBUG] Sincronização com análise detalhada de erros...');
  
  try {
    // 1. Verificar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    // 2. Buscar empresas com análise detalhada
    const { companies, errorDetails, skippedTasks, totalTasks } = await fetchAsanaCompaniesWithDebug();
    
    console.log(`🏢 [DEBUG] ${companies.length} empresas para sincronizar`);

    // 3. Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 4. Sincronizar cada empresa
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];
    const dbErrors: string[] = [];

    for (const company of companies) {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('name', company.name)
          .single();

        if (existing && !fetchError) {
          // Atualizar
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              display_name: company.displayName,
              slug: company.id,
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ [DB] Erro ao atualizar ${company.name}:`, updateError);
            errorCount++;
            dbErrors.push(`UPDATE ${company.name}: ${updateError.message}`);
            results.push({ company: company.name, status: 'error', error: updateError.message });
          } else {
            console.log(`✅ [DB] Atualizada: ${company.name}`);
            updatedCount++;
            results.push({ company: company.name, status: 'updated' });
          }
        } else {
          // Criar
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.id,
              active: true
            });

          if (insertError) {
            console.error(`❌ [DB] Erro ao criar ${company.name}:`, insertError);
            errorCount++;
            dbErrors.push(`INSERT ${company.name}: ${insertError.message}`);
            results.push({ company: company.name, status: 'error', error: insertError.message });
          } else {
            console.log(`✅ [DB] Criada: ${company.name}`);
            createdCount++;
            results.push({ company: company.name, status: 'created' });
          }
        }
      } catch (companyError) {
        console.error(`❌ [DB] Erro geral para ${company.name}:`, companyError);
        errorCount++;
        const errorMsg = companyError instanceof Error ? companyError.message : 'Erro desconhecido';
        dbErrors.push(`GENERAL ${company.name}: ${errorMsg}`);
        results.push({ company: company.name, status: 'error', error: errorMsg });
      }
    }

    // 5. Resultado final com detalhes dos erros
    const finalResult: SyncResult = {
      success: true,
      message: `Sincronização Asana concluída: ${createdCount} criadas, ${updatedCount} atualizadas, ${errorCount} erros`,
      stats: {
        totalProcessed: companies.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      companies: companies,
      details: results,
      errorDetails: [
        ...errorDetails.map(e => `EXTRAÇÃO: ${e}`),
        ...dbErrors.map(e => `DATABASE: ${e}`)
      ],
      skippedTasks
    };

    console.log(`\n🎯 [DEBUG] RESULTADO FINAL:`);
    console.log(`   📊 Tasks processadas: ${totalTasks}`);
    console.log(`   🏢 Empresas extraídas: ${companies.length}`);
    console.log(`   ✅ Criadas: ${createdCount}`);
    console.log(`   🔄 Atualizadas: ${updatedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   ❌ Erros de extração: ${errorDetails.length}`);
    console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('❌ [DEBUG] ERRO FATAL:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json({
      success: false,
      error: 'Falha na sincronização com Asana',
      details: errorMessage,
      message: `Erro: ${errorMessage}`,
      stats: { totalProcessed: 0, created: 0, updated: 0, errors: 1 },
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