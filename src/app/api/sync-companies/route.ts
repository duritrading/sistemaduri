// src/app/api/sync-companies/route.ts - CORREÇÃO FINAL DEFINITIVA
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

// ✅ EXTRAÇÃO CORRIGIDA BASEADA NOS PADRÕES REAIS DO SEU ASANA
function extractCompanyFromTitle(title: string, debugMode = true): string | null {
  if (!title || typeof title !== 'string') {
    if (debugMode) console.log(`❌ [EXTRACT] Título inválido: ${JSON.stringify(title)}`);
    return null;
  }
  
  const cleanTitle = title.trim();
  
  // ✅ PADRÃO ÚNICO SIMPLIFICADO baseado nos seus dados reais
  // Captura: "122º WCB", "02º REI DOS PARA-BRISAS", "651º UNIVAR (PO 452751642)", etc.
  const mainPattern = /^(\d+(\.\d+)?º)\s+(.+?)(\s*\(.*\))?$/;
  
  const match = cleanTitle.match(mainPattern);
  
  if (match) {
    const numero = match[1];           // "122º", "02º", "651º"
    const nomeCompleto = match[3];     // "WCB", "REI DOS PARA-BRISAS", "UNIVAR"
    const detalhes = match[4] || '';   // "(PO 452751642)" ou vazio
    
    if (debugMode) {
      console.log(`🔍 [EXTRACT] Analisando: "${cleanTitle}"`);
      console.log(`   - Número: "${numero}"`);
      console.log(`   - Nome: "${nomeCompleto}"`);
      console.log(`   - Detalhes: "${detalhes}"`);
    }
    
    // Limpar e validar o nome da empresa
    let companyName = nomeCompleto.trim();
    
    // Remover caracteres especiais do final se houver
    companyName = companyName.replace(/[\s\-.,_]+$/, '');
    
    // Validar tamanho
    if (companyName.length >= 1 && companyName.length <= 50) {
      const formatted = formatCompanyName(companyName);
      if (debugMode) console.log(`✅ [EXTRACT] "${cleanTitle}" → "${formatted}"`);
      return formatted;
    } else {
      if (debugMode) console.log(`❌ [EXTRACT] Nome inválido (${companyName.length} chars): "${companyName}"`);
      return null;
    }
  }
  
  if (debugMode) console.log(`❌ [EXTRACT] Padrão não reconhecido: "${cleanTitle}"`);
  return null;
}

function formatCompanyName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      // Manter siglas em maiúsculo (3 letras ou menos)
      if (word.length <= 3 && /^[A-Z]+$/i.test(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Capitalizar primeira letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ✅ GERAR SLUG ÚNICO COM TIMESTAMP PARA GARANTIR UNICIDADE
function generateUniqueSlug(name: string, existingSlugs: Set<string>): string {
  // Slug base limpo
  let baseSlug = name
    .toLowerCase()
    .normalize('NFD')                    // Normalizar caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')     // Remover acentos
    .replace(/[^a-z0-9\s]/g, '')         // Só letras, números e espaços
    .replace(/\s+/g, '-')                // Espaços para hífens
    .replace(/-+/g, '-')                 // Múltiplos hífens para um
    .replace(/^-|-$/g, '');              // Remover hífens do início/fim
  
  // Se slug base está vazio, usar fallback
  if (!baseSlug) {
    baseSlug = 'empresa';
  }
  
  // Se slug não existe, usar ele
  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug);
    return baseSlug;
  }
  
  // Se existe, usar timestamp + contador para garantir unicidade absoluta
  const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${timestamp}-${counter}`;
  
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${timestamp}-${counter}`;
  }
  
  existingSlugs.add(uniqueSlug);
  return uniqueSlug;
}

// ✅ BUSCAR EMPRESAS COM STRATEGY REPLACE ALL COMPLETA
async function fetchAsanaCompaniesAndReplaceAll(): Promise<{
  companies: AsanaCompany[];
  errorDetails: string[];
  skippedTasks: string[];
  totalTasks: number;
}> {
  console.log('🔄 [SYNC] Buscando empresas do Asana (FINAL FIX)...');

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

  // 4. Extrair empresas com lógica corrigida
  const companySet = new Set<string>();
  const errorDetails: string[] = [];
  const skippedTasks: string[] = [];
  const existingSlugs = new Set<string>();
  let successfulExtractions = 0;

  console.log('\n🔍 [SYNC] Processando tasks com regex corrigida...');

  allTasks.forEach((task: any, index) => {
    const taskNumber = index + 1;
    
    console.log(`\n📝 [TASK ${taskNumber}/${allTasks.length}] "${task.name}"`);
    
    if (!task.name || typeof task.name !== 'string') {
      skippedTasks.push(`${taskNumber}. Task sem nome válido (ID: ${task.gid})`);
      console.log(`   ⚠️ SKIP: Task sem nome válido`);
      return;
    }

    // Tentar extrair empresa do título
    const extractedCompany = extractCompanyFromTitle(task.name, true);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      successfulExtractions++;
      console.log(`   ✅ SUCESSO: "${extractedCompany}"`);
    } else {
      errorDetails.push(`${taskNumber}. "${task.name}" - Padrão não reconhecido`);
      console.log(`   ❌ ERRO: Padrão não reconhecido`);
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
          console.log(`   ✅ CUSTOM FIELD: "${fieldCompany}"`);
        }
      }
    }
  });

  // 5. Converter para formato final com slugs únicos garantidos
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

  console.log(`\n📊 [SYNC] ESTATÍSTICAS DE EXTRAÇÃO:`);
  console.log(`   📋 Tasks processadas: ${allTasks.length}`);
  console.log(`   ✅ Extrações sucessos: ${successfulExtractions}`);
  console.log(`   ❌ Erros de extração: ${errorDetails.length}`);
  console.log(`   ⚠️ Tasks ignoradas: ${skippedTasks.length}`);
  console.log(`   🏢 Empresas únicas: ${companies.length}`);

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

