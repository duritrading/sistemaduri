// src/app/api/asana/robust/route.ts - Versão corrigida do erro de regex
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚀 INICIANDO API ROBUSTA - BUSCA COMPLETA');
    
    const asanaToken = process.env.ASANA_ACCESS_TOKEN;
    if (!asanaToken || asanaToken.trim() === '' || asanaToken === 'your_asana_token_here') {
      return NextResponse.json({
        success: false,
        error: 'Token do Asana não configurado'
      });
    }

    // Buscar dados do Asana com paginação completa
    const { tasks, project, workspace } = await fetchCompleteAsanaData(asanaToken);
    
    console.log(`📊 Processando ${tasks.length} tasks do projeto ${project.name}`);

    // Transformar tasks com estratégias robustas
    const trackings = tasks
      .filter((task: any) => task.name && task.name.trim())
      .filter((task: any) => !task.parent || task.parent.resource_type !== 'task') // Filtrar subtasks
      .map((task: any) => enhancedTransformTask(task))
      .filter((tracking: any) => tracking.company !== 'UNKNOWN');

    console.log(`✅ ${trackings.length} trackings principais processados`);

    // Calcular métricas completas
    const metrics = calculateCompleteMetrics(trackings);
    
    // Log de debug detalhado
    logDetailedInfo(trackings, metrics);

    return NextResponse.json({
      success: true,
      data: trackings,
      metrics,
      meta: {
        workspace: workspace.name,
        project: project.name,
        totalTasksFromAsana: tasks.length,
        mainTasksProcessed: trackings.length,
        lastSync: new Date().toISOString(),
        apiVersion: 'robust-v3-fixed'
      }
    });

  } catch (error) {
    console.error('❌ Erro na API Robusta:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar dados do Asana',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fetchCompleteAsanaData(token: string) {
  // 1. Buscar workspaces
  const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  const workspacesData = await workspacesResponse.json();
  const workspace = workspacesData.data?.[0];

  // 2. Buscar projetos
  const projectsResponse = await fetch(
    `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
  );
  const projectsData = await projectsResponse.json();
  const project = projectsData.data?.find((p: any) => 
    p.name && p.name.toLowerCase().includes('operacional')
  );

  if (!project) {
    throw new Error('Projeto Operacional não encontrado');
  }

  // 3. **BUSCAR TODAS AS TASKS COM PAGINAÇÃO**
  console.log('📄 Buscando TODAS as tasks com paginação...');
  const tasks = await fetchAllTasksWithPagination(token, project.gid);

  return { tasks, project, workspace };
}

async function fetchAllTasksWithPagination(token: string, projectGid: string): Promise<any[]> {
  const allTasks: any[] = [];
  let nextPageUri: string | null = null;
  let pageCount = 0;
  const maxPages = 50; // Aumentado para capturar mais tasks

  do {
    pageCount++;
    console.log(`📄 Página ${pageCount}...`);

    let url: string;
    if (nextPageUri) {
      url = nextPageUri;
    } else {
      // **CAMPOS ESSENCIAIS + parent para filtrar subtasks**
      url = `https://app.asana.com/api/1.0/tasks?project=${projectGid}&opt_fields=name,completed,assignee.name,custom_fields.name,custom_fields.text_value,custom_fields.number_value,custom_fields.enum_value.name,custom_fields.display_value,custom_fields.type,notes,created_at,modified_at,parent.resource_type,parent.name&limit=100`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Erro página ${pageCount}: ${response.status}`);
    }

    const data = await response.json();
    const tasks = data.data || [];
    
    console.log(`  ✅ Página ${pageCount}: ${tasks.length} tasks`);
    allTasks.push(...tasks);

    nextPageUri = data.next_page?.uri || null;

  } while (nextPageUri && pageCount < maxPages);

  console.log(`📊 Total coletado: ${allTasks.length} tasks em ${pageCount} páginas`);
  return allTasks;
}

function enhancedTransformTask(task: any): any {
  console.log(`\n🔄 Processando: ${task.name}`);
  
  // **EXTRAÇÃO MELHORADA DE EMPRESAS - CORRIGIDA**
  const titleInfo = extractEnhancedCompanyInfoFixed(task.name);
  const customFields = extractCustomFields(task.custom_fields || []);
  const notesInfo = extractFromNotes(task.notes || '');
  
  const combinedData = { ...titleInfo, ...customFields, ...notesInfo };

  const tracking = {
    id: generateId(task.name),
    asanaId: task.gid,
    title: task.name,
    company: combinedData.company || 'UNKNOWN',
    ref: combinedData.ref || '',
    status: determineStatus(task, combinedData),
    
    transport: {
      exporter: combinedData.exportador || combinedData.exporter || '',
      shippingCompany: combinedData.ciaTransporte || combinedData.armador || combinedData.shipping || '',
      vessel: combinedData.navio || combinedData.vessel || combinedData.ship || '',
      terminal: combinedData.terminal || '',
      blAwb: combinedData.blAwb || combinedData.bl || '',
      containers: parseArrayField(combinedData.cntr || combinedData.containers || ''),
      products: parseArrayField(combinedData.produto || combinedData.products || ''),
      invoice: combinedData.invoice || '',
      transportadora: combinedData.transportadora || ''
    },
    
    schedule: {
      etd: formatDate(combinedData.etd || ''),
      eta: formatDate(combinedData.eta || ''),
      responsible: task.assignee?.name || ''
    },
    
    regulatory: {
      orgaosAnuentes: parseArrayField(combinedData.orgaosAnuentes || ''),
      despachante: combinedData.despachante || '',
      canal: combinedData.canal || ''
    },
    
    financial: {
      adiantamento: combinedData.adiantamento || '',
      servicos: combinedData.servicos || ''
    },
    
    meta: {
      hasCustomFields: (task.custom_fields || []).length > 0,
      lastUpdate: formatDate(task.modified_at || new Date().toISOString()),
      dataSource: 'asana-robust-fixed',
      isSubtask: !!(task.parent && task.parent.resource_type === 'task')
    }
  };

  console.log(`  ✅ ${tracking.company} | ${tracking.transport.exporter} | ${tracking.status}`);
  return tracking;
}

// **EXTRAÇÃO CORRIGIDA DE EMPRESA DO TÍTULO - SEM matchAll**
function extractEnhancedCompanyInfoFixed(title: string): any {
  if (!title || !title.trim()) {
    return { company: 'UNKNOWN', ref: '', reference: '' };
  }

  console.log(`    🔍 Analisando título: "${title}"`);

  // **PADRÕES CORRIGIDOS - USANDO match() EM VEZ DE matchAll()**
  const patterns = [
    // Padrão principal: 661º UNIVAR (PO 4527659420)
    { regex: /^(\d+)º?\s+([A-Z][A-Z\s&\.]+?)(?:\s*\(([^)]*)\))?/i, refIndex: 1, companyIndex: 2, refIndex2: 3 },
    
    // Padrão com hífen: 661 - UNIVAR
    { regex: /^(\d+)\s*[-–]\s*([A-Z][A-Z\s&\.]+)/i, refIndex: 1, companyIndex: 2 },
    
    // Padrão simples: 661 UNIVAR
    { regex: /^(\d+)\s+([A-Z][A-Z\s&\.]+?)(?:\s|$)/i, refIndex: 1, companyIndex: 2 },
    
    // Padrão sem número inicial: UNIVAR (algo)
    { regex: /^([A-Z][A-Z\s&\.]{2,})(?:\s*\(|$)/i, companyIndex: 1 },
    
    // Padrão para ATACAMAX, BAPTISTELLA, etc.
    { regex: /^(\d+)?\s*([A-Z]{4,}[A-Z\s&]*)/i, refIndex: 1, companyIndex: 2 },
    
    // Padrão para empresas com pontos: E.P.R.
    { regex: /^(\d+)?\s*([A-Z]\.(?:[A-Z]\.)*[A-Z]\.?)/i, refIndex: 1, companyIndex: 2 }
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern.regex);
    if (match) {
      const ref = pattern.refIndex && match[pattern.refIndex] ? match[pattern.refIndex].trim() : '';
      const company = match[pattern.companyIndex] ? match[pattern.companyIndex].trim() : '';
      const reference = pattern.refIndex2 && match[pattern.refIndex2] ? match[pattern.refIndex2].trim() : '';

      if (company && company.length >= 3) {
        // Limpar e normalizar empresa
        const cleanCompany = company
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s&\.]/g, '')
          .trim()
          .toUpperCase();

        // Palavras a excluir
        const excludeWords = ['PO', 'REF', 'PROCESSO', 'CONTAINER', 'CNTR', 'BL', 'AWB', 'NAVIO', 'VESSEL'];
        if (!excludeWords.includes(cleanCompany) && cleanCompany.length >= 3) {
          console.log(`    ✅ Empresa encontrada: "${cleanCompany}" | Padrão: ${pattern.regex.source}`);
          return {
            ref: ref || '',
            company: cleanCompany,
            reference: reference || ''
          };
        }
      }
    }
  }

  console.log(`    ⚠️ Nenhuma empresa identificada em: "${title}"`);
  return { company: 'UNKNOWN', ref: '', reference: '' };
}

