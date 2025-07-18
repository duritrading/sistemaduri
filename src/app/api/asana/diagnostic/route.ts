// src/app/api/asana/diagnostic/route.ts - Versão corrigida do erro de regex
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO - TODAS AS TASKS');
    
    // 1. Verificar token
    const asanaToken = process.env.ASANA_ACCESS_TOKEN;
    if (!asanaToken || asanaToken.trim() === '' || asanaToken === 'your_asana_token_here') {
      return NextResponse.json({
        success: false,
        error: 'Token do Asana não configurado',
        diagnosis: 'AUTHENTICATION_ERROR'
      });
    }

    // 2. Testar autenticação
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${asanaToken}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Erro de autenticação: ${userResponse.status}`,
        diagnosis: 'AUTHENTICATION_FAILED'
      });
    }

    const userInfo = await userResponse.json();
    console.log('✅ Autenticação OK - Usuário:', userInfo.data?.name);

    // 3. Buscar workspaces
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: {
        'Authorization': `Bearer ${asanaToken}`,
        'Accept': 'application/json'
      }
    });

    const workspacesData = await workspacesResponse.json();
    const workspaces = workspacesData.data || [];
    const workspace = workspaces[0];

    // 4. Buscar projetos
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${asanaToken}`,
          'Accept': 'application/json'
        }
      }
    );

    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    const operationalProject = projects.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      return NextResponse.json({
        success: false,
        error: 'Projeto "Operacional" não encontrado',
        diagnosis: 'NO_OPERATIONAL_PROJECT',
        availableProjects: projects.map((p: any) => p.name)
      });
    }

    console.log(`✅ Projeto encontrado: ${operationalProject.name}`);

    // 5. **BUSCAR TODAS AS TASKS - SEM LIMITE** 
    console.log('🔄 Buscando TODAS as tasks (sem limite)...');
    const allTasks = await fetchAllTasks(asanaToken, operationalProject.gid);
    
    console.log(`📊 TODAS as tasks encontradas: ${allTasks.length}`);

    // 6. Filtrar apenas tasks (não subtasks)
    const mainTasks = allTasks.filter((task: any) => {
      // Task é considerada principal se não tem parent ou se parent não é uma task
      return !task.parent || task.parent.resource_type !== 'task';
    });

    console.log(`📋 Tasks principais (não subtasks): ${mainTasks.length}`);

    // 7. Análise detalhada das primeiras 5 tasks
    const detailedAnalysis = mainTasks.slice(0, 5).map((task: any, index: number) => {
      console.log(`\n--- TASK ${index + 1}: ${task.name} ---`);
      
      const customFieldsAnalysis: any = {};
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        task.custom_fields.forEach((field: any) => {
          if (field.name) {
            const fieldInfo = {
              name: field.name,
              text_value: field.text_value || null,
              number_value: field.number_value || null,
              enum_value: field.enum_value?.name || null,
              display_value: field.display_value || null
            };
            customFieldsAnalysis[field.name] = fieldInfo;
          }
        });
      }

      return {
        taskName: task.name,
        completed: task.completed,
        assignee: task.assignee?.name || null,
        customFieldsCount: task.custom_fields?.length || 0,
        customFieldsAnalysis,
        hasNotes: !!task.notes,
        hasParent: !!task.parent
      };
    });

    // 8. **EXTRAÇÃO MELHORADA DE EMPRESAS** - CORRIGIDA
    console.log('\n🏢 Analisando empresas com algoritmo corrigido...');
    const companyCounts: Record<string, number> = {};
    const companyExamples: Record<string, string[]> = {};

    mainTasks.forEach((task: any) => {
      const companies = extractCompaniesFromTitleFixed(task.name);
      companies.forEach(company => {
        if (company && company !== 'UNKNOWN') {
          companyCounts[company] = (companyCounts[company] || 0) + 1;
          if (!companyExamples[company]) {
            companyExamples[company] = [];
          }
          if (companyExamples[company].length < 2) {
            companyExamples[company].push(task.name);
          }
        }
      });
    });

    console.log(`✅ Empresas identificadas: ${Object.keys(companyCounts).length}`);
    Object.entries(companyCounts).forEach(([company, count]) => {
      console.log(`  ${company}: ${count} tasks`);
    });

    // 9. Custom fields únicos
    const allCustomFieldNames = [...new Set(
      mainTasks.flatMap((task: any) => 
        task.custom_fields?.map((cf: any) => cf.name) || []
      )
    )].filter(Boolean);

    // 10. Verificar campos importantes
    const importantFields = [
      'Exportador', 'CIA DE TRANSPORTE', 'NAVIO', 'Terminal', 
      'PRODUTO', 'ETD', 'ETA', 'Status'
    ];

    const fieldPresence = importantFields.map(fieldName => {
      const tasksWithField = mainTasks.filter((task: any) =>
        task.custom_fields?.some((cf: any) => cf.name === fieldName)
      );
      
      return {
        fieldName,
        presentInTasks: tasksWithField.length,
        percentage: Math.round((tasksWithField.length / mainTasks.length) * 100)
      };
    });

    return NextResponse.json({
      success: true,
      diagnosis: 'COMPLETE_SUCCESS',
      data: {
        authentication: {
          status: 'OK',
          user: userInfo.data?.name || 'Unknown',
          email: userInfo.data?.email || 'Unknown'
        },
        workspace: {
          name: workspace.name,
          gid: workspace.gid
        },
        project: {
          name: operationalProject.name,
          gid: operationalProject.gid
        },
        tasks: {
          totalFound: allTasks.length,
          mainTasks: mainTasks.length,
          analyzed: detailedAnalysis.length
        },
        customFields: {
          totalUnique: allCustomFieldNames.length,
          names: allCustomFieldNames,
          importantFieldsPresence: fieldPresence
        },
        companies: {
          identified: Object.keys(companyCounts).length,
          distribution: companyCounts,
          examples: companyExamples
        },
        detailedTaskAnalysis: detailedAnalysis,
        recommendations: generateEnhancedRecommendations(
          allCustomFieldNames, 
          fieldPresence, 
          companyCounts,
          allTasks.length,
          mainTasks.length
        )
      }
    });

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro durante diagnóstico',
      diagnosis: 'UNEXPECTED_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// **FUNÇÃO PARA BUSCAR TODAS AS TASKS**
