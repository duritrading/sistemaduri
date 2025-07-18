// src/app/api/asana/comprehensive-trackings/route.ts
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    
    if (workspaces.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum workspace encontrado'
      }, { status: 404 });
    }

    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);
    
    console.log(`Found ${tasks.length} tasks in Operacional project`);

    // Comprehensive transformation
    const trackings = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => comprehensiveTransformAsanaTask(task));

    // Calculate comprehensive metrics
    const comprehensiveMetrics = calculateComprehensiveMetrics(trackings);

    console.log(`Transformed ${trackings.length} trackings with comprehensive data`);

    return NextResponse.json({
      success: true,
      data: trackings,
      metrics: comprehensiveMetrics,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: tasks.length,
        lastSync: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Comprehensive Trackings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar dados abrangentes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function comprehensiveTransformAsanaTask(task: any) {
  // Step 1: Extract ALL possible data sources
  const allFieldsData = extractAllDataSources(task);
  
  // Step 2: Build comprehensive object
  const comprehensiveData = {
    id: generateCleanId(task.name),
    asanaId: task.gid,
    title: task.name,
    description: task.notes || '',
    status: determineStatus(task, allFieldsData),
    lastUpdate: new Date(task.modified_at || task.created_at).toLocaleDateString('pt-BR'),
    
    // Transport information
    transport: {
      exporter: extractRobustField(allFieldsData, 'exporter') || extractExporterFromTitle(task.name),
      company: extractRobustField(allFieldsData, 'company'),
      vessel: extractRobustField(allFieldsData, 'vessel'),
      blAwb: extractRobustField(allFieldsData, 'bl'),
      containers: extractContainers(allFieldsData),
      terminal: extractRobustField(allFieldsData, 'terminal'),
      products: extractProducts(allFieldsData),
      commodity: extractRobustField(allFieldsData, 'commodity')
    },
    
    // Schedule information
    schedule: {
      etd: extractAndFormatDate(allFieldsData, 'etd'),
      eta: extractAndFormatDate(allFieldsData, 'eta'),
      freetime: extractAndFormatDate(allFieldsData, 'freetime'),
      responsible: task.assignee?.name || extractRobustField(allFieldsData, 'responsible') || 'Não atribuído',
      operationalStatus: extractOperationalStatus(allFieldsData, task.completed)
    },
    
    // Regulatory information
    regulatory: {
      orgaosAnuentes: extractOrgaosAnuentes(allFieldsData),
      customsBroker: extractRobustField(allFieldsData, 'despachante'),
      licenses: extractLicenses(allFieldsData)
    },
    
    // Financial information
    financial: {
      currency: extractRobustField(allFieldsData, 'currency'),
      value: extractRobustField(allFieldsData, 'value'),
      invoices: extractInvoices(allFieldsData)
    },
    
    // Partners
    partners: {
      dispatcher: extractRobustField(allFieldsData, 'despachante'),
      transporter: extractRobustField(allFieldsData, 'transportador'),
      forwarder: extractRobustField(allFieldsData, 'forwarder')
    }
  };

  return comprehensiveData;
}

function extractAllDataSources(task: any): Record<string, string> {
  const allData: Record<string, string> = {};
  
  // Extract from custom fields with all possible normalizations
  if (task.custom_fields && Array.isArray(task.custom_fields)) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        const value = field.text_value || 
                     field.number_value?.toString() || 
                     field.enum_value?.name ||
                     field.display_value ||
                     '';
        
        if (value) {
          // Store with multiple key variations
          const baseKey = field.name.toLowerCase();
          const normalizedKey = baseKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          const underscoreKey = baseKey.replace(/[^a-z0-9]/g, '_');
          
          allData[baseKey] = value;
          allData[normalizedKey] = value;
          allData[underscoreKey] = value;
          allData[field.name] = value; // Keep original
        }
      }
    });
  }
  
  // Extract from notes with comprehensive patterns
  const notesData = extractFromNotesComprehensive(task.notes || '');
  Object.assign(allData, notesData);
  
  // Extract from title
  const titleData = extractFromTitle(task.name);
  Object.assign(allData, titleData);
  
  return allData;
}