function extractCustomFields(customFields: any[]): any {
  const extracted: any = {};
  
  const fieldMappings: Record<string, string[]> = {
    exportador: ['Exportador', 'EXPORTADOR', 'exporter'],
    ciaTransporte: ['CIA DE TRANSPORTE', 'Cia de Transporte', 'Company', 'Shipping Company', 'ARMADOR'],
    navio: ['NAVIO', 'Navio', 'Vessel', 'Ship'],
    terminal: ['Terminal', 'TERMINAL'],
    produto: ['PRODUTO', 'Produto', 'Product', 'Products'],
    etd: ['ETD', 'etd'],
    eta: ['ETA', 'eta'],
    cntr: ['CNTR', 'Container', 'Containers'],
    blAwb: ['Nº BL/AWB', 'BL/AWB', 'BL', 'AWB'],
    invoice: ['INVOICE', 'Invoice'],
    orgaosAnuentes: ['Órgãos Anuentes', 'Orgaos Anuentes'],
    despachante: ['Despachante'],
    adiantamento: ['Adiantamento'],
    servicos: ['SERVICOS', 'SERVIÇOS', 'Serviços'],
    transportadora: ['TRANSPORTADORA', 'Transportadora'],
    canal: ['Canal'],
    status: ['Status', 'STATUS']
  };

  customFields.forEach((field: any) => {
    if (!field.name) return;
    
    const fieldValue = field.text_value || 
                      field.number_value?.toString() || 
                      field.enum_value?.name || 
                      field.display_value || 
                      '';
    
    if (!fieldValue.trim()) return;

    for (const [key, variations] of Object.entries(fieldMappings)) {
      if (variations.some(variation => 
        field.name.toLowerCase().includes(variation.toLowerCase()) ||
        variation.toLowerCase().includes(field.name.toLowerCase())
      )) {
        extracted[key] = fieldValue.trim();
        break;
      }
    }
  });

  return extracted;
}

