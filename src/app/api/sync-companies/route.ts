// src/app/api/sync-companies/route.ts - CORREÇÃO DEFINITIVA DA EXTRAÇÃO
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

// ✅ EXTRAÇÃO CORRIGIDA COM MÚLTIPLOS PADRÕES
function extractCompanyFromTitle(title: string, debugMode = true): string | null {
  if (!title || typeof title !== 'string') {
    if (debugMode) console.log(`❌ [EXTRACT] Título inválido: ${JSON.stringify(title)}`);
    return null;
  }
  
  const cleanTitle = title.trim();
  if (debugMode) console.log(`🔍 [EXTRACT] Analisando: "${cleanTitle}"`);
  
  // ✅ PADRÃO 1: Número com º + empresa + (opcional detalhes)
  // Exemplos: "03º ATACAMAX", "13º FIBRASA (VAN DAM - ES)", "14.2º FIBRASA"
  const pattern1 = /^(\d+(?:\.\d+)?º)\s+([A-Z][A-Z\s&.\-]+?)(?:\s*\(.*\))?$/i;
  const match1 = cleanTitle.match(pattern1);
  
  if (match1 && match1[2]) {
    const company = match1[2].trim();
    if (company.length >= 2 && company.length <= 50) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 1] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 2: Apenas número + empresa + (opcional detalhes)  
  // Exemplos: "57 FREEZER CARNES", "02 FRUTA PLUSS"
  const pattern2 = /^(\d+(?:\.\d+)?)\s+([A-Z][A-Z\s&.\-]+?)(?:\s*\(.*\))?$/i;
  const match2 = cleanTitle.match(pattern2);
  
  if (match2 && match2[2]) {
    const company = match2[2].trim();
    if (company.length >= 2 && company.length <= 50) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 2] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 3: Apenas empresa + (opcional detalhes)
  // Exemplos: "DRAWBACK RANCAGUA", "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)", "AGRIVALE (01.25 DRAWBACK)"
  const pattern3 = /^([A-Z][A-Z\s&.\-]+?)(?:\s*\([^)]*\))?$/i;
  const match3 = cleanTitle.match(pattern3);
  
  if (match3 && match3[1]) {
    const company = match3[1].trim();
    
    // Validar que não é apenas um número ou código
    if (company.length >= 2 && 
        company.length <= 50 && 
        !/^\d+[\.\d]*º?$/.test(company) && // Não é só número
        /[A-Z]{2,}/.test(company)) { // Tem pelo menos 2 letras maiúsculas
      
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 3] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  // ✅ PADRÃO 4: Fallback - primeira sequência de letras maiúsculas
  // Para casos edge que não se encaixam nos padrões acima
  const pattern4 = /([A-Z]{2,}(?:\s+[A-Z]+)*)/;
  const match4 = cleanTitle.match(pattern4);
  
  if (match4 && match4[1]) {
    const company = match4[1].trim();
    if (company.length >= 2 && company.length <= 30) {
      const formatted = formatCompanyName(company);
      if (debugMode) console.log(`✅ [PATTERN 4 FALLBACK] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    }
  }
  
  if (debugMode) console.log(`❌ [EXTRACT] Nenhum padrão reconhecido para: "${cleanTitle}"`);
  return null;
}

// ✅ FORMATAÇÃO MELHORADA DE NOMES
function formatCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Múltiplos espaços para um
    .split(/\s+/)
    .map(word => {
      // Manter siglas completas em maiúsculo (2-4 letras)
      if (word.length <= 4 && /^[A-Z]+$/i.test(word)) {
        return word.toUpperCase();
      }
      // Capitalizar primeira letra para palavras maiores
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// ✅ GERAR SLUG ÚNICO COM TIMESTAMP
function generateUniqueSlug(name: string, existingSlugs: Set<string>): string {
  let baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (!baseSlug) {
    baseSlug = 'empresa';
  }
  
  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug);
    return baseSlug;
  }
  
  const timestamp = Date.now().toString().slice(-6);
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${timestamp}-${counter}`;
  
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${timestamp}-${counter}`;
  }
  
  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
}

// ✅ BUSCAR EMPRESAS COM EXTRAÇÃO CORRIGIDA
async function fetchAsanaCompaniesAndReplaceAll(): Promise<{
  companies: AsanaCompany[];
  errorDetails: string[];
  skippedTasks: string[];
  totalTasks: number;
}> {
  console.log('🔄 [SYNC] Buscando empresas do Asana com REGEX CORRIGIDA...');

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

  // 4. Extrair empresas com REGEX CORRIGIDA
  const companySet = new Set<string>();
  const errorDetails: string[] = [];
  const skippedTasks: string[] = [];
  const existingSlugs = new Set<string>();
  let successfulExtractions = 0;

  console.log('\n🔍 [SYNC] Processando tasks com MÚLTIPLOS PADRÕES...');

  allTasks.forEach((task: any, index) => {
    const taskNumber = index + 1;
    
    if (!task.name || typeof task.name !== 'string') {
      skippedTasks.push(`${taskNumber}. Task sem nome válido (ID: ${task.gid})`);
      console.log(`⚠️ [TASK ${taskNumber}] SKIP: Task sem nome válido`);
      return;
    }

    // Tentar extrair empresa do título com múltiplos padrões
    const extractedCompany = extractCompanyFromTitle(task.name, true);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      successfulExtractions++;
      console.log(`✅ [TASK ${taskNumber}] "${task.name}" → "${extractedCompany}"`);
    } else {
      errorDetails.push(`${taskNumber}. "${task.name}" - Nenhum padrão reconhecido`);
      console.log(`❌ [TASK ${taskNumber}] "${task.name}" - Nenhum padrão reconhecido`);
    }

    // Verificar custom field "EMPRESA" como backup
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      const empresaField = task.custom_fields.find((field: any) => 
        field.name === 'EMPRESA' && field.display_value
      );
      
      if (empresaField?.display_value) {
        const fieldCompany = formatCompanyName(empresaField.display_value.toString().trim());
        if (fieldCompany.length >= 1 && fieldCompany.length <= 50) {
          companySet.add(fieldCompany);
          console.log(`✅ [TASK ${taskNumber}] CUSTOM FIELD: "${fieldCompany}"`);
        }
      }
    }
  });

  // 5. Converter para formato final com slugs únicos
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

  console.log(`\n📊 [SYNC] ESTATÍSTICAS DE EXTRAÇÃO CORRIGIDA:`);
  console.log(`   📋 Tasks processadas: ${allTasks.length}`);
  console.log(`   ✅ Extrações sucessos: ${successfulExtractions}`);
  console.log(`   ❌ Erros de extração: ${errorDetails.length}`);
  console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);
  console.log(`   🏢 Empresas únicas: ${companies.length}`);
  console.log(`   📈 Taxa de sucesso: ${((successfulExtractions / allTasks.length) * 100).toFixed(1)}%`);

  console.log(`\n🏢 [SYNC] Empresas extraídas para sincronização:`);
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
  console.log('🚀 [SYNC] Sincronização com REGEX CORRIGIDA...');
  
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

    // 3. Buscar empresas do Asana com regex corrigida
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
      message: `REGEX CORRIGIDA: ${createdCount} criadas, ${reactivatedCount} reativadas, ${deactivatedCount || 0} desativadas, ${errorCount} erros`,
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

    console.log(`\n🎯 [SYNC] RESULTADO FINAL COM REGEX CORRIGIDA:`);
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