// src/app/api/sync-companies/route.ts - VERSÃO CORRIGIDA COM EXTRAÇÃO PRECISA
import { NextResponse } from 'next/server';

// ✅ FORCE VERCEL COMPATIBILITY
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ✅ INTERFACES
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
  error?: string;
}

// ✅ EXTRAÇÃO PRECISA BASEADA NOS PADRÕES REAIS DO ASANA
function extractCompanyFromTitle(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  const cleanTitle = title.trim();
  
  // PADRÃO PRINCIPAL: [NÚMERO]º [NOME_EMPRESA] [(DETALHES_OPCIONAIS)]
  // Exemplos suportados:
  // "15º NATURALLY" → "Naturally"
  // "87º Duri (GENERADOR - MARÍTIMO)" → "Duri" 
  // "14.2 FIBRASA (INTRAVIS - ES: ALEMANHA)" → "Fibrasa"
  // "02º R A B (BATATA)" → "R A B"
  // "02º REI DOS PARA-BRISAS" → "Rei Dos Para-Brisas"
  
  const mainPattern = /^\d+(\.\d+)?º\s+([A-Z][A-Z0-9\s\-&.]+?)(?:\s*\(|$)/i;
  const match = cleanTitle.match(mainPattern);
  
  if (match && match[2]) {
    let companyName = match[2].trim();
    
    // Remover caracteres especiais do final
    companyName = companyName.replace(/[\s\-.,]+$/, '');
    
    // Validar tamanho
    if (companyName.length >= 1 && companyName.length <= 50) {
      return formatCompanyName(companyName);
    }
  }
  
  return null;
}

// ✅ FORMATAÇÃO CORRETA DO NOME DA EMPRESA
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

// ✅ BUSCAR EMPRESAS REAIS DO ASANA COM EXTRAÇÃO CORRIGIDA
async function fetchAsanaCompaniesReal(): Promise<AsanaCompany[]> {
  console.log('🔄 [SYNC] Buscando empresas REAIS do Asana...');

  // 1. Validar token
  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token || token.trim() === '' || token.includes('your_')) {
    throw new Error('ASANA_ACCESS_TOKEN não configurado ou inválido');
  }

  // 2. Buscar workspace
  const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!workspacesResponse.ok) {
    throw new Error(`Erro ao buscar workspaces: ${workspacesResponse.status} ${workspacesResponse.statusText}`);
  }
  
  const workspacesData = await workspacesResponse.json();
  const workspace = workspacesData.data?.[0];

  if (!workspace) {
    throw new Error('Nenhum workspace encontrado no Asana');
  }

  console.log(`✅ [SYNC] Workspace encontrado: ${workspace.name}`);

  // 3. Buscar projeto operacional
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
    throw new Error('Projeto "operacional" não encontrado no Asana');
  }

  console.log(`✅ [SYNC] Projeto encontrado: ${operationalProject.name}`);

  // 4. Buscar tasks do projeto (com paginação)
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

  console.log(`📊 [SYNC] ${allTasks.length} tasks encontradas no Asana`);

  if (allTasks.length === 0) {
    throw new Error('Nenhuma task encontrada no projeto operacional');
  }

  // 5. Extrair empresas das tasks (VERSÃO CORRIGIDA)
  const companySet = new Set<string>();
  const extractionLog: string[] = [];
  
  allTasks.forEach((task: any, index) => {
    if (!task.name) return;

    // ✅ USAR A NOVA FUNÇÃO DE EXTRAÇÃO
    const titleCompany = extractCompanyFromTitle(task.name);
    if (titleCompany) {
      companySet.add(titleCompany);
      extractionLog.push(`${index + 1}. "${task.name}" → "${titleCompany}"`);
    }

    // ✅ TAMBÉM VERIFICAR CUSTOM FIELD "EMPRESA"
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      const empresaField = task.custom_fields.find((field: any) => 
        field.name === 'EMPRESA' && field.display_value
      );
      
      if (empresaField?.display_value) {
        const fieldCompany = formatCompanyName(empresaField.display_value.toString().trim());
        if (fieldCompany.length >= 1 && fieldCompany.length <= 50) {
          companySet.add(fieldCompany);
          extractionLog.push(`${index + 1}. Custom field "EMPRESA" → "${fieldCompany}"`);
        }
      }
    }
  });

  // 6. Log das extrações (para debug)
  console.log(`📋 [SYNC] Extrações realizadas (primeiras 10):`);
  extractionLog.slice(0, 10).forEach(log => console.log(`   ${log}`));
  if (extractionLog.length > 10) {
    console.log(`   ... e mais ${extractionLog.length - 10} extrações`);
  }

  // 7. Converter para formato final
  const companies: AsanaCompany[] = Array.from(companySet)
    .filter(name => name && name !== 'Não Identificado')
    .map(name => ({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: name,
      displayName: name
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  console.log(`✅ [SYNC] ${companies.length} empresas únicas extraídas:`);
  companies.forEach((company, i) => {
    console.log(`   ${i + 1}. ${company.name}`);
  });

  if (companies.length === 0) {
    throw new Error('Nenhuma empresa válida foi extraída das tasks do Asana');
  }

  return companies;
}

// ✅ POST - SINCRONIZAR EMPRESAS (ASANA ONLY COM EXTRAÇÃO CORRIGIDA)
export async function POST() {
  console.log('🚀 [SYNC] Sincronização ASANA ONLY iniciada (versão corrigida)...');
  
  try {
    // 1. Verificar variáveis Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    console.log('✅ [SYNC] Variáveis Supabase verificadas');

    // 2. Buscar empresas REAIS do Asana (com extração corrigida)
    const asanaCompanies = await fetchAsanaCompaniesReal();
    
    console.log(`🏢 [SYNC] ${asanaCompanies.length} empresas obtidas do Asana`);

    // 3. Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ [SYNC] Conexão Supabase estabelecida');

    // 4. Sincronizar cada empresa
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const company of asanaCompanies) {
      try {
        // Verificar se empresa já existe (por nome)
        const { data: existing, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('name', company.name)
          .single();

        if (existing && !fetchError) {
          // Atualizar empresa existente
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
            console.error(`❌ [SYNC] Erro ao atualizar ${company.name}:`, updateError);
            errorCount++;
            results.push({ 
              company: company.name, 
              status: 'error', 
              error: updateError.message 
            });
          } else {
            console.log(`✅ [SYNC] Atualizada: ${company.name}`);
            updatedCount++;
            results.push({ company: company.name, status: 'updated' });
          }
        } else {
          // Criar nova empresa
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.id,
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
        results.push({ 
          company: company.name, 
          status: 'error', 
          error: companyError instanceof Error ? companyError.message : 'Erro desconhecido'
        });
      }
    }

    // 5. Resultado final
    const finalResult: SyncResult = {
      success: true,
      message: `Sincronização Asana concluída: ${createdCount} criadas, ${updatedCount} atualizadas, ${errorCount} erros`,
      stats: {
        totalProcessed: asanaCompanies.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      companies: asanaCompanies,
      details: results
    };

    console.log(`🎯 [SYNC] Sincronização concluída:`, finalResult.message);
    return NextResponse.json(finalResult);

  } catch (error) {
    console.error('❌ [SYNC] ERRO FATAL na sincronização:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return NextResponse.json({
      success: false,
      error: 'Falha na sincronização com Asana',
      details: errorMessage,
      message: `Erro: ${errorMessage}`,
      stats: { totalProcessed: 0, created: 0, updated: 0, errors: 1 },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// ✅ GET - STATUS DAS EMPRESAS
export async function GET() {
  try {
    console.log('🔍 [SYNC] Verificando status das empresas...');
    
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

    console.log(`📊 [SYNC] Status: ${companiesInDatabase} empresas no banco, Asana: ${asanaConfigured ? 'configurado' : 'não configurado'}`);

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
    console.error('❌ [SYNC] Erro ao verificar status:', error);
    
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