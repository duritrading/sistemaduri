// src/app/api/sync-companies/route.ts - CORREÇÃO COMPLETA PARA TODOS OS CASOS REAIS
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

// ✅ EXTRAÇÃO COMPLETA - TODOS OS CASOS REAIS COBERTOS
function extractCompanyFromTitle(title: string, debugMode = true): string | null {
  if (!title || typeof title !== 'string') {
    if (debugMode) console.log(`❌ [EXTRACT] Título inválido: ${JSON.stringify(title)}`);
    return null;
  }
  
  let cleanTitle = title.trim();
  if (debugMode) console.log(`🔍 [EXTRACT] Analisando: "${cleanTitle}"`);
  
  // ✅ PADRÃO 1: TIMESTAMPS - Remover todos os timestamps do início (inclusive múltiplos)
  // Remove sequências como: "17/07/2025, 11:53:39 BRT 10/07/2025, 16:47:50 BRT "
  while (cleanTitle.match(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+\w+\s+/)) {
    cleanTitle = cleanTitle.replace(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+\w+\s+/, '').trim();
  }
  
  if (debugMode && cleanTitle !== title.trim()) {
    console.log(`   🧹 Removido timestamp: "${cleanTitle}"`);
  }
  
  // ✅ PADRÃO 2: NÚMEROS + SÍMBOLOS + EMPRESA
  // Cobre: "03°", "13.1º", "14°.1", "14.2", etc + empresa
  const numberSymbolPattern = /^(\d+(?:\.\d+)?[°º](?:\.\d+)?|\d+\.\d+)\s+([A-Z][A-Za-z\s&.\-]*?)(?:\s*\(.*\)|\s*-.*)?$/i;
  const match1 = cleanTitle.match(numberSymbolPattern);
  
  if (match1 && match1[2]) {
    const company = match1[2].trim();
    if (company.length >= 2 && company.length <= 50 && /[A-Za-z]/.test(company)) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 1] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 3: APENAS NÚMERO + EMPRESA (sem símbolos)
  // Cobre: "57 FREEZER CARNES", etc
  const numberOnlyPattern = /^(\d+)\s+([A-Z][A-Za-z\s&.\-]*?)(?:\s*\(.*\)|\s*-.*)?$/i;
  const match2 = cleanTitle.match(numberOnlyPattern);
  
  if (match2 && match2[2]) {
    const company = match2[2].trim();
    if (company.length >= 2 && company.length <= 50 && /[A-Za-z]/.test(company)) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 2] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ Não processar casos que não começam com número após limpeza de timestamp
  if (!/^\d+/.test(cleanTitle)) {
    if (debugMode) console.log(`❌ [EXTRACT] Não começa com número: "${cleanTitle}"`);
    return null;
  }
  
  if (debugMode) console.log(`❌ [EXTRACT] Nenhum padrão reconhecido para: "${cleanTitle}"`);
  return null;
}

// ✅ FORMATAÇÃO APRIMORADA - ACEITA CAPITALIZAÇÃO MISTA
function formatCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
    .split(/\s+/)
    .map(word => {
      // Manter siglas em maiúsculo (2-4 letras todas maiúsculas)
      if (word.length <= 4 && /^[A-Z]+$/.test(word)) {
        return word.toUpperCase();
      }
      // Manter nomes próprios como "Duri" se já estão capitalizados
      if (/^[A-Z][a-z]+$/.test(word)) {
        return word;
      }
      // Capitalizar palavras normais
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// ✅ GERAR SLUG ÚNICO
function generateUniqueSlug(name: string, existingSlugs: Set<string>): string {
  let baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Só letras, números e espaços
    .replace(/\s+/g, '-') // Espaços para hífens
    .replace(/-+/g, '-') // Múltiplos hífens para um
    .replace(/^-|-$/g, ''); // Remove hífens das bordas
  
  if (!baseSlug) {
    baseSlug = 'empresa';
  }
  
  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug);
    return baseSlug;
  }
  
  // Usar contador para duplicatas
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
}