function extractRobustField(allData: Record<string, string>, fieldType: string): string {
  const fieldMappings: Record<string, string[]> = {
    exporter: [
      'exportador', 'exporter', 'shipper', 'consignor', 'fornecedor', 'cliente', 'client'
    ],
    company: [
      'armador', 'companhia', 'company', 'shipping_company', 'linha_maritima', 
      'carrier', 'shipping_line', 'cia', 'linha'
    ],
    vessel: [
      'navio', 'vessel', 'ship', 'embarcacao', 'vessel_name', 'nome_navio',
      'nome_do_navio', 'ship_name'
    ],
    bl: [
      'bl_awb', 'bl', 'awb', 'bill_of_lading', 'conhecimento', 'bl_number',
      'house_bl', 'master_bl', 'bl_no'
    ],
    terminal: [
      'terminal', 'port', 'porto', 'terminal_porto', 'porto_destino',
      'discharge_port', 'pod', 'porto_descarga'
    ],
    etd: [
      'etd', 'embarque', 'sailing', 'partida', 'data_embarque', 'etd_date',
      'sailing_date', 'departure'
    ],
    eta: [
      'eta', 'chegada', 'arrival', 'previsao_chegada', 'data_chegada',
      'eta_date', 'arrival_date'
    ],
    freetime: [
      'freetime', 'fim_freetime', 'free_time', 'prazo_freetime',
      'free_time_end', 'prazo_livre'
    ],
    responsible: [
      'responsavel', 'responsible', 'encarregado', 'coordenador',
      'responsavel_operacao', 'operation_manager'
    ],
    despachante: [
      'despachante', 'dispatcher', 'customs_broker', 'despachante_aduaneiro',
      'customs_agent', 'broker'
    ],
    transportador: [
      'transportadora', 'transporter', 'logistics', 'transportador',
      'trucker', 'carrier_land'
    ],
    commodity: [
      'commodity', 'mercadoria', 'produto', 'goods', 'cargo', 'carga'
    ],
    currency: [
      'moeda', 'currency', 'coin', 'valor_moeda'
    ],
    value: [
      'valor', 'value', 'amount', 'preco', 'price'
    ],
    forwarder: [
      'forwarder', 'freight_forwarder', 'agente_carga', 'transitario'
    ]
  };

  const possibleFields = fieldMappings[fieldType] || [fieldType];
  
  // Try exact matches first
  for (const field of possibleFields) {
    if (allData[field] && allData[field].trim()) {
      return allData[field].trim();
    }
  }
  
  // Try partial matches
  for (const field of possibleFields) {
    for (const key in allData) {
      if ((key.includes(field) || field.includes(key)) && allData[key] && allData[key].trim()) {
        return allData[key].trim();
      }
    }
  }
  
  return '';
}

function extractFromNotesComprehensive(notes: string): Record<string, string> {
  const extractedData: Record<string, string> = {};
  if (!notes) return extractedData;

  const patterns = [
    // Shipping companies
    { key: 'company', regex: /(?:armador|shipping|companhia)[\s:]+([^\n\r.;,]+)/i },
    { key: 'company', regex: /(msc|maersk|cma|hapag|evergreen|cosco|yang ming|one|hmm|zim|mol)[\s\w]*/gi },
    
    // Vessels
    { key: 'vessel', regex: /(?:navio|vessel|ship)[\s:]+([^\n\r.;,]+)/i },
    { key: 'vessel', regex: /(?:m\.v\.|mv)[\s:]*([a-z\s]{3,})/i },
    
    // Products/Commodities
    { key: 'commodity', regex: /(?:produto|mercadoria|commodity|goods)[\s:]+([^\n\r.;,]+)/i },
    { key: 'commodity', regex: /(quimicos?|ceramica|telhas?|pisos?|revestimentos?|fertilizantes?)/i },
    
    // Dates
    { key: 'etd', regex: /(?:etd|embarque|sailing|partida)[\s:]+([^\n\r.;,]+)/i },
    { key: 'eta', regex: /(?:eta|chegada|arrival)[\s:]+([^\n\r.;,]+)/i },
    
    // Regulatory
    { key: 'orgaos_anuentes', regex: /(?:anuente|anvisa|ibama|inmetro|aneel)[\s:]*([^\n\r.;,]*)/i },
    
    // Other fields
    { key: 'terminal', regex: /(?:terminal|porto)[\s:]+([^\n\r.;,]+)/i },
    { key: 'bl', regex: /(?:bl|conhecimento)[\s:]+([a-z0-9\s-]+)/i },
    { key: 'container', regex: /(?:container|cntr)[\s:]*([a-z0-9\s,-]+)/i }
  ];

  patterns.forEach(({ key, regex }) => {
    const matches = notes.match(regex);
    if (matches) {
      if (matches.length > 1 && matches[1]) {
        extractedData[key] = matches[1].trim();
      } else if (matches[0]) {
        extractedData[key] = matches[0].trim();
      }
    }
  });

  return extractedData;
}

