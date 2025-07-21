// src/app/api/asana/unified/route.ts - EXTRAÇÃO OTIMIZADA PARA GRÁFICOS
import { NextRequest, NextResponse } from 'next/server';

// ✅ Cache otimizado
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const companyCache = new Map<string, { data: any; timestamp: number }>();

// ✅ CAMPOS EXATOS com ordem de prioridade
const EXACT_CUSTOM_FIELDS = [
  'Prioridade', 'Status', 'Adiantamento', 'EMPRESA', 'SERVIÇOS',
  'Benefício Fiscal', 'PRODUTO', 'ETD', 'ETA', 'CNTR', 'Nº BL/AWB',
  'INVOICE', 'Canal', 'Exportador', 'CIA DE TRANSPORTE', 'NAVIO',
  'Terminal', 'Órgãos Anuentes', 'Despachante', 'TRANSPORTADORA',
  'Fim do Freetime', 'Fim da armazenagem'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // ✅ Cache check
    const cacheKey = companyFilter || 'ALL_COMPANIES';
    const cachedData = companyCache.get(cacheKey);
    
    if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        ...cachedData.data,
        meta: { ...cachedData.data.meta, cached: true }
      });
    }

    // ✅ Token validation
    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado',
        code: 'MISSING_TOKEN'
      }, { status: 401 });
    }

    // ✅ STEP 1: Get workspace
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!workspacesResponse.ok) {
      throw new Error(`Falha na autenticação: ${workspacesResponse.status}`);
    }
    
    const workspacesData = await workspacesResponse.json();
    const workspace = workspacesData.data?.[0];

    if (!workspace) {
      throw new Error('Nenhum workspace encontrado');
    }

    // ✅ STEP 2: Find operational project
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const projectsData = await projectsResponse.json();
    const operationalProject = projectsData.data?.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      return NextResponse.json({
        success: false,
        error: 'Projeto operacional não encontrado',
        availableProjects: projectsData.data?.map((p: any) => ({ gid: p.gid, name: p.name }))
      }, { status: 404 });
    }

    // ✅ STEP 3: Get sections
    const sectionsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects/${operationalProject.gid}/sections?opt_fields=name,gid,created_at`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const sectionsData = await sectionsResponse.json();
    const sections = sectionsData.data || [];

    // ✅ STEP 4: Get tasks with campos otimizados para gráficos
    const optFields = [
      'name', 'completed', 'created_at', 'modified_at',
      'assignee.name',
      'memberships.section.name',
      'memberships.section.gid',
      'custom_fields.name',
      'custom_fields.display_value',
      'custom_fields.text_value', 
      'custom_fields.number_value',
      'custom_fields.enum_value.name',
      'custom_fields.multi_enum_values.name',
      'custom_fields.date_value',
      'custom_fields.people_value.name'
    ].join(',');

    let allTasks: any[] = [];
    let offset: string | undefined;
    let requestCount = 0;

    // ✅ Fetch all tasks with pagination
    do {
      requestCount++;
      if (requestCount > 50) break;

      const endpoint = `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=${optFields}&limit=100${
        offset ? `&offset=${offset}` : ''
      }`;

      const tasksResponse = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(30000)
      });

      if (!tasksResponse.ok) {
        throw new Error(`Erro ao buscar tasks: ${tasksResponse.status}`);
      }

      const tasksData = await tasksResponse.json();
      const tasks = tasksData.data || [];
      
      allTasks.push(...tasks);
      offset = tasksData.next_page?.offset;
      
    } while (offset);

    // ✅ STEP 5: Process tasks com extração otimizada para gráficos
    const processedTrackings = allTasks.map((task: any) => {
      try {
        const customFields = extractExactCustomFields(task.custom_fields || []);
        const company = extractCompanyName(task.name) || customFields['EMPRESA'] || 'NÃO_IDENTIFICADO';
        
        // ✅ Extract section safely
        let asanaSection = 'Sem seção';
        let maritimeStatus = 'Abertura do Processo';
        
        try {
          asanaSection = extractAsanaSection(task, sections);
          maritimeStatus = mapSectionToMaritimeStatus(asanaSection, task.completed, customFields['Status']);
        } catch (sectionError) {
          maritimeStatus = mapStatusToMaritimeStage(customFields['Status'], task.completed);
        }
        
        return {
          id: task.gid,
          asanaId: task.gid,
          title: task.name,
          company,
          ref: extractReference(task.name),
          status: customFields['Status'] || (task.completed ? 'Concluído' : 'Em Progresso'),
          
          transport: {
            exporter: customFields['Exportador'] || null,
            company: customFields['CIA DE TRANSPORTE'] || null,
            vessel: customFields['NAVIO'] || null,
            blAwb: customFields['Nº BL/AWB'] || null,
            containers: parseListField(customFields['CNTR']),
            terminal: customFields['Terminal'] || null,
            products: parseListField(customFields['PRODUTO']), // ✅ Produtos processados corretamente
            transportadora: customFields['TRANSPORTADORA'] || null,
            despachante: customFields['Despachante'] || null
          },
          
          schedule: {
            etd: customFields['ETD'] || null,
            eta: customFields['ETA'] || null,
            fimFreetime: customFields['Fim do Freetime'] || null,
            fimArmazenagem: customFields['Fim da armazenagem'] || null,
            responsible: task.assignee?.name || null,
            createdAt: task.created_at,
            modifiedAt: task.modified_at
          },
          
          business: {
            empresa: customFields['EMPRESA'] || null,
            servicos: customFields['SERVIÇOS'] || null,
            beneficioFiscal: customFields['Benefício Fiscal'] || null,
            canal: customFields['Canal'] || null,
            prioridade: customFields['Prioridade'] || null,
            adiantamento: customFields['Adiantamento'] || null
          },
          
          documentation: {
            invoice: customFields['INVOICE'] || null,
            blAwb: customFields['Nº BL/AWB'] || null
          },
          
          regulatory: {
            orgaosAnuentes: parseListField(customFields['Órgãos Anuentes']) // ✅ Órgãos processados corretamente
          },
          
          structure: {
            section: asanaSection
          },
          
          maritimeStatus,
          customFields,
          lastUpdate: new Date().toISOString()
        };
      } catch (error) {
        // ✅ Return minimal tracking object em caso de erro
        return {
          id: task.gid,
          asanaId: task.gid,
          title: task.name || 'Título não disponível',
          company: 'NÃO_IDENTIFICADO',
          ref: '',
          status: 'Erro',
          transport: { exporter: null, company: null, vessel: null, blAwb: null, containers: [], terminal: null, products: [], transportadora: null, despachante: null },
          schedule: { etd: null, eta: null, fimFreetime: null, fimArmazenagem: null, responsible: null, createdAt: task.created_at, modifiedAt: task.modified_at },
          business: { empresa: null, servicos: null, beneficioFiscal: null, canal: null, prioridade: null, adiantamento: null },
          documentation: { invoice: null, blAwb: null },
          regulatory: { orgaosAnuentes: [] },
          structure: { section: 'Sem seção' },
          maritimeStatus: 'Abertura do Processo',
          customFields: {},
          lastUpdate: new Date().toISOString()
        };
      }
    });

    // ✅ Filter by company if specified
    const filteredTrackings = companyFilter 
      ? processedTrackings.filter(tracking => tracking.company === companyFilter)
      : processedTrackings;

    // ✅ Generate metrics otimizadas
    const metrics = {
      totalTasks: allTasks.length,
      processedTrackings: filteredTrackings.length,
      companies: [...new Set(processedTrackings.map(t => t.company))].filter(Boolean),
      statusDistribution: filteredTrackings.reduce((acc, t) => {
        acc[t.maritimeStatus] = (acc[t.maritimeStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sectionDistribution: filteredTrackings.reduce((acc, t) => {
        const section = t.structure?.section || 'Sem seção';
        acc[section] = (acc[section] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      // ✅ Métricas adicionais para debug dos gráficos
      chartDataQuality: {
        exportersWithData: filteredTrackings.filter(t => t.transport?.exporter).length,
        productsWithData: filteredTrackings.filter(t => t.transport?.products?.length > 0).length,
        transportCompaniesWithData: filteredTrackings.filter(t => t.transport?.company).length,
        orgaosAnuentesWithData: filteredTrackings.filter(t => t.regulatory?.orgaosAnuentes?.length > 0).length,
        etdWithData: filteredTrackings.filter(t => t.schedule?.etd).length
      }
    };

    const result = {
      success: true,
      data: filteredTrackings,
      metrics,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: allTasks.length,
        processedTrackings: filteredTrackings.length,
        sectionsFound: sections.length,
        sectionNames: sections.map((s: any) => s.name),
        customFieldsExtracted: EXACT_CUSTOM_FIELDS.length,
        lastSync: new Date().toISOString(),
        extractionLevel: 'OPTIMIZED_FOR_CHARTS'
      }
    };

    // ✅ Cache result
    companyCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({
      success: false,
      data: [],
      metrics: {
        totalTasks: 0,
        processedTrackings: 0,
        companies: [],
        statusDistribution: {},
        sectionDistribution: {},
        chartDataQuality: {
          exportersWithData: 0,
          productsWithData: 0,
          transportCompaniesWithData: 0,
          orgaosAnuentesWithData: 0,
          etdWithData: 0
        }
      },
      meta: {
        workspace: 'Erro',
        project: 'Erro',
        totalTasks: 0,
        processedTrackings: 0,
        sectionsFound: 0,
        sectionNames: [],
        customFieldsExtracted: 0,
        lastSync: new Date().toISOString(),
        extractionLevel: 'ERROR_FALLBACK'
      },
      error: 'Erro na extração do Asana',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// ✅ EXTRACT EXACT CUSTOM FIELDS - Otimizado para gráficos
function extractExactCustomFields(customFields: any[]): Record<string, any> {
  const fields: Record<string, any> = {};
  
  if (!Array.isArray(customFields)) return fields;

  customFields.forEach(field => {
    if (!field?.name || !EXACT_CUSTOM_FIELDS.includes(field.name)) return;
    
    let value: any = null;

    // ✅ Ordem de prioridade otimizada para extração precisa
    if (field.display_value !== undefined && field.display_value !== null && field.display_value !== '') {
      value = field.display_value;
    } else if (field.text_value !== undefined && field.text_value !== null && field.text_value !== '') {
      value = field.text_value;
    } else if (field.number_value !== undefined && field.number_value !== null) {
      value = field.number_value;
    } else if (field.enum_value?.name) {
      value = field.enum_value.name;
    } else if (field.multi_enum_values?.length > 0) {
      value = field.multi_enum_values.map((v: any) => v.name).join(', ');
    } else if (field.date_value) {
      value = field.date_value;
    } else if (field.people_value?.length > 0) {
      value = field.people_value.map((p: any) => p.name).join(', ');
    }

    if (value !== null) {
      fields[field.name] = value;
    }
  });

  return fields;
}

// ✅ PARSE LIST FIELD - Função otimizada para processar arrays/strings
function parseListField(value: any): string[] {
  if (!value) return [];
  
  if (Array.isArray(value)) {
    return value.filter(item => item && typeof item === 'string' && item.trim() !== '');
  }
  
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(/[,;|]/) // Split por vírgula, ponto-vírgula ou pipe
      .map(item => item.trim())
      .filter(item => item !== '');
  }
  
  return [];
}

// ✅ EXTRACT ASANA SECTION SAFELY
function extractAsanaSection(task: any, sections: any[]): string {
  try {
    if (!task || !sections || !Array.isArray(sections)) {
      return 'Sem seção';
    }
    
    if (task.memberships && Array.isArray(task.memberships) && task.memberships.length > 0) {
      for (const membership of task.memberships) {
        if (membership && membership.section && membership.section.name) {
          return membership.section.name;
        }
      }
      
      for (const membership of task.memberships) {
        if (membership && membership.section && membership.section.gid) {
          const section = sections.find((s: any) => s && s.gid === membership.section.gid);
          if (section && section.name) {
            return section.name;
          }
        }
      }
    }
    
    return 'Sem seção';
  } catch (error) {
    return 'Sem seção';
  }
}

// ✅ MAP SECTION TO MARITIME STATUS
function mapSectionToMaritimeStatus(sectionName: string, isCompleted: boolean, customFieldStatus?: string): string {
  try {
    if (isCompleted) return 'Processos Finalizados';
    if (!sectionName || typeof sectionName !== 'string') return 'Abertura do Processo';
    
    const cleanSectionName = sectionName.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
    
    const sectionMap: Record<string, string> = {
      'Processos Finalizados': 'Processos Finalizados',
      'Fechamento': 'Fechamento',
      'Entrega': 'Entrega',
      'Chegada da Carga': 'Chegada da Carga',
      'Rastreio da Carga': 'Rastreio da Carga',
      'Pré Embarque': 'Pré Embarque',
      'Abertura do Processo': 'Abertura do Processo'
    };
    
    if (sectionMap[cleanSectionName]) return sectionMap[cleanSectionName];
    
    const lowerSectionName = cleanSectionName.toLowerCase();
    for (const [key, value] of Object.entries(sectionMap)) {
      if (key.toLowerCase() === lowerSectionName) return value;
    }
    
    return 'Abertura do Processo';
  } catch (error) {
    return 'Abertura do Processo';
  }
}

// ✅ FALLBACK STATUS MAPPING
function mapStatusToMaritimeStage(asanaStatus: string | null, isCompleted: boolean): string {
  if (isCompleted) return 'Processos Finalizados';
  if (!asanaStatus) return 'Abertura do Processo';
  
  const statusMap: Record<string, string> = {
    'Concluído': 'Processos Finalizados',
    'Em Progresso': 'Rastreio da Carga',
    'A Embarcar': 'Pré Embarque'
  };
  
  return statusMap[asanaStatus] || 'Abertura do Processo';
}

// ✅ EXTRACT COMPANY NAME
function extractCompanyName(title: string): string | null {
  if (!title) return null;
  
  const patterns = [
    /^\d+[º°]?\s*[-–]\s*([A-Z][A-Z\s&.-]+?)(?:\s*\(|$)/,
    /^\d+[º°]?\s+([A-Z][A-Z\s&.-]+?)(?:\s*\(|$)/,
    /^([A-Z][A-Z\s&.-]{2,}?)(?:\s*\(|$)/
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) {
      const company = match[1].trim().toUpperCase();
      if (company.length >= 2 && company.length <= 50) {
        return company;
      }
    }
  }
  
  return null;
}

// ✅ EXTRACT REFERENCE
function extractReference(title: string): string {
  if (!title) return '';
  
  const patterns = [
    /\(([^)]+)\)/,
    /ref[:\s]*([a-z0-9\-]+)/i,
    /\#([a-z0-9\-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1];
  }
  
  return '';
}