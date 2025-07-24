// src/app/api/asana/unified/route.ts - STRICT COMPANY EXTRACTION ONLY
// SÓ ACEITA: "número + empresa" OU "número + empresa + (detalhes)"
import { NextRequest, NextResponse } from 'next/server';

// ✅ CACHE SYSTEM - Otimizado para performance
const companyCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ✅ CUSTOM FIELDS EXATOS do Asana
const EXACT_CUSTOM_FIELDS = [
  'Prioridade', 'Status', 'Adiantamento', 'EMPRESA', 'SERVIÇOS',
  'Benefício Fiscal', 'PRODUTO', 'ETD', 'ETA', 'CNTR', 'Nº BL/AWB',
  'INVOICE', 'Canal', 'Exportador', 'CIA DE TRANSPORTE', 'NAVIO',
  'Terminal', 'Órgãos Anuentes', 'Despachante', 'TRANSPORTADORA',
  'Fim do Freetime', 'Fim da armazenagem'
];

// ✅ NORMALIZAÇÃO DE NOME DA EMPRESA
function normalizeCompanyName(companyName: string | null | undefined): string {
  if (!companyName) return '';
  return companyName
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&.-]/g, '');
}

// ✅ EXTRAÇÃO ESTRITA - SÓ ACEITA FORMATO: "número + empresa"
function extractCompanyName(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  // ✅ Limpar título (remover timestamps se houver)
  let cleanTitle = title.trim();
  cleanTitle = cleanTitle.replace(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+[A-Z]{3,4}\s+/, '').trim();
  
  // ✅ PADRÃO ESTRITO: APENAS "número + empresa" ou "número + empresa + (detalhes)"
  // ✅ Aceitos: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "13º.1 NATURALLY"
  // ❌ Rejeitados: "DURI TRADING", "EXPOFRUT (IMPORTAÇÃO)", qualquer coisa sem número
  
  const strictPattern = /^\d+º(?:\.\d+)?\s+([A-Z][A-Za-z\s&.'-]+?)(?:\s*\(.*)?$/i;
  const match = cleanTitle.match(strictPattern);
  
  if (match && match[1]) {
    let company = match[1].trim().toUpperCase();
    
    // ✅ Validações de qualidade
    if (company.length >= 2 &&           // Mínimo 2 caracteres
        company.length <= 50 &&          // Máximo 50 caracteres  
        company.match(/[A-Z]/) &&        // Deve ter pelo menos uma letra
        !company.match(/^[\d\s]*$/)) {   // Não pode ser só números/espaços
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Empresa aceita: "${cleanTitle}" → "${company}"`);
      }
      return company;
    }
  }
  
  // ✅ DEBUG: Log de títulos rejeitados
  if (process.env.NODE_ENV === 'development') {
    console.log(`❌ Título rejeitado (não segue padrão número+empresa): "${cleanTitle}"`);
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

// ✅ PARSE LIST FIELDS
function parseListField(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[,;|\n]/).map(v => v.trim()).filter(Boolean);
  }
  return [];
}

// ✅ EXTRACT CUSTOM FIELDS
function extractExactCustomFields(customFieldsArray: any[]): Record<string, any> {
  const extracted: Record<string, any> = {};
  
  if (!Array.isArray(customFieldsArray)) return extracted;
  
  customFieldsArray.forEach(field => {
    if (!field?.name) return;
    
    let value = null;
    
    if (field.display_value && field.display_value !== 'null') {
      value = field.display_value;
    } else if (field.text_value) {
      value = field.text_value;
    } else if (field.number_value !== null && field.number_value !== undefined) {
      value = field.number_value;
    } else if (field.enum_value?.name) {
      value = field.enum_value.name;
    } else if (field.multi_enum_values?.length > 0) {
      value = field.multi_enum_values.map((ev: any) => ev.name).join(', ');
    } else if (field.date_value) {
      value = field.date_value;
    } else if (field.people_value?.length > 0) {
      value = field.people_value.map((pv: any) => pv.name).join(', ');
    }
    
    if (value !== null && value !== '') {
      extracted[field.name] = value;
    }
  });
  
  return extracted;
}

// ✅ EXTRACT ASANA SECTION
function extractAsanaSection(task: any, sections: any[]): string {
  try {
    if (!task.memberships || !Array.isArray(task.memberships)) {
      return 'Sem seção';
    }
    
    const membership = task.memberships[0];
    if (!membership?.section) return 'Sem seção';
    
    const sectionGid = membership.section.gid;
    if (!sectionGid) return 'Sem seção';
    
    const section = sections.find(s => s.gid === sectionGid);
    return section?.name || 'Sem seção';
  } catch (error) {
    return 'Sem seção';
  }
}

// ✅ MAP SECTION TO MARITIME STATUS
function mapSectionToMaritimeStatus(sectionName: string, isCompleted: boolean, customStatus?: string): string {
  try {
    if (isCompleted) return 'Processos Finalizados';
    if (!sectionName || typeof sectionName !== 'string') return 'Abertura do Processo';
    
    const cleanSectionName = sectionName
      .replace(/[^\w\s\-áàâãéèêíìîóòôõúùûç]/gi, '')
      .trim();
    
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

// ✅ MAIN API HANDLER
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyFilter = searchParams.get('company');
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // ✅ Cache check
    const cacheKey = `asana-data-${companyFilter || 'all'}`;
    if (!forceRefresh && companyCache.has(cacheKey)) {
      const cached = companyCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`🚀 Cache hit for ${cacheKey}`);
        return NextResponse.json(cached.data);
      }
    }

    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('ASANA_ACCESS_TOKEN não configurado');
    }

    console.log(`🔥 Iniciando sync Asana STRICT MODE ${companyFilter ? `para empresa: ${companyFilter}` : '(todas empresas)'}`);

    // ✅ STEP 1: Get workspace
    const workspacesResponse = await fetch(
      'https://app.asana.com/api/1.0/workspaces?limit=50',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
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

    // ✅ STEP 4: Get tasks with campos otimizados
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

    // ✅ STEP 5: Process tasks com extração ESTRITA
    const processedTrackings = allTasks.map((task: any) => {
      try {
        const customFields = extractExactCustomFields(task.custom_fields || []);
        
        // ✅ EXTRAÇÃO ESTRITA - SÓ ACEITA PADRÃO "número + empresa"
        // ❌ REMOVIDOS TODOS OS FALLBACKS - Sem custom fields, sem outros padrões
        const company = extractCompanyName(task.name) || 'NÃO_IDENTIFICADO';
        
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
            products: parseListField(customFields['PRODUTO']),
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
            orgaosAnuentes: parseListField(customFields['Órgãos Anuentes'])
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

    // ✅ FILTRO POR EMPRESA COM NORMALIZAÇÃO
    const filteredTrackings = companyFilter 
      ? processedTrackings.filter(tracking => {
          const trackingCompany = normalizeCompanyName(tracking.company);
          const filterCompany = normalizeCompanyName(companyFilter);
          
          // ✅ Comparação exata primeiro
          if (trackingCompany === filterCompany) return true;
          
          // ✅ Fallback: Contains (para casos onde o nome pode estar parcial)
          if (trackingCompany.includes(filterCompany) || filterCompany.includes(trackingCompany)) {
            return true;
          }
          
          return false;
        })
      : processedTrackings;

    // ✅ Separar tarefas válidas das inválidas para debug
    const validCompanies = filteredTrackings.filter(t => t.company !== 'NÃO_IDENTIFICADO');
    const invalidTasks = filteredTrackings.filter(t => t.company === 'NÃO_IDENTIFICADO');

    // ✅ DEBUG LOG para modo strict
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 STRICT MODE - Filtro: "${companyFilter || 'TODOS'}"`);
      console.log(`📊 Total tarefas: ${processedTrackings.length}`);
      console.log(`✅ Empresas válidas (formato número+nome): ${validCompanies.length}`);
      console.log(`❌ Tarefas rejeitadas (sem padrão): ${invalidTasks.length}`);
      console.log(`🏢 Empresas encontradas:`, Array.from(new Set(validCompanies.map(t => t.company))));
    }

    // ✅ Generate metrics otimizadas
    const metrics = {
      totalTasks: allTasks.length,
      processedTrackings: filteredTrackings.length,
      validCompanies: validCompanies.length,
      invalidTasks: invalidTasks.length,
      
      // ✅ SÓ EMPRESAS COM FORMATO VÁLIDO
      companies: Array.from(new Set(
        validCompanies
          .map(t => t.company)
          .filter((company): company is string => 
            Boolean(company) && 
            company !== 'NÃO_IDENTIFICADO' && 
            company.trim() !== ''
          )
      )),
      
      statusDistribution: filteredTrackings.reduce((acc, t) => {
        acc[t.maritimeStatus] = (acc[t.maritimeStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
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
        extractionLevel: 'STRICT_NUMBER_PLUS_COMPANY_ONLY',
        companyFilter: companyFilter || null,
        processingTime: `${Date.now() - startTime}ms`,
        strictMode: true,
        validCompaniesFound: validCompanies.length,
        rejectedTasks: invalidTasks.length
      }
    };

    // ✅ Cache result
    companyCache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log(`✅ STRICT SYNC concluído em ${Date.now() - startTime}ms. Empresas válidas: ${validCompanies.length}/${allTasks.length}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erro na API unified:', error);
    
    return NextResponse.json({
      success: false,
      data: [],
      metrics: {
        totalTasks: 0,
        processedTrackings: 0,
        validCompanies: 0,
        invalidTasks: 0,
        companies: [],
        statusDistribution: {},
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
        extractionLevel: 'ERROR_FALLBACK',
        companyFilter: null,
        processingTime: `${Date.now() - startTime}ms`,
        strictMode: true,
        validCompaniesFound: 0,
        rejectedTasks: 0
      },
      error: 'Erro na extração do Asana',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}