function extractFromTitle(title: string): Record<string, string> {
  const titleData: Record<string, string> = {};
  
  // Extract exporter from title pattern like "661° UNIVAR"
  const exporterMatch = title.match(/^\d+º?\s+(.+?)(\s*\(|$)/);
  if (exporterMatch) {
    titleData.exporter = exporterMatch[1].trim();
  }
  
  return titleData;
}

function extractProducts(allData: Record<string, string>): string[] {
  const productFields = ['produto', 'products', 'commodity', 'mercadoria', 'goods', 'carga'];
  
  for (const field of productFields) {
    const value = allData[field];
    if (value) {
      return value.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
    }
  }
  
  return [];
}

function extractContainers(allData: Record<string, string>): string[] {
  const containerFields = ['container', 'containers', 'conteineres', 'cntr'];
  
  for (const field of containerFields) {
    const value = allData[field];
    if (value) {
      return value.split(/[,;\n]/).map(c => c.trim()).filter(Boolean);
    }
  }
  
  return [];
}

function extractOrgaosAnuentes(allData: Record<string, string>): string[] {
  const orgaoFields = ['orgaos_anuentes', 'anuentes', 'regulatory'];
  const commonOrgaos = ['anvisa', 'ibama', 'inmetro', 'aneel', 'anp', 'mapa'];
  
  const found: string[] = [];
  
  // Check specific fields
  for (const field of orgaoFields) {
    const value = allData[field];
    if (value) {
      found.push(...value.split(/[,;\n]/).map(o => o.trim()).filter(Boolean));
    }
  }
  
  // Check for common regulatory agencies in all fields
  for (const key in allData) {
    const value = allData[key].toLowerCase();
    for (const orgao of commonOrgaos) {
      if (value.includes(orgao) && !found.some(f => f.toLowerCase().includes(orgao))) {
        found.push(orgao.toUpperCase());
      }
    }
  }
  
  return found;
}

function extractLicenses(allData: Record<string, string>): string[] {
  const licenseFields = ['licencas', 'licenses', 'li', 'import_license'];
  
  for (const field of licenseFields) {
    const value = allData[field];
    if (value) {
      return value.split(/[,;\n]/).map(l => l.trim()).filter(Boolean);
    }
  }
  
  return [];
}

function extractInvoices(allData: Record<string, string>): string[] {
  const invoiceFields = ['invoices', 'faturas', 'nf', 'nota_fiscal'];
  
  for (const field of invoiceFields) {
    const value = allData[field];
    if (value) {
      return value.split(/[,;\n]/).map(i => i.trim()).filter(Boolean);
    }
  }
  
  return [];
}

function extractAndFormatDate(allData: Record<string, string>, dateType: string): string {
  const dateValue = extractRobustField(allData, dateType);
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateValue; // Return as-is if can't parse
  }
}

function determineStatus(task: any, allData: Record<string, string>): string {
  const statusField = extractRobustField(allData, 'status');
  if (statusField) return statusField;
  
  return task.completed ? 'Concluído' : 'Em Progresso';
}

function extractOperationalStatus(allData: Record<string, string>, isCompleted: boolean): string {
  const statusOptions = [
    'A Embarcar', 'Em Trânsito', 'No Porto', 'Em Fechamento', 'Concluído', 'Cancelado'
  ];
  
  const statusField = extractRobustField(allData, 'operational_status') ||
                     extractRobustField(allData, 'status_operacao') ||
                     extractRobustField(allData, 'status');
  
  if (statusField) {
    const found = statusOptions.find(status => 
      statusField.toLowerCase().includes(status.toLowerCase())
    );
    if (found) return found;
  }
  
  return isCompleted ? 'Concluído' : 'A Embarcar';
}

function generateCleanId(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°\s-]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractExporterFromTitle(title: string): string {
  const match = title.match(/^\d+º?\s+(.+?)(\s*\(|$)/);
  return match ? match[1].trim() : '';
}

function calculateComprehensiveMetrics(trackings: any[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  // Status distribution
  const statusDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    const status = t.schedule?.operationalStatus || t.status;
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  // ETD chronogram
  const etdChronogram: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.schedule?.etd) {
      const month = new Date(t.schedule.etd.split('/').reverse().join('-')).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      etdChronogram[month] = (etdChronogram[month] || 0) + 1;
    }
  });
  
  // Products
  const products: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.transport?.products && t.transport.products.length > 0) {
      t.transport.products.forEach((product: string) => {
        products[product] = (products[product] || 0) + 1;
      });
    }
    if (t.transport?.commodity) {
      products[t.transport.commodity] = (products[t.transport.commodity] || 0) + 1;
    }
  });
  
  // Regulatory agencies
  const orgaosAnuentes: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.regulatory?.orgaosAnuentes && t.regulatory.orgaosAnuentes.length > 0) {
      t.regulatory.orgaosAnuentes.forEach((orgao: string) => {
        orgaosAnuentes[orgao] = (orgaosAnuentes[orgao] || 0) + 1;
      });
    }
  });
  
  // Containers count
  const totalContainers = trackings.reduce((sum, t) => {
    return sum + (t.transport?.containers?.length || 0);
  }, 0);
  
  // Operations with delays
  const withDelays = trackings.filter(t => {
    // Simple logic: if ETA passed and not completed
    if (t.schedule?.eta && t.status !== 'Concluído') {
      const etaDate = new Date(t.schedule.eta.split('/').reverse().join('-'));
      return etaDate < new Date();
    }
    return false;
  }).length;
  
  // Recent updates (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUpdates = trackings.filter(t => {
    const updateDate = new Date(t.lastUpdate.split('/').reverse().join('-'));
    return updateDate > sevenDaysAgo;
  }).length;

  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    recentUpdates,
    statusDistribution,
    etdChronogram,
    products,
    orgaosAnuentes,
    totalContainers,
    withDelays,
    embarquesThisMonth: Object.values(etdChronogram).reduce((sum: number, count: number) => sum + count, 0)
  };
}