// ✅ BUSCAR EMPRESAS DO ASANA
async function fetchAsanaCompaniesAndReplaceAll(): Promise<{
  companies: AsanaCompany[];
  errorDetails: string[];
  skippedTasks: string[];
  totalTasks: number;
}> {
  console.log('🔄 [SYNC] Buscando empresas do Asana - VERSÃO COMPLETA...');

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

  // 3. Buscar todas as tasks
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

  console.log(`📊 [SYNC] ${allTasks.length} tasks encontradas no projeto operacional`);

  if (allTasks.length === 0) {
    throw new Error('Nenhuma task encontrada no projeto operacional');
  }

  // 4. Extrair empresas com PADRÕES COMPLETOS
  const companySet = new Set<string>();
  const errorDetails: string[] = [];
  const skippedTasks: string[] = [];
  const existingSlugs = new Set<string>();
  let successfulExtractions = 0;

  console.log('\n🔍 [SYNC] Processando tasks - APENAS COM NÚMERO INICIAL...');

  allTasks.forEach((task: any, index) => {
    const taskNumber = index + 1;
    
    if (!task.name || typeof task.name !== 'string') {
      skippedTasks.push(`${taskNumber}. Task sem nome válido (ID: ${task.gid})`);
      console.log(`⚠️ [TASK ${taskNumber}] SKIP: Task sem nome válido`);
      return;
    }

    // Tentar extrair empresa APENAS do título da tarefa
    const extractedCompany = extractCompanyFromTitle(task.name, true);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      successfulExtractions++;
      console.log(`✅ [TASK ${taskNumber}] "${task.name}" → "${extractedCompany}"`);
    } else {
      errorDetails.push(`${taskNumber}. "${task.name}" - Nenhum padrão reconhecido`);
      console.log(`❌ [TASK ${taskNumber}] "${task.name}" - Nenhum padrão reconhecido`);
    }
  });

  // 5. Converter para formato final
  const companies: AsanaCompany[] = Array.from(companySet)
    .filter(name => name && name.length > 0)
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

  console.log(`\n📊 [SYNC] ESTATÍSTICAS COMPLETAS:`);
  console.log(`   📋 Tasks processadas: ${allTasks.length}`);
  console.log(`   ✅ Extrações sucessos: ${successfulExtractions}`);
  console.log(`   ❌ Erros de extração: ${errorDetails.length}`);
  console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);
  console.log(`   🏢 Empresas únicas: ${companies.length}`);
  console.log(`   📈 Taxa de extração: ${((successfulExtractions / allTasks.length) * 100).toFixed(1)}%`);

  console.log(`\n🏢 [SYNC] Empresas extraídas:`);
  companies.forEach((company, i) => {
    console.log(`   ${i + 1}. "${company.name}" (slug: ${company.slug})`);
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
  console.log('🚀 [SYNC] Sincronização VERSÃO COMPLETA...');
  
  try {
    // 1. Verificar configurações
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    // 2. Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3. Buscar empresas do Asana
    const { companies, errorDetails, skippedTasks, totalTasks } = await fetchAsanaCompaniesAndReplaceAll();
    
    console.log(`\n🏢 [SYNC] ${companies.length} empresas prontas para sincronizar`);

    // 4. REPLACE ALL STRATEGY
    console.log('\n🔄 [SYNC] Executando REPLACE ALL...');

    // 4.1 Desativar todas as empresas existentes
    const { count: deactivatedCount, error: deactivateError } = await supabase
      .from('companies')
      .update({ 
        active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('active', true);

    if (deactivateError) {
      throw new Error(`Erro ao desativar empresas: ${deactivateError.message}`);
    }

    console.log(`✅ [SYNC] ${deactivatedCount || 'Todas'} empresas desativadas`);

    // 4.2 Inserir/reativar empresas atuais
    let createdCount = 0;
    let reactivatedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const company of companies) {
      try {
        // Verificar se empresa já existe
        const { data: existingCompany, error: fetchError } = await supabase
          .from('companies')
          .select('id, name, slug, active')
          .eq('name', company.name)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (existingCompany) {
          // Empresa existe: reativar e atualizar
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              display_name: company.displayName,
              slug: company.slug,
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCompany.id);

          if (updateError) {
            errorCount++;
            results.push({ company: company.name, status: 'error', error: updateError.message });
          } else {
            reactivatedCount++;
            results.push({ company: company.name, status: 'reactivated', slug: company.slug });
          }
        } else {
          // Empresa não existe: criar nova
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.slug,
              active: true
            });

          if (insertError) {
            errorCount++;
            results.push({ company: company.name, status: 'error', error: insertError.message });
          } else {
            createdCount++;
            results.push({ company: company.name, status: 'created', slug: company.slug });
          }
        }
      } catch (companyError) {
        errorCount++;
        const errorMsg = companyError instanceof Error ? companyError.message : 'Erro desconhecido';
        results.push({ company: company.name, status: 'error', error: errorMsg });
      }
    }

    // 5. Resultado final
    const finalResult: SyncResult = {
      success: true,
      message: `APENAS NÚMERO INICIAL: ${createdCount} criadas, ${reactivatedCount} reativadas, ${deactivatedCount || 0} desativadas, ${errorCount} erros`,
      stats: {
        totalProcessed: companies.length,
        created: createdCount,
        updated: reactivatedCount,
        deactivated: deactivatedCount || 0,
        errors: errorCount
      },
      companies: companies,
      details: results,
      errorDetails: errorDetails,
      skippedTasks
    };

    console.log(`\n🎯 [SYNC] RESULTADO FINAL COMPLETO:`);
    console.log(`   📊 Tasks do Asana: ${totalTasks}`);
    console.log(`   🏢 Empresas extraídas: ${companies.length}`);
    console.log(`   📈 Taxa de extração: ${((companies.length / totalTasks) * 100).toFixed(1)}%`);
    console.log(`   ✅ Criadas: ${createdCount}`);
    console.log(`   🔄 Reativadas: ${reactivatedCount}`);
    console.log(`   ⛔ Desativadas: ${deactivatedCount || 0}`);
    console.log(`   ❌ Erros: ${errorCount}`);

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('❌ [SYNC] ERRO FATAL:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json({
      success: false,
      error: 'Falha na sincronização',
      details: errorMessage,
      message: `Erro: ${errorMessage}`,
      stats: { totalProcessed: 0, created: 0, updated: 0, deactivated: 0, errors: 1 },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// ✅ GET - STATUS (mantido igual)
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis não configuradas');
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

    if (error) throw error;

    const companiesInDatabase = companies?.length || 0;
    const token = process.env.ASANA_ACCESS_TOKEN;
    const asanaConfigured = !!(token && token.trim() !== '' && !token.includes('your_'));

    return NextResponse.json({
      success: true,
      companiesInDatabase,
      companiesInAsana: asanaConfigured ? 'Configurado' : 'Não configurado',
      needsSync: companiesInDatabase === 0,
      asanaConfigured,
      companies: companies || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}