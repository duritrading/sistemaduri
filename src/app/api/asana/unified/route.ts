// src/app/api/asana/unified/route.ts - SOMENTE DADOS REAIS DO ASANA
import { NextRequest, NextResponse } from 'next/server';

// ✅ Cache APENAS para dados reais
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos - cache mais curto para dados reais
const companyCache = new Map<string, { data: any; timestamp: number }>();

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 API Asana STRICT: Starting request...');
    
    // ✅ Extrair filtro de empresa da query string
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company');
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`🔍 API Request - Company: ${companyFilter || 'ALL'}, Refresh: ${forceRefresh}`);

    // ✅ Verificar cache por empresa
    const cacheKey = companyFilter || 'ALL_COMPANIES';
    const cachedData = companyCache.get(cacheKey);
    
    if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log(`⚡ Cache HIT para empresa: ${cacheKey}`);
      return NextResponse.json({
        ...cachedData.data,
        meta: {
          ...cachedData.data.meta,
          cached: true,
          cacheAge: Math.round((Date.now() - cachedData.timestamp) / 1000)
        }
      });
    }

    // ✅ STRICT: Token DEVE estar configurado
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      console.error('❌ ASANA_ACCESS_TOKEN não configurado');
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado. Configure ASANA_ACCESS_TOKEN no .env.local',
        code: 'MISSING_TOKEN',
        setupInstructions: {
          step1: 'Crie arquivo .env.local na raiz do projeto',
          step2: 'Adicione: ASANA_ACCESS_TOKEN=seu_token_aqui',
          step3: 'Obtenha token em: https://developers.asana.com/docs/personal-access-token',
          step4: 'Reinicie o servidor: npm run dev'
        }
      }, { status: 401 });
    }

    console.log(`🔑 Token configurado (${token.length} chars)`);

    // ✅ STEP 1: Testar autenticação
    console.log('🔐 Testando autenticação...');
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text().catch(() => 'Unknown error');
      console.error(`❌ Falha na autenticação: ${userResponse.status} - ${errorText}`);
      return NextResponse.json({
        success: false,
        error: `Erro de autenticação Asana: ${userResponse.status}`,
        details: errorText,
        code: 'AUTH_FAILED',
        troubleshooting: [
          'Verifique se o token ASANA_ACCESS_TOKEN está correto',
          'Confirme se o token não expirou',
          'Teste o token em: https://app.asana.com/api/1.0/users/me',
          'Gere um novo token se necessário'
        ]
      }, { status: 401 });
    }

    const userData = await userResponse.json();
    console.log(`✅ Autenticado como: ${userData.data?.name} (${userData.data?.email})`);

    // ✅ STEP 2: Buscar workspaces
    console.log('🏢 Buscando workspaces...');
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces?limit=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!workspacesResponse.ok) {
      const errorText = await workspacesResponse.text().catch(() => 'Unknown error');
      console.error(`❌ Erro ao buscar workspaces: ${workspacesResponse.status}`);
      return NextResponse.json({
        success: false,
        error: `Erro ao buscar workspaces: ${workspacesResponse.status}`,
        details: errorText,
        code: 'WORKSPACE_ERROR'
      }, { status: 500 });
    }

    const workspacesData = await workspacesResponse.json();
    const workspaces = workspacesData.data || [];

    if (workspaces.length === 0) {
      console.error('❌ Nenhum workspace encontrado');
      return NextResponse.json({
        success: false,
        error: 'Nenhum workspace encontrado para este token',
        code: 'NO_WORKSPACES',
        troubleshooting: [
          'Verifique se o token tem acesso a algum workspace',
          'Confirme as permissões do token no Asana'
        ]
      }, { status: 404 });
    }

    const workspace = workspaces[0];
    console.log(`📍 Usando workspace: ${workspace.name} (${workspace.gid})`);

    // ✅ STEP 3: Buscar projeto OPERACIONAL específico
    console.log('📂 Buscando projeto operacional...');
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100&opt_fields=name,notes,created_at,modified_at,owner.name`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text().catch(() => 'Unknown error');
      console.error(`❌ Erro ao buscar projetos: ${projectsResponse.status}`);
      return NextResponse.json({
        success: false,
        error: `Erro ao buscar projetos: ${projectsResponse.status}`,
        details: errorText,
        code: 'PROJECTS_ERROR'
      }, { status: 500 });
    }

    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    
    console.log(`📋 ${projects.length} projetos encontrados:`);
    projects.forEach((p: any, i: number) => {
      console.log(`   ${i + 1}. "${p.name}" (${p.gid})`);
    });

    // ✅ Buscar projeto que contenha "operacional" (case insensitive)
    const operationalProject = projects.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      const availableProjects = projects.map((p: any) => `"${p.name}"`).join(', ');
      console.error('❌ Projeto operacional não encontrado');
      return NextResponse.json({
        success: false,
        error: 'Projeto operacional não encontrado',
        code: 'PROJECT_NOT_FOUND',
        availableProjects: projects.map(p => ({ gid: p.gid, name: p.name })),
        troubleshooting: [
          'Verifique se existe um projeto com "operacional" no nome',
          'Projetos disponíveis: ' + availableProjects,
          'Confirme se o token tem acesso ao projeto'
        ]
      }, { status: 404 });
    }

    console.log(`✅ Projeto operacional encontrado: "${operationalProject.name}" (${operationalProject.gid})`);

    // ✅ STEP 4: Buscar TODAS as tasks do projeto operacional
    console.log('📋 Buscando TODAS as tasks do projeto operacional...');
    
    // Campos otimizados para trackings marítimos
    const optFields = [
      'name',
      'notes', 
      'completed',
      'assignee.name',
      'assignee.email',
      'custom_fields.name',
      'custom_fields.display_value',
      'custom_fields.text_value',
      'custom_fields.number_value',
      'custom_fields.enum_value.name',
      'custom_fields.multi_enum_values.name',
      'custom_fields.date_value',
      'custom_fields.resource_subtype',
      'due_date',
      'created_at',
      'modified_at',
      'parent.name',
      'tags.name'
    ].join(',');

    let allTasks: any[] = [];
    let offset: string | undefined;
    let requestCount = 0;
    const maxRequests = 50; // Aumentado para pegar mais tasks

    do {
      requestCount++;
      console.log(`   📄 Página ${requestCount}...`);
      
      if (requestCount > maxRequests) {
        console.warn('⚠️ Limite de páginas atingido - pode haver mais tasks');
        break;
      }

      const endpoint = `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=${optFields}&limit=100${
        offset ? `&offset=${offset}` : ''
      }`;

      const tasksResponse = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(20000) // 20s para requests grandes
      });

      if (!tasksResponse.ok) {
        const errorText = await tasksResponse.text().catch(() => 'Unknown error');
        console.error(`❌ Erro ao buscar tasks (página ${requestCount}): ${tasksResponse.status}`);
        break; // Continue com as tasks que já temos
      }

      const tasksData = await tasksResponse.json();
      const tasks = tasksData.data || [];
      
      allTasks.push(...tasks);
      offset = tasksData.next_page?.offset;
      
      console.log(`   ✅ ${tasks.length} tasks carregadas (total: ${allTasks.length})`);
      
    } while (offset);

    console.log(`✅ TOTAL: ${allTasks.length} tasks carregadas do projeto operacional`);

    if (allTasks.length === 0) {
      console.warn('⚠️ Nenhuma task encontrada no projeto operacional');
      return NextResponse.json({
        success: false,
        error: 'Nenhuma task encontrada no projeto operacional',
        code: 'NO_TASKS',
        projectInfo: {
          gid: operationalProject.gid,
          name: operationalProject.name
        },
        troubleshooting: [
          'Verifique se o projeto tem tasks criadas',
          'Confirme se o token tem acesso às tasks do projeto'
        ]
      }, { status: 404 });
    }

    // ✅ STEP 5: Processar tasks em trackings com TODOS os custom fields
    console.log('🔄 Processando tasks em trackings...');
    let trackings = allTasks.map((task: any) => {
      const tracking = processTaskToTrackingComplete(task);
      console.log(`   📦 Processado: "${task.name}" → Empresa: ${tracking.company}`);
      return tracking;
    });

    // ✅ STEP 6: Aplicar filtro de empresa se especificado
    if (companyFilter) {
      const originalCount = trackings.length;
      trackings = trackings.filter(tracking => {
        return tracking.company === companyFilter;
      });
      console.log(`🎯 Filtro aplicado: ${originalCount} → ${trackings.length} trackings para empresa ${companyFilter}`);
      
      if (trackings.length === 0) {
        const availableCompanies = [...new Set(allTasks.map((task: any) => {
          const tracking = processTaskToTrackingComplete(task);
          return tracking.company;
        }))].filter(Boolean);
        
        return NextResponse.json({
          success: false,
          error: `Nenhum tracking encontrado para empresa: ${companyFilter}`,
          code: 'NO_COMPANY_DATA',
          availableCompanies,
          troubleshooting: [
            `Empresas disponíveis: ${availableCompanies.join(', ')}`,
            'Verifique se o nome da empresa está correto',
            'Confirme se há tasks para esta empresa no projeto'
          ]
        }, { status: 404 });
      }
    }

    // ✅ STEP 7: Calcular métricas dos dados reais
    const metrics = calculateRealMetrics(trackings);
    
    // ✅ Analisar custom fields disponíveis
    const customFieldsAnalysis = analyzeCustomFields(allTasks);
    
    const responseData = {
      success: true,
      data: trackings,
      metrics,
      customFieldsAnalysis,
      meta: {
        workspace: workspace.name,
        workspaceGid: workspace.gid,
        project: operationalProject.name,
        projectGid: operationalProject.gid,
        authenticatedUser: userData.data?.name,
        userEmail: userData.data?.email,
        companyFilter: companyFilter || null,
        totalTasksInProject: allTasks.length,
        processedTrackings: trackings.length,
        paginationRequests: requestCount,
        lastSync: new Date().toISOString(),
        apiVersion: 'unified-v3-strict-asana',
        dataSource: 'asana-real-only',
        cached: false,
        performance: {
          serverFilterApplied: !!companyFilter,
          dataReduction: companyFilter ? `${((1 - trackings.length / allTasks.length) * 100).toFixed(1)}%` : '0%',
          customFieldsFound: customFieldsAnalysis.uniqueFieldNames.length
        }
      }
    };

    // ✅ Salvar no cache
    companyCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log(`✅ Resposta processada e cacheada para empresa: ${cacheKey}`);
    console.log(`📊 Dados finais: ${trackings.length} trackings, ${customFieldsAnalysis.uniqueFieldNames.length} custom fields únicos`);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ API Unified STRICT Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR',
      troubleshooting: [
        'Verifique a conectividade com o Asana',
        'Confirme se o token não expirou',
        'Verifique os logs do servidor para mais detalhes'
      ]
    }, { status: 500 });
  }
}

function processTaskToTrackingComplete(task: any) {
  // ✅ Extrair TODOS os custom fields sem exceção
  const customFields = extractAllCustomFields(task.custom_fields || []);
  
  // ✅ Extrair empresa do título usando padrões mais precisos
  const company = extractCompanyFromTitle(task.name) || 'NÃO_IDENTIFICADO';
  
  return {
    id: task.gid,
    asanaId: task.gid,
    title: task.name,
    company: company,
    ref: extractReferenceFromTitle(task.name),
    status: determineTaskStatus(task),
    
    transport: {
      exporter: company,
      company: company,
      vessel: findFieldValue(customFields, ['Armador', 'Vessel', 'Navio', 'Shipping_Line']),
      blAwb: findFieldValue(customFields, ['BL', 'AWB', 'Bill_of_Lading', 'Conhecimento']),
      containers: extractContainers(customFields),
      terminal: findFieldValue(customFields, ['Terminal', 'Porto', 'Port']),
      products: extractProducts(customFields)
    },
    
    schedule: {
      etd: findFieldValue(customFields, ['ETD', 'Estimated_Departure', 'Data_Embarque']),
      eta: findFieldValue(customFields, ['ETA', 'Estimated_Arrival', 'Data_Chegada']),
      freetime: findFieldValue(customFields, ['Freetime', 'Free_Time', 'Tempo_Livre']),
      responsible: task.assignee?.name || findFieldValue(customFields, ['Responsavel', 'Responsible', 'Owner']),
      operationalStatus: determineTaskStatus(task)
    },
    
    regulatory: {
      orgaosAnuentes: extractOrgaosAnuentes(customFields)
    },
    
    // ✅ TODOS os custom fields preservados
    customFields: customFields,
    
    // ✅ Metadados adicionais
    metadata: {
      assignee: task.assignee,
      parent: task.parent,
      tags: task.tags || [],
      notes: task.notes,
      createdAt: task.created_at,
      modifiedAt: task.modified_at,
      dueDate: task.due_date
    },
    
    lastUpdate: task.modified_at || new Date().toISOString()
  };
}

function extractAllCustomFields(customFields: any[]): Record<string, any> {
  const fields: Record<string, any> = {};
  
  if (!Array.isArray(customFields)) {
    return fields;
  }

  customFields.forEach(field => {
    if (field && field.name) {
      const fieldName = field.name;
      let fieldValue: any = null;

      // ✅ Extrair valor baseado no tipo do field
      if (field.display_value !== undefined && field.display_value !== null) {
        fieldValue = field.display_value; // Valor formatado pelo Asana
      } else if (field.text_value !== undefined && field.text_value !== null) {
        fieldValue = field.text_value;
      } else if (field.number_value !== undefined && field.number_value !== null) {
        fieldValue = field.number_value;
      } else if (field.enum_value && field.enum_value.name) {
        fieldValue = field.enum_value.name;
      } else if (field.multi_enum_values && field.multi_enum_values.length > 0) {
        fieldValue = field.multi_enum_values.map((v: any) => v.name).join(', ');
      } else if (field.date_value) {
        fieldValue = field.date_value;
      } else if (field.resource_subtype === 'boolean') {
        fieldValue = field.bool_value || false;
      }

      // ✅ Armazenar se tem valor válido
      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        // Normalizar nome do field para consistência
        const normalizedKey = fieldName.replace(/\s+/g, '_').replace(/[^\w]/g, '');
        fields[fieldName] = fieldValue; // Nome original
        fields[normalizedKey] = fieldValue; // Nome normalizado
        
        console.log(`   📋 Custom field: ${fieldName} = ${fieldValue}`);
      }
    }
  });

  return fields;
}

function findFieldValue(customFields: Record<string, any>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (customFields[name]) return String(customFields[name]);
    
    // Verificar variações
    const normalized = name.replace(/\s+/g, '_').replace(/[^\w]/g, '');
    if (customFields[normalized]) return String(customFields[normalized]);
  }
  return '';
}

function extractContainers(customFields: Record<string, any>): string[] {
  const containerField = findFieldValue(customFields, ['Container', 'Containers', 'Contentor']);
  if (!containerField) return [];
  
  // Split por vírgulas, quebras de linha, ou espaços
  return containerField.split(/[,\n\r\s]+/)
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

function extractProducts(customFields: Record<string, any>): string[] {
  const productField = findFieldValue(customFields, ['Produto', 'Product', 'Produtos', 'Commodity']);
  if (!productField) return [];
  
  return productField.split(/[,\n\r]+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

function extractOrgaosAnuentes(customFields: Record<string, any>): string[] {
  const orgaosField = findFieldValue(customFields, ['Orgaos_Anuentes', 'OrgaosAnuentes', 'Regulatory_Agencies']);
  if (!orgaosField) return [];
  
  return orgaosField.split(/[,\n\r]+/)
    .map(o => o.trim())
    .filter(o => o.length > 0);
}

function extractCompanyFromTitle(title: string): string | null {
  if (!title) return null;
  
  // Padrões mais precisos para títulos do Asana
  const patterns = [
    /^\d+º?\s+([A-Z][A-Z\s&\.]+?)(?:\s*\(|$)/i,  // "661º UNIVAR (..."
    /^(\d+)?\s*[-–]\s*([A-Z][A-Z\s&\.]+)/i,       // "661 - UNIVAR"
    /^([A-Z][A-Z\s&\.]{2,})(?:\s*\(|$)/i          // "UNIVAR (..."
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const company = (match[2] || match[1])?.trim().toUpperCase();
      if (company && company.length > 1) {
        return company;
      }
    }
  }
  
  return null;
}

function extractReferenceFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

function determineTaskStatus(task: any): string {
  if (task.completed) return 'Concluído';
  
  // Pode expandir com base em custom fields ou outros indicadores
  return 'Em Progresso';
}

function analyzeCustomFields(tasks: any[]): any {
  const fieldFrequency: Record<string, number> = {};
  const fieldTypes: Record<string, Set<string>> = {};
  const fieldSamples: Record<string, any[]> = {};
  
  tasks.forEach(task => {
    if (task.custom_fields) {
      task.custom_fields.forEach((field: any) => {
        if (field.name) {
          // Frequência
          fieldFrequency[field.name] = (fieldFrequency[field.name] || 0) + 1;
          
          // Tipos
          if (!fieldTypes[field.name]) fieldTypes[field.name] = new Set();
          if (field.resource_subtype) fieldTypes[field.name].add(field.resource_subtype);
          
          // Amostras
          if (!fieldSamples[field.name]) fieldSamples[field.name] = [];
          if (fieldSamples[field.name].length < 3) {
            const value = field.display_value || field.text_value || field.number_value || field.enum_value?.name;
            if (value) fieldSamples[field.name].push(value);
          }
        }
      });
    }
  });
  
  return {
    uniqueFieldNames: Object.keys(fieldFrequency),
    fieldFrequency,
    fieldTypes: Object.fromEntries(
      Object.entries(fieldTypes).map(([k, v]) => [k, Array.from(v)])
    ),
    fieldSamples,
    totalFields: Object.keys(fieldFrequency).length
  };
}

function calculateRealMetrics(trackings: any[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  const statusDistribution: Record<string, number> = {};
  const exporterDistribution: Record<string, number> = {};
  const productDistribution: Record<string, number> = {};
  const armadorDistribution: Record<string, number> = {};
  const terminalDistribution: Record<string, number> = {};
  const orgaosAnuentesDistribution: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    // Status
    const status = tracking.status || 'Em Progresso';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    
    // Empresa/Exportador
    const company = tracking.company || 'NÃO_IDENTIFICADO';
    exporterDistribution[company] = (exporterDistribution[company] || 0) + 1;
    
    // Produtos
    if (tracking.transport?.products) {
      tracking.transport.products.forEach((product: string) => {
        if (product) {
          productDistribution[product] = (productDistribution[product] || 0) + 1;
        }
      });
    }
    
    // Armador/Vessel
    if (tracking.transport?.vessel) {
      armadorDistribution[tracking.transport.vessel] = (armadorDistribution[tracking.transport.vessel] || 0) + 1;
    }
    
    // Terminal
    if (tracking.transport?.terminal) {
      terminalDistribution[tracking.transport.terminal] = (terminalDistribution[tracking.transport.terminal] || 0) + 1;
    }
    
    // Órgãos Anuentes
    if (tracking.regulatory?.orgaosAnuentes) {
      tracking.regulatory.orgaosAnuentes.forEach((orgao: string) => {
        if (orgao) {
          orgaosAnuentesDistribution[orgao] = (orgaosAnuentesDistribution[orgao] || 0) + 1;
        }
      });
    }
  });
  
  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    statusDistribution,
    exporterDistribution,
    productDistribution,
    armadorDistribution,
    terminalDistribution,
    orgaosAnuentesDistribution,
    etdTimeline: generateETDTimeline(trackings),
    uniqueExporters: Object.keys(exporterDistribution).length,
    uniqueShippingLines: Object.keys(armadorDistribution).length,
    uniqueTerminals: Object.keys(terminalDistribution).length,
    totalContainers: trackings.reduce((sum, t) => sum + (t.transport?.containers?.length || 0), 0)
  };
}

function generateETDTimeline(trackings: any[]) {
  const timeline: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    if (tracking.schedule?.etd) {
      const date = new Date(tracking.schedule.etd);
      if (!isNaN(date.getTime())) {
        const month = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
        timeline[month] = (timeline[month] || 0) + 1;
      }
    }
  });
  
  return Object.entries(timeline).map(([month, count]) => ({
    month,
    operations: count
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()).slice(0, 12);
}