async function fetchAllTasks(token: string, projectGid: string): Promise<any[]> {
  const allTasks: any[] = [];
  let nextPageUri: string | null = null;
  let pageCount = 0;
  const maxPages = 20; // Limite de segurança para evitar loop infinito

  do {
    pageCount++;
    console.log(`📄 Buscando página ${pageCount}...`);

    let url: string;
    if (nextPageUri) {
      url = nextPageUri;
    } else {
      // Primeira requisição - buscar até 100 tasks por página
      url = `https://app.asana.com/api/1.0/tasks?project=${projectGid}&opt_fields=name,completed,assignee.name,custom_fields.name,custom_fields.text_value,custom_fields.number_value,custom_fields.enum_value.name,custom_fields.display_value,notes,parent.resource_type&limit=100`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar tasks página ${pageCount}: ${response.status}`);
    }

    const data = await response.json();
    const tasks = data.data || [];
    
    console.log(`  ✅ Página ${pageCount}: ${tasks.length} tasks encontradas`);
    allTasks.push(...tasks);

    // Verificar se há próxima página
    nextPageUri = data.next_page?.uri || null;

    // Limite de segurança
    if (pageCount >= maxPages) {
      console.log(`⚠️ Limite de ${maxPages} páginas atingido, parando busca`);
      break;
    }

  } while (nextPageUri);

  console.log(`📊 Total de tasks coletadas: ${allTasks.length} em ${pageCount} páginas`);
  return allTasks;
}

// **EXTRAÇÃO CORRIGIDA DE EMPRESAS - SEM matchAll**
function extractCompaniesFromTitleFixed(title: string): string[] {
  if (!title || !title.trim()) return [];

  const companies: string[] = [];
  
  console.log(`    🔍 Analisando: "${title}"`);
  
  // **PADRÕES CORRIGIDOS - USANDO match() EM VEZ DE matchAll()**
  const patterns = [
    // Padrão principal: 661º UNIVAR (PO 4527659420)
    /^(\d+)º?\s+([A-Z][A-Z\s&\.]+?)(?:\s*\(|$)/i,
    // Padrão com hífen: 661 - UNIVAR
    /^(\d+)\s*[-–]\s*([A-Z][A-Z\s&\.]+)/i,
    // Padrão simples: 661 UNIVAR
    /^(\d+)\s+([A-Z][A-Z\s&\.]+?)(?:\s|$)/i,
    // Padrão sem número: UNIVAR (algo)
    /^([A-Z][A-Z\s&\.]{2,})(?:\s*\(|$)/i,
    // Padrão para ATACAMAX, BAPTISTELLA, etc.
    /^(\d+)?\s*([A-Z]{4,}[A-Z\s&]*)/i,
    // Padrão para empresas com pontos: E.P.R.
    /^(\d+)?\s*([A-Z]\.(?:[A-Z]\.)*[A-Z]\.?)/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = title.match(pattern);
    
    if (match) {
      let company = '';
      
      // Determinar qual grupo tem a empresa baseado no padrão
      if (i === 3) { // Padrão sem número inicial
        company = match[1] || '';
      } else if (i === 4 || i === 5) { // Padrões especiais
        company = match[2] || match[1] || '';
      } else { // Padrões principais
        company = match[2] || '';
      }
      
      if (company && company.length >= 3) {
        // Limpar e normalizar
        company = company
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s&\.]/g, '')
          .trim()
          .toUpperCase();
        
        // Filtrar palavras comuns que não são empresas
        const excludeWords = ['PO', 'REF', 'PROCESSO', 'CONTAINER', 'CNTR', 'BL', 'AWB'];
        if (!excludeWords.includes(company) && company.length >= 3) {
          console.log(`    ✅ Empresa encontrada: "${company}" | Padrão ${i + 1}`);
          companies.push(company);
          break; // Parar no primeiro match para evitar duplicatas
        }
      }
    }
  }

  // Se nenhum padrão funcionou, tentar extração básica
  if (companies.length === 0) {
    const basicMatch = title.match(/\b([A-Z]{3,}(?:\s+[A-Z]{2,})*)\b/);
    if (basicMatch) {
      const company = basicMatch[1].trim().toUpperCase();
      const excludeWords = ['PO', 'REF', 'PROCESSO', 'CONTAINER', 'CNTR', 'BL', 'AWB', 'NAVIO'];
      if (!excludeWords.includes(company) && company.length >= 3) {
        console.log(`    ⚠️ Empresa básica: "${company}"`);
        companies.push(company);
      }
    }
  }

  if (companies.length === 0) {
    console.log(`    ❌ Nenhuma empresa identificada em: "${title}"`);
  }

  // Remover duplicatas
  return [...new Set(companies)];
}

function generateEnhancedRecommendations(
  customFields: string[], 
  fieldPresence: any[], 
  companies: Record<string, number>,
  totalTasks: number,
  mainTasks: number
): string[] {
  const recommendations: string[] = [];

  // Tasks vs Subtasks
  if (totalTasks > mainTasks) {
    recommendations.push(`ℹ️ ${totalTasks} tasks totais, ${mainTasks} tasks principais (${totalTasks - mainTasks} subtasks filtradas)`);
  }

  // Empresas identificadas
  if (Object.keys(companies).length === 0) {
    recommendations.push('❌ Nenhuma empresa identificada nos títulos das tasks');
  } else if (Object.keys(companies).length < 10) {
    recommendations.push(`⚠️ Apenas ${Object.keys(companies).length} empresas identificadas - verifique se há mais empresas nos títulos`);
  } else {
    recommendations.push(`✅ ${Object.keys(companies).length} empresas identificadas`);
  }

  // Custom fields
  if (customFields.length === 0) {
    recommendations.push('❌ Nenhum custom field encontrado');
  } else if (customFields.length < 15) {
    recommendations.push(`⚠️ ${customFields.length} custom fields encontrados - verifique se todos estão configurados`);
  } else {
    recommendations.push(`✅ ${customFields.length} custom fields encontrados`);
  }

  // Campos importantes com baixa presença
  const lowPresenceFields = fieldPresence.filter(f => f.percentage < 80);
  if (lowPresenceFields.length > 0) {
    recommendations.push(
      `⚠️ Campos com baixa presença (< 80%): ${lowPresenceFields.map(f => `${f.fieldName} (${f.percentage}%)`).join(', ')}`
    );
  }

  return recommendations;
}