function extractFromNotes(notes: string): any {
  if (!notes || !notes.trim()) return {};
  
  const extracted: any = {};
  const patterns = [
    { key: 'navio', pattern: /navio[:\s]+([^\n,]+)/i },
    { key: 'armador', pattern: /armador[:\s]+([^\n,]+)/i },
    { key: 'terminal', pattern: /terminal[:\s]+([^\n,]+)/i },
    { key: 'container', pattern: /container[:\s]+([^\n,]+)/i },
    { key: 'eta', pattern: /eta[:\s]+(\d{2}\/\d{2}\/\d{4})/i },
    { key: 'etd', pattern: /etd[:\s]+(\d{2}\/\d{2}\/\d{4})/i }
  ];

  patterns.forEach(({ key, pattern }) => {
    const match = notes.match(pattern);
    if (match) {
      extracted[key] = match[1].trim();
    }
  });

  return extracted;
}

function determineStatus(task: any, data: any): string {
  if (data.status && data.status.trim()) return data.status.trim();
  if (task.completed) return 'Concluído';
  if (data.eta && data.etd) return 'Em Progresso';
  return 'Em dia';
}

function parseArrayField(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value.split(/[,;\n|\/]/).map(item => item.trim()).filter(item => item.length > 0);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR');
    }
  } catch (e) {}
  
  return dateStr;
}

function generateId(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

function calculateCompleteMetrics(trackings: any[]): any {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  const statusDistribution: Record<string, number> = {};
  const exporterDistribution: Record<string, number> = {};
  const armadorDistribution: Record<string, number> = {};
  const productDistribution: Record<string, number> = {};
  const terminalSet = new Set<string>();
  const shippingLineSet = new Set<string>();
  
  let totalContainers = 0;
  
  trackings.forEach(tracking => {
    // Status
    if (tracking.status) {
      statusDistribution[tracking.status] = (statusDistribution[tracking.status] || 0) + 1;
    }
    
    // Exportador
    if (tracking.transport.exporter) {
      exporterDistribution[tracking.transport.exporter] = (exporterDistribution[tracking.transport.exporter] || 0) + 1;
    }
    
    // Armador/Shipping Company
    if (tracking.transport.shippingCompany) {
      armadorDistribution[tracking.transport.shippingCompany] = (armadorDistribution[tracking.transport.shippingCompany] || 0) + 1;
      shippingLineSet.add(tracking.transport.shippingCompany);
    }
    
    // Terminal
    if (tracking.transport.terminal) {
      terminalSet.add(tracking.transport.terminal);
    }
    
    // Produtos
    tracking.transport.products.forEach((product: string) => {
      if (product) {
        productDistribution[product] = (productDistribution[product] || 0) + 1;
      }
    });
    
    // Containers
    totalContainers += tracking.transport.containers.length;
  });

  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalContainers,
    uniqueExporters: Object.keys(exporterDistribution).length,
    uniqueShippingLines: shippingLineSet.size,
    uniqueTerminals: terminalSet.size,
    statusDistribution,
    exporterDistribution,
    armadorDistribution,
    productDistribution,
    orgaosAnuentesDistribution: {},
    etdTimeline: {}
  };
}

function logDetailedInfo(trackings: any[], metrics: any): void {
  console.log('\n=== RESUMO COMPLETO ===');
  console.log(`Total trackings: ${trackings.length}`);
  console.log(`Empresas únicas: ${new Set(trackings.map(t => t.company)).size}`);
  console.log(`Exportadores únicos: ${metrics.uniqueExporters}`);
  
  // Log das empresas identificadas
  const companies = [...new Set(trackings.map(t => t.company))];
  console.log('\n🏢 Empresas identificadas:');
  companies.forEach(company => {
    const count = trackings.filter(t => t.company === company).length;
    console.log(`  ${company}: ${count} tasks`);
  });
  
  console.log('\n📊 Métricas finais:', {
    total: metrics.totalOperations,
    active: metrics.activeOperations,
    completed: metrics.completedOperations,
    rate: metrics.effectiveRate
  });
}