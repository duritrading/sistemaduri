// src/app/api/asana/unified/route.ts - VERSÃO OTIMIZADA COMPLETA
import { NextRequest, NextResponse } from 'next/server';

// ✅ Cache otimizado para dados reais
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos para dados mais atualizados
const companyCache = new Map<string, { data: any; timestamp: number }>();

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 API Asana EXTRACTION COMPLETA: Starting...');
    
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company');
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`🔍 Request - Company: ${companyFilter || 'ALL'}, Refresh: ${forceRefresh}`);

    // ✅ Cache inteligente
    const cacheKey = companyFilter || 'ALL_COMPANIES';
    const cachedData = companyCache.get(cacheKey);
    
    if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log(`⚡ Cache HIT para empresa: ${cacheKey}`);
      return NextResponse.json({
        ...cachedData.data,
        meta: { ...cachedData.data.meta, cached: true, cacheAge: Math.round((Date.now() - cachedData.timestamp) / 1000) }
      });
    }

    // ✅ Token validation
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      console.error('❌ ASANA_ACCESS_TOKEN não configurado');
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado',
        code: 'MISSING_TOKEN'
      }, { status: 401 });
    }

    // ✅ STEP 1: Autenticar e obter workspace
    console.log('🔐 Autenticando no Asana...');
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (!userResponse.ok) {
      throw new Error(`Autenticação falhou: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    console.log(`✅ Autenticado como: ${userData.data.name}`);

    // ✅ STEP 2: Buscar workspace
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const workspacesData = await workspacesResponse.json();
    const workspace = workspacesData.data?.[0];

    if (!workspace) {
      throw new Error('Nenhum workspace encontrado');
    }

    console.log(`✅ Workspace: ${workspace.name} (${workspace.gid})`);

    // ✅ STEP 3: Buscar projeto operacional
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100&opt_fields=name,notes,created_at,custom_fields.name`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    
    const operationalProject = projects.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      return NextResponse.json({
        success: false,
        error: 'Projeto operacional não encontrado',
        code: 'PROJECT_NOT_FOUND',
        availableProjects: projects.map(p => ({ gid: p.gid, name: p.name }))
      }, { status: 404 });
    }

    console.log(`✅ Projeto encontrado: "${operationalProject.name}" (${operationalProject.gid})`);

    // ✅ STEP 4: Buscar seções do projeto
    console.log('📂 Buscando seções do projeto...');
    const sectionsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects/${operationalProject.gid}/sections?opt_fields=name,created_at`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const sectionsData = await sectionsResponse.json();
    const sections = sectionsData.data || [];
    
    console.log(`✅ ${sections.length} seções encontradas: ${sections.map(s => s.name).join(', ')}`);

    // ✅ STEP 5: Buscar TODAS as tasks com TODOS os campos possíveis
    console.log('📋 Buscando TODAS as tasks com extração completa...');
    
    // ✅ CAMPOS OTIMIZADOS - Foco nos campos reais do Asana
    const allOptFields = [
      // Campos básicos
      'name', 'notes', 'completed', 'completed_at', 'created_at', 'modified_at', 'due_date', 'due_at', 'start_on',
      
      // Usuários e responsabilidades
      'assignee.name', 'assignee.email', 'assignee.gid',
      'created_by.name', 'created_by.email',
      
      // Estrutura e organização  
      'parent.name', 'parent.gid',
      'projects.name', 'projects.gid',
      'memberships.section.name', 'memberships.section.gid',
      
      // Tags e metadados
      'tags.name', 'tags.color',
      'followers.name', 'followers.gid',
      'likes.user.name',
      
      // Custom fields COMPLETOS para mapear campos da imagem
      'custom_fields.gid',
      'custom_fields.name', 
      'custom_fields.display_value',
      'custom_fields.text_value',
      'custom_fields.number_value', 
      'custom_fields.enum_value.name',
      'custom_fields.enum_value.color',
      'custom_fields.enum_value.enabled',
      'custom_fields.multi_enum_values.name',
      'custom_fields.multi_enum_values.color',
      'custom_fields.date_value',
      'custom_fields.people_value.name',
      'custom_fields.resource_subtype',
      'custom_fields.type',
      'custom_fields.precision',
      'custom_fields.currency_code',
      
      // Aprovações (se houver)
      'approval_status',
      'resource_subtype',
      
      // Permalink
      'permalink_url'
    ].join(',');

    let allTasks: any[] = [];
    let offset: string | undefined;
    let requestCount = 0;
    const maxRequests = 100; // Aumentado para projetos grandes

    do {
      requestCount++;
      console.log(`   📄 Carregando página ${requestCount}...`);
      
      if (requestCount > maxRequests) {
        console.warn('⚠️ Limite de páginas atingido');
        break;
      }

      const endpoint = `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=${allOptFields}&limit=100${
        offset ? `&offset=${offset}` : ''
      }`;

      const tasksResponse = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      if (!tasksResponse.ok) {
        console.error(`❌ Erro ao buscar tasks (página ${requestCount}): ${tasksResponse.status}`);
        break;
      }

      const tasksData = await tasksResponse.json();
      const tasks = tasksData.data || [];
      
      allTasks.push(...tasks);
      offset = tasksData.next_page?.offset;
      
      console.log(`   ✅ ${tasks.length} tasks carregadas (total: ${allTasks.length})`);
      
    } while (offset);

    console.log(`✅ TOTAL: ${allTasks.length} tasks carregadas`);

    // ✅ STEP 6: Buscar attachments das tasks principais (sample)
    console.log('📎 Buscando attachments das tasks principais...');
    const taskAttachments = new Map();
    
    // Buscar attachments apenas das primeiras 20 tasks (otimização)
    const sampleTasks = allTasks.slice(0, 20);
    
    for (const task of sampleTasks) {
      try {
        const attachResponse = await fetch(
          `https://app.asana.com/api/1.0/attachments?parent=${task.gid}&opt_fields=name,download_url,size,created_at`,
          { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
        );
        
        if (attachResponse.ok) {
          const attachData = await attachResponse.json();
          if (attachData.data && attachData.data.length > 0) {
            taskAttachments.set(task.gid, attachData.data);
            console.log(`   📎 ${attachData.data.length} attachments encontrados para "${task.name}"`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Erro ao buscar attachments da task ${task.gid}`);
      }
    }

    console.log('✅ Pulando busca de subtasks (removido por otimização)');

    // ✅ STEP 8: Processar TODAS as tasks com extração COMPLETA
    console.log('🔄 Processando tasks com extração COMPLETA...');
    
    let trackings = allTasks.map((task: any) => {
      const tracking = processTaskToTrackingULTRA(task, {
        sections,
        attachments: taskAttachments.get(task.gid) || []
      });
      return tracking;
    });

    // ✅ STEP 9: Aplicar filtro de empresa
    if (companyFilter) {
      const originalCount = trackings.length;
      trackings = trackings.filter(tracking => tracking.company === companyFilter);
      console.log(`🎯 Filtro aplicado: ${originalCount} → ${trackings.length} trackings para ${companyFilter}`);
    }

    // ✅ STEP 10: Calcular métricas avançadas
    const metrics = calculateAdvancedMetrics(trackings);
    const customFieldsAnalysis = analyzeAllCustomFieldsAdvanced(allTasks);

    // ✅ Cache result
    const result = {
      success: true,
      data: trackings,
      metrics,
      customFieldsAnalysis,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: allTasks.length,
        processedTrackings: trackings.length,
        subtasksFound: 0, // Removido por otimização
        attachmentsFound: Array.from(taskAttachments.values()).flat().length,
        sectionsFound: sections.length,
        customFieldsFound: customFieldsAnalysis.totalFields,
        lastSync: new Date().toISOString(),
        extractionLevel: 'OTIMIZADO_CAMPOS_REAIS',
        apiVersion: 'optimized-v2'
      }
    };

    companyCache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log(`✅ Extração COMPLETA finalizada: ${trackings.length} trackings processados`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erro na extração completa:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro na extração completa do Asana',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXTRACTION_ERROR'
    }, { status: 500 });
  }
}

// ✅ FUNÇÃO DE PROCESSAMENTO FOCADA NOS CAMPOS REAIS DO ASANA
function processTaskToTrackingULTRA(task: any, context: any) {
  const customFields = extractAllCustomFieldsAdvanced(task.custom_fields || []);
  const company = extractCompanyFromTitle(task.name) || findFieldValueAdvanced(customFields, ['EMPRESA', 'Empresa']) || 'NÃO_IDENTIFICADO';
  const notesData = extractStructuredDataFromNotes(task.notes || '');
  
  return {
    // Identificação básica
    id: task.gid,
    asanaId: task.gid,
    title: task.name,
    company,
    ref: extractReferenceFromTitle(task.name),
    status: findFieldValueAdvanced(customFields, ['Status']) || determineAdvancedTaskStatus(task, customFields),
    
    // ✅ CAMPOS EXATOS DA IMAGEM - Transporte
    transport: {
      exporter: findFieldValueAdvanced(customFields, ['Exportador']),
      company: findFieldValueAdvanced(customFields, ['CIA DE TRANSPORTE', 'Cia de Transporte']),
      vessel: findFieldValueAdvanced(customFields, ['NAVIO', 'Navio']),
      blAwb: findFieldValueAdvanced(customFields, ['Nº BL/AWB', 'BL/AWB', 'BL', 'AWB']),
      containers: extractContainersFromField(findFieldValueAdvanced(customFields, ['CNTR', 'Container'])),
      terminal: findFieldValueAdvanced(customFields, ['Terminal']),
      products: extractProductsFromField(findFieldValueAdvanced(customFields, ['PRODUTO', 'Produto'])),
      transportadora: findFieldValueAdvanced(customFields, ['TRANSPORTADORA', 'Transportadora']),
      despachante: findFieldValueAdvanced(customFields, ['Despachante'])
    },
    
    // ✅ CAMPOS EXATOS DA IMAGEM - Cronograma
    schedule: {
      etd: findFieldValueAdvanced(customFields, ['ETD']),
      eta: findFieldValueAdvanced(customFields, ['ETA']),
      fimFreetime: findFieldValueAdvanced(customFields, ['Fim do Freetime']),
      fimArmazenagem: findFieldValueAdvanced(customFields, ['Fim da armazenagem']),
      responsible: task.assignee?.name || 'Não atribuído',
      operationalStatus: findFieldValueAdvanced(customFields, ['Status']) || determineAdvancedTaskStatus(task, customFields),
      createdAt: task.created_at,
      modifiedAt: task.modified_at,
      dueDate: task.due_date,
      completedAt: task.completed_at
    },
    
    // ✅ CAMPOS EXATOS DA IMAGEM - Negócio
    business: {
      empresa: findFieldValueAdvanced(customFields, ['EMPRESA', 'Empresa']),
      servicos: findFieldValueAdvanced(customFields, ['SERVIÇOS', 'Servicos']),
      beneficioFiscal: findFieldValueAdvanced(customFields, ['Benefício Fiscal']),
      canal: findFieldValueAdvanced(customFields, ['Canal']),
      prioridade: findFieldValueAdvanced(customFields, ['Prioridade']),
      adiantamento: findFieldValueAdvanced(customFields, ['Adiantamento'])
    },
    
    // ✅ CAMPOS EXATOS DA IMAGEM - Documentação
    documentation: {
      invoice: findFieldValueAdvanced(customFields, ['INVOICE', 'Invoice']),
      blAwb: findFieldValueAdvanced(customFields, ['Nº BL/AWB', 'BL/AWB'])
    },
    
    // ✅ CAMPOS EXATOS DA IMAGEM - Regulatório
    regulatory: {
      orgaosAnuentes: extractOrgaosAnuentesFromField(findFieldValueAdvanced(customFields, ['Órgãos Anuentes']))
    },
    
    // Estrutura organizacional simplificada (sem subtasks/dependencies)
    structure: {
      section: context.sections.find(s => task.memberships?.some(m => m.section?.gid === s.gid))?.name || 'Sem seção',
      tags: (task.tags || []).map(t => t.name),
      followers: (task.followers || []).map(f => f.name),
      parent: task.parent?.name || null
    },
    
    // Anexos e recursos
    resources: {
      attachments: context.attachments.map(att => ({
        name: att.name,
        size: att.size,
        downloadUrl: att.download_url,
        createdAt: att.created_at
      })),
      permalink: task.permalink_url
    },
    
    // TODOS os custom fields preservados
    customFields,
    
    // Metadados essenciais
    metadata: {
      completed: task.completed,
      completedAt: task.completed_at,
      createdBy: task.created_by?.name,
      approvalStatus: task.approval_status,
      likes: (task.likes || []).length,
      projectMemberships: (task.projects || []).map(p => p.name)
    },
    
    lastUpdate: task.modified_at || new Date().toISOString()
  };
}

// ✅ EXTRAÇÃO AVANÇADA DE CUSTOM FIELDS
function extractAllCustomFieldsAdvanced(customFields: any[]): Record<string, any> {
  const fields: Record<string, any> = {};
  
  if (!Array.isArray(customFields)) return fields;

  customFields.forEach(field => {
    if (field && field.name) {
      const fieldName = field.name;
      let fieldValue: any = null;

      // Priorizar display_value (valor formatado pelo Asana)
      if (field.display_value !== undefined && field.display_value !== null) {
        fieldValue = field.display_value;
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
      } else if (field.people_value && field.people_value.length > 0) {
        fieldValue = field.people_value.map((p: any) => p.name).join(', ');
      } else if (field.resource_subtype === 'boolean') {
        fieldValue = field.bool_value || false;
      }

      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        // Normalizar chave e manter original
        const normalizedKey = fieldName.replace(/\s+/g, '_').replace(/[^\w]/g, '').toLowerCase();
        
        fields[normalizedKey] = fieldValue;
        fields[fieldName] = fieldValue; // Manter nome original também
        fields[`_meta_${normalizedKey}`] = {
          originalName: fieldName,
          type: field.resource_subtype || field.type,
          gid: field.gid
        };
        
        console.log(`📋 Campo extraído: ${fieldName} = ${fieldValue}`);
      }
    }
  });

  return fields;
}

// ✅ BUSCA AVANÇADA DE CAMPOS
function findFieldValueAdvanced(customFields: Record<string, any>, fieldNames: string[]): string | null {
  for (const fieldName of fieldNames) {
    // Tentar nome exato
    if (customFields[fieldName]) {
      return String(customFields[fieldName]);
    }
    
    // Tentar nome normalizado
    const normalized = fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
    if (customFields[normalized]) {
      return String(customFields[normalized]);
    }
    
    // Busca parcial (contém)
    for (const [key, value] of Object.entries(customFields)) {
      if (key.toLowerCase().includes(fieldName.toLowerCase()) || 
          fieldName.toLowerCase().includes(key.toLowerCase())) {
        return String(value);
      }
    }
  }
  
  return null;
}

// ✅ EXTRAÇÃO SIMPLIFICADA DE NOTAS (apenas para debug)
function extractStructuredDataFromNotes(notes: string): any {
  if (!notes) return { hasData: false };
  
  return {
    hasData: true,
    length: notes.length,
    preview: notes.substring(0, 200) // Apenas preview para debug
  };
}

// ✅ EXTRAÇÃO SIMPLIFICADA FOCADA NOS CAMPOS REAIS
function extractContainersFromField(containerField: string | null): string[] {
  if (!containerField) return [];
  
  return containerField
    .split(/[,;\n]/)
    .map(c => c.trim())
    .filter(Boolean);
}

function extractProductsFromField(productField: string | null): string[] {
  if (!productField) return [];
  
  return productField
    .split(/[,;\n]/)
    .map(p => p.trim())
    .filter(Boolean);
}

function extractOrgaosAnuentesFromField(orgaoField: string | null): string[] {
  if (!orgaoField) return [];
  
  return orgaoField
    .split(/[,;\n]/)
    .map(o => o.trim())
    .filter(Boolean);
}

function determineAdvancedTaskStatus(task: any, customFields: Record<string, any>): string {
  // Status customizado se existir
  const customStatus = findFieldValueAdvanced(customFields, ['Status', 'Stage', 'Situacao', 'Estado']);
  if (customStatus) return customStatus;
  
  // Status baseado em completed
  if (task.completed) return 'Concluído';
  
  // Status baseado em data
  if (task.due_date && new Date(task.due_date) < new Date()) return 'Atrasado';
  
  return 'Em Progresso';
}

function extractReferenceFromTitle(title: string): string {
  const patterns = [
    /\(([^)]+)\)/,           // (REF)
    /ref[:\s]*([a-z0-9\-]+)/i, // ref: ABC
    /\#([a-z0-9\-]+)/i       // #ABC
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  
  return '';
}

function extractCompanyFromTitle(title: string): string | null {
  const patterns = [
    /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]*?)(?:\s*\(|$)/i,
    /^(\d+)\s*[-–]\s*([A-Z][A-Z\s&\.]+)/i,
    /^([A-Z][A-Z\s&\.]{2,})(?:\s*\(|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const company = (match[2] || match[1])?.trim().toUpperCase();
      if (company && company.length > 1) return company;
    }
  }
  
  return null;
}

function calculateAdvancedMetrics(trackings: any[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  // Distribuições corrigidas para a estrutura real
  const distributions = {
    status: {} as Record<string, number>,
    company: {} as Record<string, number>,
    vessel: {} as Record<string, number>,
    terminal: {} as Record<string, number>,
    products: {} as Record<string, number>,
    orgaosAnuentes: {} as Record<string, number>,
    sections: {} as Record<string, number>,
    responsible: {} as Record<string, number>,
    exporters: {} as Record<string, number>,
    despachantes: {} as Record<string, number>,
    transportadoras: {} as Record<string, number>
  };
  
  trackings.forEach(tracking => {
    // Status
    const status = tracking.status || 'Não definido';
    distributions.status[status] = (distributions.status[status] || 0) + 1;
    
    // Company
    const company = tracking.company || 'Não identificado';
    distributions.company[company] = (distributions.company[company] || 0) + 1;
    
    // Vessel (NAVIO)
    if (tracking.transport?.vessel) {
      distributions.vessel[tracking.transport.vessel] = (distributions.vessel[tracking.transport.vessel] || 0) + 1;
    }
    
    // Terminal
    if (tracking.transport?.terminal) {
      distributions.terminal[tracking.transport.terminal] = (distributions.terminal[tracking.transport.terminal] || 0) + 1;
    }
    
    // Products (PRODUTO)
    if (tracking.transport?.products && Array.isArray(tracking.transport.products)) {
      tracking.transport.products.forEach(product => {
        if (product) {
          distributions.products[product] = (distributions.products[product] || 0) + 1;
        }
      });
    }
    
    // Órgãos anuentes
    if (tracking.regulatory?.orgaosAnuentes && Array.isArray(tracking.regulatory.orgaosAnuentes)) {
      tracking.regulatory.orgaosAnuentes.forEach(orgao => {
        if (orgao) {
          distributions.orgaosAnuentes[orgao] = (distributions.orgaosAnuentes[orgao] || 0) + 1;
        }
      });
    }
    
    // Sections
    if (tracking.structure?.section) {
      distributions.sections[tracking.structure.section] = (distributions.sections[tracking.structure.section] || 0) + 1;
    }
    
    // Responsible
    if (tracking.schedule?.responsible) {
      distributions.responsible[tracking.schedule.responsible] = (distributions.responsible[tracking.schedule.responsible] || 0) + 1;
    }
    
    // Exporters (Exportador)
    if (tracking.transport?.exporter) {
      distributions.exporters[tracking.transport.exporter] = (distributions.exporters[tracking.transport.exporter] || 0) + 1;
    }
    
    // Despachantes
    if (tracking.transport?.despachante) {
      distributions.despachantes[tracking.transport.despachante] = (distributions.despachantes[tracking.transport.despachante] || 0) + 1;
    }
    
    // Transportadoras
    if (tracking.transport?.transportadora) {
      distributions.transportadoras[tracking.transport.transportadora] = (distributions.transportadoras[tracking.transport.transportadora] || 0) + 1;
    }
  });
  
  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    
    // Distribuições corrigidas
    statusDistribution: distributions.status,
    exporterDistribution: distributions.exporters, // Compatibilidade com código existente
    companyDistribution: distributions.company,
    vesselDistribution: distributions.vessel,
    terminalDistribution: distributions.terminal,
    productDistribution: distributions.products,
    orgaosAnuentesDistribution: distributions.orgaosAnuentes,
    sectionDistribution: distributions.sections,
    responsibleDistribution: distributions.responsible,
    despachantesDistribution: distributions.despachantes,
    transportadorasDistribution: distributions.transportadoras,
    
    // Para compatibilidade com dashboard existente
    armadorDistribution: distributions.vessel, // vessel = armador no contexto marítimo
    
    // Contadores únicos
    uniqueCompanies: Object.keys(distributions.company).length,
    uniqueVessels: Object.keys(distributions.vessel).length,
    uniqueTerminals: Object.keys(distributions.terminal).length,
    uniqueProducts: Object.keys(distributions.products).length,
    uniqueOrgaosAnuentes: Object.keys(distributions.orgaosAnuentes).length,
    uniqueSections: Object.keys(distributions.sections).length,
    uniqueResponsibles: Object.keys(distributions.responsible).length,
    uniqueExporters: Object.keys(distributions.exporters).length,
    uniqueShippingLines: Object.keys(distributions.vessel).length, // Compatibilidade
    allShippingLines: Object.keys(distributions.vessel),
    allTerminals: Object.keys(distributions.terminal),
    
    // Contadores totais
    totalAttachments: trackings.reduce((sum, t) => sum + (t.resources?.attachments?.length || 0), 0),
    totalContainers: trackings.reduce((sum, t) => {
      const containers = t.transport?.containers;
      return sum + (Array.isArray(containers) ? containers.length : 0);
    }, 0),
    
    // Timeline
    etdTimeline: generateTimelineFromDates(trackings, 'schedule.etd'),
    etaTimeline: generateTimelineFromDates(trackings, 'schedule.eta')
  };
}

function analyzeAllCustomFieldsAdvanced(tasks: any[]): any {
  const analysis = {
    totalFields: 0,
    uniqueFieldNames: new Set(),
    fieldFrequency: {} as Record<string, number>,
    fieldTypes: {} as Record<string, Set<string>>,
    fieldSamples: {} as Record<string, any[]>,
    valueDistribution: {} as Record<string, Record<string, number>>
  };
  
  tasks.forEach(task => {
    if (task.custom_fields && Array.isArray(task.custom_fields)) {
      task.custom_fields.forEach((field: any) => {
        if (field && field.name) {
          const fieldName = field.name;
          
          analysis.uniqueFieldNames.add(fieldName);
          analysis.fieldFrequency[fieldName] = (analysis.fieldFrequency[fieldName] || 0) + 1;
          
          // Tipos
          if (!analysis.fieldTypes[fieldName]) analysis.fieldTypes[fieldName] = new Set();
          if (field.resource_subtype) analysis.fieldTypes[fieldName].add(field.resource_subtype);
          if (field.type) analysis.fieldTypes[fieldName].add(field.type);
          
          // Amostras
          if (!analysis.fieldSamples[fieldName]) analysis.fieldSamples[fieldName] = [];
          if (analysis.fieldSamples[fieldName].length < 5) {
            const value = field.display_value || field.text_value || field.number_value || field.enum_value?.name;
            if (value && !analysis.fieldSamples[fieldName].includes(value)) {
              analysis.fieldSamples[fieldName].push(value);
            }
          }
          
          // Distribuição de valores
          if (!analysis.valueDistribution[fieldName]) analysis.valueDistribution[fieldName] = {};
          const value = field.display_value || field.text_value || field.number_value || field.enum_value?.name || 'null';
          analysis.valueDistribution[fieldName][value] = (analysis.valueDistribution[fieldName][value] || 0) + 1;
        }
      });
    }
  });
  
  analysis.totalFields = analysis.uniqueFieldNames.size;
  
  return {
    ...analysis,
    uniqueFieldNames: Array.from(analysis.uniqueFieldNames),
    fieldTypes: Object.fromEntries(
      Object.entries(analysis.fieldTypes).map(([k, v]) => [k, Array.from(v)])
    )
  };
}

function generateTimelineFromDates(trackings: any[], datePath: string): any[] {
  const timeline: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const dateValue = datePath.split('.').reduce((obj, key) => obj?.[key], tracking);
    if (dateValue) {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const month = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' });
          timeline[month] = (timeline[month] || 0) + 1;
        }
      } catch (e) {
        // Ignorar datas inválidas
      }
    }
  });
  
  return Object.entries(timeline)
    .map(([month, operations]) => ({ month, operations }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-12); // Últimos 12 meses
}