// ✅ POST - SINCRONIZAÇÃO REPLACE ALL DEFINITIVA
export async function POST() {
  console.log('🚀 [SYNC] Sincronização REPLACE ALL DEFINITIVA...');
  
  try {
    // 1. Verificar configurações
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    console.log('✅ [SYNC] Configurações verificadas');

    // 2. Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ [SYNC] Conexão Supabase estabelecida');

    // 3. Buscar empresas do Asana e extrair corretamente
    const { companies, errorDetails, skippedTasks, totalTasks } = await fetchAsanaCompaniesAndReplaceAll();
    
    console.log(`\n🏢 [SYNC] ${companies.length} empresas prontas para sincronizar`);

    // 4. ✅ IMPLEMENTAR REPLACE ALL STRATEGY
    console.log('\n🔄 [SYNC] Executando REPLACE ALL...');

    // 4.1 PRIMEIRO: Desativar todas as empresas existentes
    console.log('📝 [SYNC] Passo 1: Desativando todas as empresas...');
    
    const { count: deactivatedCount, error: deactivateError } = await supabase
      .from('companies')
      .update({ 
        active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('active', true);

    if (deactivateError) {
      console.error('❌ [SYNC] Erro ao desativar empresas:', deactivateError);
      throw new Error(`Erro ao desativar empresas: ${deactivateError.message}`);
    }

    console.log(`✅ [SYNC] ${deactivatedCount || 'Todas'} empresas desativadas`);

    // 4.2 SEGUNDO: Inserir/reativar apenas empresas da sincronização atual
    console.log('\n📝 [SYNC] Passo 2: Inserindo/reativando empresas atuais...');
    
    let createdCount = 0;
    let reactivatedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const company of companies) {
      try {
        console.log(`\n🔄 [SYNC] Processando: "${company.name}"`);
        
        // Verificar se empresa já existe (por nome exato)
        const { data: existingCompany, error: fetchError } = await supabase
          .from('companies')
          .select('id, name, slug, active')
          .eq('name', company.name)
          .maybeSingle();

        if (fetchError) {
          console.error(`❌ [SYNC] Erro ao buscar "${company.name}":`, fetchError);
          throw fetchError;
        }

        if (existingCompany) {
          // Empresa existe: reativar e atualizar
          console.log(`   📝 Reativando empresa existente...`);
          
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
            console.error(`❌ [SYNC] Erro ao reativar "${company.name}":`, updateError);
            errorCount++;
            results.push({ 
              company: company.name, 
              status: 'error', 
              error: updateError.message 
            });
          } else {
            console.log(`   ✅ Reativada: "${company.name}"`);
            reactivatedCount++;
            results.push({ 
              company: company.name, 
              status: 'reactivated',
              slug: company.slug
            });
          }
        } else {
          // Empresa não existe: criar nova
          console.log(`   📝 Criando nova empresa...`);
          
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.slug,
              active: true
            });

          if (insertError) {
            console.error(`❌ [SYNC] Erro ao criar "${company.name}":`, insertError);
            errorCount++;
            results.push({ 
              company: company.name, 
              status: 'error', 
              error: insertError.message 
            });
          } else {
            console.log(`   ✅ Criada: "${company.name}"`);
            createdCount++;
            results.push({ 
              company: company.name, 
              status: 'created',
              slug: company.slug
            });
          }
        }
      } catch (companyError) {
        console.error(`❌ [SYNC] Erro geral para "${company.name}":`, companyError);
        errorCount++;
        const errorMsg = companyError instanceof Error ? companyError.message : 'Erro desconhecido';
        results.push({ 
          company: company.name, 
          status: 'error', 
          error: errorMsg 
        });
      }
    }

    // 5. Resultado final
    const finalResult: SyncResult = {
      success: true,
      message: `REPLACE ALL concluído: ${createdCount} criadas, ${reactivatedCount} reativadas, ${deactivatedCount || 0} desativadas, ${errorCount} erros`,
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

    console.log(`\n🎯 [SYNC] RESULTADO FINAL:`);
    console.log(`   📊 Tasks do Asana: ${totalTasks}`);
    console.log(`   🏢 Empresas extraídas: ${companies.length}`);
    console.log(`   ✅ Criadas: ${createdCount}`);
    console.log(`   🔄 Reativadas: ${reactivatedCount}`);
    console.log(`   ⛔ Desativadas: ${deactivatedCount || 0}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 SINCRONIZAÇÃO 100% SUCESSFUL!');
      console.log('✅ Database agora reflete exatamente as empresas do Asana');
    }

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

// ✅ GET - STATUS
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
    console.error('❌ [GET] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}