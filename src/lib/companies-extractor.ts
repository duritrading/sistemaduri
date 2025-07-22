// src/lib/companies-extractor.ts - EXTRATOR DIRETO DE EMPRESAS DO ASANA
interface AsanaCompany {
  id: string;
  name: string;
  displayName: string;
}

interface TrackingData {
  title?: string;
  name?: string;
  company?: string;
  business?: {
    empresa?: string;
  };
  customFields?: {
    EMPRESA?: string;
  };
}

/**
 * Extrai nomes de empresas de títulos do Asana seguindo os padrões:
 * - "122º WCB" → "WCB"
 * - "28º AGRIVALE" → "AGRIVALE" 
 * - "17º AMZ (IMPORTAÇÃO)" → "AMZ"
 * - "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)" → "EXPOFRUT"
 */
function extractCompanyFromTitle(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  // Padrões identificados nos dados reais
  const patterns = [
    // "122º WCB" ou "28º AGRIVALE"
    /^\d+º\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s*\(|$)/i,
    
    // "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)"
    /^([A-Z][A-Z0-9\s&.-]+?)\s*\(/i,
    
    // "WCB - Algo mais"
    /^([A-Z][A-Z0-9\s&.-]+?)\s*[-–]/i,
    
    // Fallback: primeira palavra em maiúsculo
    /^([A-Z][A-Z0-9&.-]*)/
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s&.-]/g, '')
        .trim();
      
      if (company.length >= 2 && company.length <= 50) {
        return company.toUpperCase();
      }
    }
  }
  
  return null;
}

/**
 * Busca dados diretamente do Asana sem depender da API interna
 */
export async function fetchAsanaCompanies(): Promise<AsanaCompany[]> {
  try {
    console.log('🔄 Buscando dados diretamente do Asana...');

    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token || token.includes('your_')) {
      throw new Error('Token Asana não configurado');
    }

    // 1. Buscar workspace
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!workspacesResponse.ok) {
      throw new Error(`Erro ao buscar workspaces: ${workspacesResponse.status}`);
    }
    
    const workspacesData = await workspacesResponse.json();
    const workspace = workspacesData.data?.[0];

    if (!workspace) {
      throw new Error('Nenhum workspace encontrado');
    }

    // 2. Buscar projeto operacional
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const projectsData = await projectsResponse.json();
    const operationalProject = projectsData.data?.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      throw new Error('Projeto operacional não encontrado');
    }

    // 3. Buscar tarefas do projeto
    const tasksResponse = await fetch(
      `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=name,custom_fields.name,custom_fields.display_value&limit=1000`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!tasksResponse.ok) {
      throw new Error(`Erro ao buscar tasks: ${tasksResponse.status}`);
    }

    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data || [];

    console.log(`📊 Processando ${tasks.length} tasks do Asana...`);

    // 4. Extrair empresas das tarefas
    const companySet = new Set<string>();
    
    tasks.forEach((task: any) => {
      if (!task.name) return;

      // Extrair do título
      const titleCompany = extractCompanyFromTitle(task.name);
      if (titleCompany) {
        companySet.add(titleCompany);
      }

      // Extrair dos custom fields
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        const empresaField = task.custom_fields.find((field: any) => 
          field.name === 'EMPRESA' && field.display_value
        );
        
        if (empresaField?.display_value) {
          const fieldCompany = empresaField.display_value.toString().trim().toUpperCase();
          if (fieldCompany.length >= 2 && fieldCompany.length <= 50) {
            companySet.add(fieldCompany);
          }
        }
      }
    });

    // 5. Converter para formato final
    const companies: AsanaCompany[] = Array.from(companySet)
      .filter(name => name && name !== 'NÃO_IDENTIFICADO')
      .map(name => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: name,
        displayName: name.split(/[_\-\s]+/)
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ')
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    console.log(`✅ Extraídas ${companies.length} empresas do Asana:`, 
      companies.map(c => c.name).join(', '));

    return companies;

  } catch (error) {
    console.error('❌ Erro ao buscar empresas do Asana:', error);
    throw error;
  }
}

/**
 * Sincroniza empresas do Asana com o Supabase
 */
export async function syncCompaniesToSupabase(): Promise<{
  success: boolean;
  stats: { totalProcessed: number; created: number; updated: number; errors: number };
  message: string;
  details?: any[];
}> {
  try {
    // 1. Buscar empresas do Asana
    const asanaCompanies = await fetchAsanaCompanies();
    
    if (asanaCompanies.length === 0) {
      return {
        success: false,
        stats: { totalProcessed: 0, created: 0, updated: 0, errors: 0 },
        message: 'Nenhuma empresa encontrada no Asana'
      };
    }

    // 2. Conectar ao Supabase
    const { supabase } = await import('@/lib/supabase');

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    // 3. Sincronizar cada empresa
    for (const company of asanaCompanies) {
      try {
        // Verificar se já existe
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
            console.error(`❌ Erro ao atualizar ${company.name}:`, updateError);
            errorCount++;
            results.push({ company: company.name, status: 'error', error: updateError.message });
          } else {
            console.log(`✅ Atualizada: ${company.name}`);
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
            console.error(`❌ Erro ao criar ${company.name}:`, insertError);
            errorCount++;
            results.push({ company: company.name, status: 'error', error: insertError.message });
          } else {
            console.log(`✅ Criada: ${company.name}`);
            createdCount++;
            results.push({ company: company.name, status: 'created' });
          }
        }
      } catch (error) {
        console.error(`❌ Erro geral para ${company.name}:`, error);
        errorCount++;
        results.push({ 
          company: company.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        });
      }
    }

    const message = `Sincronização concluída: ${createdCount} criadas, ${updatedCount} atualizadas, ${errorCount} erros`;
    
    return {
      success: true,
      stats: {
        totalProcessed: asanaCompanies.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      message,
      details: results
    };

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return {
      success: false,
      stats: { totalProcessed: 0, created: 0, updated: 0, errors: 0 },
      message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}