// src/app/api/sync-companies/route.ts - CORREÇÃO COMPLETA PARA SINCRONIZAÇÃO 100%
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para processar todas as empresas

interface AsanaCompany {
  id: string;
  name: string;
  displayName: string;
  slug: string;
}

interface SyncResult {
  success: boolean;
  stats: {
    totalTasks: number;
    totalProcessed: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: number;
    extractionRate: number;
  };
  companies?: AsanaCompany[];
  message: string;
  details?: any[];
  errorDetails?: string[];
  skippedTasks?: string[];
  diagnostics?: any;
  error?: string;
}

// ✅ EXTRAÇÃO COMPLETA - TODOS OS PADRÕES POSSÍVEIS
function extractCompanyFromTitle(title: string, debugMode = false): string | null {
  if (!title || typeof title !== 'string') {
    if (debugMode) console.log(`❌ [EXTRACT] Título inválido: ${JSON.stringify(title)}`);
    return null;
  }
  
  let cleanTitle = title.trim();
  if (debugMode) console.log(`🔍 [EXTRACT] Analisando: "${cleanTitle}"`);
  
  // ✅ STEP 1: Remover timestamps (múltiplos se necessário)
  const originalTitle = cleanTitle;
  let timestampRemoved = false;
  
  do {
    const beforeClean = cleanTitle;
    cleanTitle = cleanTitle.replace(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+[A-Z]{3,4}\s+/, '').trim();
    timestampRemoved = (cleanTitle !== beforeClean);
  } while (timestampRemoved && cleanTitle.match(/^\d{2}\/\d{2}\/\d{4}/));
  
  if (debugMode && cleanTitle !== originalTitle) {
    console.log(`   🧹 Removido timestamp(s): "${cleanTitle}"`);
  }
  
  // ✅ PADRÃO 1: NÚMERO + SÍMBOLO + EMPRESA (mais comum)
  // Cobre: "03°", "13.1º", "14°.1", "122º", "28º", etc
  const numberSymbolPattern = /^(\d+(?:\.\d+)?[°º](?:\.\d+)?)\s+([A-Z][A-Za-z\s&.\-']+?)(?:\s*\(.*\)|\s*-.*)?$/i;
  const match1 = cleanTitle.match(numberSymbolPattern);
  
  if (match1 && match1[2]) {
    const company = match1[2].trim();
    if (company.length >= 2 && company.length <= 60 && /[A-Za-z]/.test(company)) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 1] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 2: APENAS NÚMERO + EMPRESA (sem símbolos)
  // Cobre: "57 FREEZER CARNES", "123 EMPRESA TESTE", etc
  const numberOnlyPattern = /^(\d+)\s+([A-Z][A-Za-z\s&.\-']+?)(?:\s*\(.*\)|\s*-.*)?$/i;
  const match2 = cleanTitle.match(numberOnlyPattern);
  
  if (match2 && match2[2]) {
    const company = match2[2].trim();
    if (company.length >= 2 && company.length <= 60 && /[A-Za-z]/.test(company)) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 2] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 3: EMPRESA SEM NÚMERO NO INÍCIO (NOVO - CRÍTICO!)
  // Cobre: "EXPOFRUT (IMPORTAÇÃO DIRETA)", "EMPRESA TESTE (INFO)", etc
  const companyFirstPattern = /^([A-Z][A-Za-z\s&.\-']+?)(?:\s*\(.*\)|\s*-.*)?$/i;
  const match3 = cleanTitle.match(companyFirstPattern);
  
  if (match3 && match3[1] && !match3[1].match(/^\d/)) {
    const company = match3[1].trim();
    if (company.length >= 2 && company.length <= 60 && /[A-Za-z]/.test(company)) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 3] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 4: FALLBACK - QUALQUER PALAVRA MAIÚSCULA
  const fallbackPattern = /([A-Z]{2,}(?:\s+[A-Z\s&.\-']+)*)/;
  const match4 = cleanTitle.match(fallbackPattern);
  
  if (match4 && match4[1]) {
    const company = match4[1].trim();
    if (company.length >= 2 && company.length <= 40 && /[A-Za-z]/.test(company)) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 4] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  if (debugMode) console.log(`❌ [EXTRACT] Nenhum padrão reconhecido para: "${cleanTitle}"`);
  return null;
}

// ✅ FORMATAÇÃO INTELIGENTE DE EMPRESA
function formatCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espaços
    .split(/\s+/)
    .map(word => {
      // Manter siglas em maiúsculo (2-4 letras todas maiúsculas)
      if (word.length <= 4 && /^[A-Z]+$/.test(word)) {
        return word.toUpperCase();
      }
      // Manter nomes próprios capitalizados
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

// ✅ BUSCAR TODAS AS EMPRESAS DO ASANA (SEM LIMITES ARTIFICIAIS)
async function fetchAllAsanaCompanies(): Promise<{
  companies: AsanaCompany[];
  diagnostics: any;
  errorDetails: string[];
  skippedTasks: string[];
  totalTasks: number;
}> {
  console.log('🔄 [SYNC] Buscando TODAS as empresas do Asana - SEM LIMITES...');

  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token || token.trim() === '' || token.includes('your_')) {
    throw new Error('ASANA_ACCESS_TOKEN não configurado');
  }

  // 1. Buscar workspace
  const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(30000)
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
      signal: AbortSignal.timeout(30000)
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

  // 3. ✅ BUSCAR TODAS AS TASKS (REMOVIDO LIMITE ARTIFICIAL)
  console.log(`\n📋 [SYNC] Iniciando busca COMPLETA de tasks...`);
  const allTasks = [];
  let offset = undefined;
  let pageCount = 0;
  const maxPages = 200; // ✅ AUMENTADO DE 20 PARA 200 PÁGINAS
  let consecutiveEmptyPages = 0;
  
  do {
    pageCount++;
    console.log(`📄 [SYNC] Página ${pageCount}${offset ? ` (offset: ${offset})` : ' (primeira)'}...`);
    
    const endpoint = `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=name,custom_fields.name,custom_fields.display_value&limit=100${
      offset ? `&offset=${offset}` : ''
    }`;

    try {
      const tasksResponse = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(45000) // ✅ AUMENTADO TIMEOUT
      });

      if (!tasksResponse.ok) {
        console.error(`❌ [SYNC] Erro na página ${pageCount}: ${tasksResponse.status}`);
        
        // ✅ RETRY LOGIC PARA FALHAS DE REDE
        if (tasksResponse.status >= 500 || tasksResponse.status === 429) {
          console.log(`🔄 [SYNC] Tentando novamente em 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue; // Retry mesma página
        }
        
        throw new Error(`Erro fatal na API: ${tasksResponse.status}`);
      }

      const tasksData = await tasksResponse.json();
      const tasks = tasksData.data || [];
      
      console.log(`✅ [SYNC] Página ${pageCount}: ${tasks.length} tasks`);
      
      if (tasks.length === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 3) {
          console.log(`🏁 [SYNC] 3 páginas vazias consecutivas - finalizando`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
        allTasks.push(...tasks);
      }
      
      offset = tasksData.next_page?.offset;
      
      if (offset) {
        console.log(`🔄 [SYNC] Continuando para próxima página...`);
        // ✅ RATE LIMITING RESPEITOSO
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms entre requests
      } else {
        console.log(`🏁 [SYNC] Última página alcançada`);
      }
      
    } catch (error) {
      console.error(`❌ [SYNC] Erro na página ${pageCount}:`, error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`⏰ [SYNC] Timeout na página ${pageCount} - continuando...`);
        continue;
      }
      
      throw error;
    }
    
    // ✅ PROTEÇÃO CONTRA LOOP INFINITO (MUITO MAIOR)
    if (pageCount >= maxPages) {
      console.warn(`⚠️ [SYNC] Atingido limite de ${maxPages} páginas - parando`);
      break;
    }
    
  } while (offset && consecutiveEmptyPages < 3);

  console.log(`📊 [SYNC] BUSCA COMPLETA: ${allTasks.length} tasks em ${pageCount} páginas`);

  if (allTasks.length === 0) {
    throw new Error('Nenhuma task encontrada no projeto operacional');
  }

  // 4. ✅ PROCESSAR TODAS AS TASKS (SEM FILTRO DE "APENAS NÚMERO")
  const companySet = new Set<string>();
  const errorDetails: string[] = [];
  const skippedTasks: string[] = [];
  const existingSlugs = new Set<string>();
  let successfulExtractions = 0;

  console.log('\n🔍 [SYNC] Processando TODAS as tasks (removido filtro de número)...');

  allTasks.forEach((task: any, index) => {
    const taskNumber = index + 1;
    
    if (!task.name || typeof task.name !== 'string') {
      skippedTasks.push(`${taskNumber}. Task sem nome válido (ID: ${task.gid})`);
      return;
    }

    // ✅ EXTRAIR EMPRESA SEM RESTRIÇÃO DE FORMATO
    const extractedCompany = extractCompanyFromTitle(task.name, false);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      successfulExtractions++;
      
      // Log detalhado para primeira análise
      if (successfulExtractions <= 50) {
        console.log(`✅ [TASK ${taskNumber}] "${task.name}" → "${extractedCompany}"`);
      }
    } else {
      errorDetails.push(`${taskNumber}. "${task.name}" - Nenhum padrão reconhecido`);
      
      // Log erros iniciais para debug
      if (errorDetails.length <= 20) {
        console.log(`❌ [TASK ${taskNumber}] "${task.name}" - Não extraído`);
      }
    }
  });

  // 5. ✅ CONVERTER PARA FORMATO FINAL
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

  // ✅ DIAGNÓSTICOS COMPLETOS
  const diagnostics = {
    totalTasks: allTasks.length,
    totalPages: pageCount,
    successfulExtractions,
    uniqueCompanies: companies.length,
    extractionRate: ((successfulExtractions / allTasks.length) * 100).toFixed(1),
    deduplicationRate: ((successfulExtractions - companies.length) / successfulExtractions * 100).toFixed(1),
    errorRate: ((errorDetails.length / allTasks.length) * 100).toFixed(1),
    skippedTasks: skippedTasks.length
  };

  console.log(`\n📊 [SYNC] ESTATÍSTICAS FINAIS COMPLETAS:`);
  console.log(`   📋 Tasks processadas: ${allTasks.length}`);
  console.log(`   📄 Páginas buscadas: ${pageCount}`);
  console.log(`   ✅ Extrações sucessos: ${successfulExtractions}`);
  console.log(`   🏢 Empresas únicas: ${companies.length}`);
  console.log(`   📈 Taxa de extração: ${diagnostics.extractionRate}%`);
  console.log(`   🔄 Taxa de deduplicação: ${diagnostics.deduplicationRate}%`);
  console.log(`   ❌ Taxa de erro: ${diagnostics.errorRate}%`);
  console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);

  console.log(`\n🏢 [SYNC] Empresas extraídas para sincronização:`);
  companies.forEach((company, i) => {
    console.log(`   ${i + 1}. "${company.name}" (slug: ${company.slug})`);
  });

  return {
    companies,
    diagnostics,
    errorDetails,
    skippedTasks,
    totalTasks: allTasks.length
  };
}

// ✅ POST - SINCRONIZAÇÃO COMPLETA
export async function POST() {
  const startTime = Date.now();
  console.log('🚀 [SYNC] Sincronização COMPLETA - VERSÃO SEM LIMITES...');
  
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

    // 3. ✅ BUSCAR TODAS AS EMPRESAS (SEM LIMITES)
    const { companies, diagnostics, errorDetails, skippedTasks, totalTasks } = await fetchAllAsanaCompanies();
    
    console.log(`\n🏢 [SYNC] ${companies.length} empresas prontas para sincronizar`);

    // 4. ✅ STRATEGY: REPLACE ALL
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

    // 4.2 ✅ INSERIR/REATIVAR EMPRESAS COM BATCH PROCESSING
    let createdCount = 0;
    let reactivatedCount = 0;
    let errorCount = 0;
    const results = [];

    console.log(`📦 [SYNC] Processando ${companies.length} empresas...`);

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

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // 5. ✅ RESULTADO FINAL COM DIAGNÓSTICOS COMPLETOS
    const finalResult: SyncResult = {
      success: true,
      message: `✅ Sincronização completa: ${createdCount} criadas, ${reactivatedCount} reativadas, ${deactivatedCount || 0} desativadas, ${errorCount} erros`,
      stats: {
        totalTasks,
        totalProcessed: companies.length,
        created: createdCount,
        updated: reactivatedCount,
        deactivated: deactivatedCount || 0,
        errors: errorCount,
        extractionRate: parseFloat(diagnostics.extractionRate)
      },
      companies: companies,
      details: results,
      errorDetails: errorDetails,
      skippedTasks,
      diagnostics: {
        ...diagnostics,
        syncDuration: `${duration}s`,
        totalActiveCompanies: createdCount + reactivatedCount,
        syncTimestamp: new Date().toISOString()
      }
    };

    console.log(`\n🎯 [SYNC] RESULTADO FINAL COMPLETO:`);
    console.log(`   ⏱️ Duração: ${duration}s`);
    console.log(`   📊 Tasks do Asana: ${totalTasks}`);
    console.log(`   🏢 Empresas extraídas: ${companies.length}`);
    console.log(`   📈 Taxa de extração: ${diagnostics.extractionRate}%`);
    console.log(`   ✅ Criadas no banco: ${createdCount}`);
    console.log(`   🔄 Reativadas no banco: ${reactivatedCount}`);
    console.log(`   ⛔ Desativadas: ${deactivatedCount || 0}`);
    console.log(`   ❌ Erros no banco: ${errorCount}`);
    console.log(`   🏪 Total final ativo: ${createdCount + reactivatedCount} empresas`);

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('❌ [SYNC] ERRO FATAL:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Falha na sincronização',
      stats: {
        totalTasks: 0,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        errors: 1,
        extractionRate: 0
      }
    }, { status: 500 });
  }
}

// ✅ GET - STATUS DA SINCRONIZAÇÃO
export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Contar empresas ativas no banco
    const { count: companiesInDatabase, error } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      companiesInDatabase: companiesInDatabase || 0,
      asanaConfigured: !!process.env.ASANA_ACCESS_TOKEN,
      needsSync: (companiesInDatabase || 0) < 15, // Se menos de 15, precisa sync
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [SYNC] Erro ao verificar status:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      companiesInDatabase: 0,
      asanaConfigured: false,
      needsSync: true
    }, { status: 500 });
  }
}