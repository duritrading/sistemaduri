// src/app/api/asana/trackings/route.ts
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

    // Enhanced transformation with aggressive field extraction
    const trackings = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => enhancedTransformAsanaTask(task));

    console.log(`Transformed ${trackings.length} trackings`);
    
    // Debug logging for first few trackings
    console.log('Sample tracking data:', JSON.stringify(trackings.slice(0, 2), null, 2));

    return NextResponse.json({
      success: true,
      data: trackings,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: tasks.length,
        trackingTasks: trackings.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get Trackings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar trackings do projeto Operacional',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function enhancedTransformAsanaTask(task: any) {
  // Step 1: Extract custom fields with enhanced normalization
  const customFields: Record<string, string> = {};
  
  if (task.custom_fields && Array.isArray(task.custom_fields)) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        // Multiple normalization strategies
        const normalizedKeys = [
          field.name.toLowerCase(),
          field.name.toLowerCase().replace(/\s+/g, '_'),
          field.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          field.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')
        ];
        
        const value = field.text_value || 
                     field.number_value?.toString() || 
                     field.enum_value?.name ||
                     field.display_value ||
                     '';
        
        // Store under all possible normalized keys
        normalizedKeys.forEach(key => {
          if (key && value) {
            customFields[key] = value;
          }
        });
      }
    });
  }

  // Step 2: Extract from notes with enhanced patterns
  const notesData = extractEnhancedFromNotes(task.notes || '');
  
  // Step 3: Merge all data sources
  const allData = { ...customFields, ...notesData };
  
  // Step 4: Enhanced field extraction with fallbacks
  const transport = {
    exporter: extractFieldEnhanced(allData, [
      'exportador', 'exporter', 'shipper', 'fornecedor', 'empresa_origem',
      'client', 'cliente', 'consignee'
    ]) || extractExporterFromTitle(task.name) || '',
    
    company: extractFieldEnhanced(allData, [
      'armador', 'companhia', 'company', 'shipping_company', 'linha_maritima', 
      'carrier', 'shipping_line', 'cia_navigation', 'cia'
    ]) || extractShippingFromNotes(task.notes) || '',
    
    vessel: extractFieldEnhanced(allData, [
      'navio', 'vessel', 'ship', 'embarcacao', 'vessel_name', 'nome_navio',
      'vessel_name', 'ship_name'
    ]) || extractVesselFromNotes(task.notes) || '',
    
    blAwb: extractFieldEnhanced(allData, [
      'bl_awb', 'bl', 'awb', 'bill_of_lading', 'conhecimento', 'bl_number',
      'house_bl', 'master_bl'
    ]) || '',
    
    containers: parseMultilineField(extractFieldEnhanced(allData, [
      'containers', 'container', 'conteineres', 'container_numbers',
      'cntr', 'container_no'
    ])),
    
    terminal: extractFieldEnhanced(allData, [
      'terminal', 'port', 'porto', 'terminal_porto', 'porto_destino',
      'discharge_port', 'pod'
    ]) || ''
  };

  const schedule = {
    eta: formatDate(extractFieldEnhanced(allData, [
      'eta', 'chegada', 'arrival', 'previsao_chegada', 'data_chegada',
      'eta_date', 'arrival_date'
    ])),
    
    freetime: formatDate(extractFieldEnhanced(allData, [
      'freetime', 'fim_freetime', 'free_time', 'prazo_freetime',
      'free_time_end', 'prazo_livre'
    ])),
    
    responsible: task.assignee?.name || extractFieldEnhanced(allData, [
      'responsavel', 'responsible', 'encarregado', 'coordenador',
      'responsavel_operacao'
    ]) || 'Não atribuído',
    
    status: extractFieldEnhanced(allData, [
      'status_entrega', 'delivery_status', 'status', 'situacao',
      'status_operacao'
    ]) || (task.completed ? 'Concluído' : 'Em Progresso')
  };

  const trackingId = task.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°\s-]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return {
    id: trackingId,
    asanaId: task.gid,
    title: task.name,
    description: task.notes || '',
    status: task.completed ? 'Concluído' : 'Em Progresso',
    lastUpdate: new Date(task.modified_at || task.created_at).toLocaleDateString('pt-BR'),
    transport,
    schedule,
    partners: {
      dispatcher: extractFieldEnhanced(allData, [
        'despachante', 'dispatcher', 'customs_broker', 'despachante_aduaneiro'
      ]) || '',
      transporter: extractFieldEnhanced(allData, [
        'transportadora', 'transporter', 'logistics', 'transportador'
      ]) || '',
      invoices: parseMultilineField(extractFieldEnhanced(allData, [
        'invoices', 'faturas', 'invoice_numbers', 'nf', 'nota_fiscal'
      ]))
    }
  };
}

function extractFieldEnhanced(allData: Record<string, string>, possibleNames: string[]): string {
  // Try exact matches first
  for (const name of possibleNames) {
    if (allData[name]) {
      return allData[name];
    }
  }
  
  // Try partial matches
  for (const name of possibleNames) {
    for (const key in allData) {
      if (key.includes(name) || name.includes(key)) {
        if (allData[key]) {
          return allData[key];
        }
      }
    }
  }
  
  return '';
}

function extractEnhancedFromNotes(notes: string): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!notes) return fields;

  const cleanNotes = notes.toLowerCase();

  // Enhanced shipping company extraction
  const shippingPatterns = [
    { key: 'company', regex: /(?:msc|maersk|cma|hapag|evergreen|cosco|yang ming|one|hmm)[\s\w]*/gi },
    { key: 'armador', regex: /armador[\s:]+([^\n\r.;]+)/i },
    { key: 'company', regex: /companhia[\s:]+([^\n\r.;]+)/i },
    { key: 'shipping_company', regex: /shipping[\s_]?company[\s:]+([^\n\r.;]+)/i }
  ];

  // Enhanced vessel extraction
  const vesselPatterns = [
    { key: 'vessel', regex: /(?:navio|vessel|ship)[\s:]+([^\n\r.;]+)/i },
    { key: 'vessel', regex: /(?:m\.v\.|mv)[\s:]*([a-z\s]{3,})/i },
    { key: 'vessel', regex: /(?:msc|cma|maersk|ever|cosco)\s+([a-z\s]{3,})/i }
  ];

  // Other patterns
  const otherPatterns = [
    { key: 'exportador', regex: /(?:exportador|exporter|shipper)[\s:]+([^\n\r.;]+)/i },
    { key: 'eta', regex: /(?:eta|chegada|arrival)[\s:]+([^\n\r.;]+)/i },
    { key: 'terminal', regex: /(?:terminal|porto|port)[\s:]+([^\n\r.;]+)/i },
    { key: 'container', regex: /(?:container|cntr)[\s:]*([a-z0-9\s,-]+)/i }
  ];

  const allPatterns = [...shippingPatterns, ...vesselPatterns, ...otherPatterns];

  allPatterns.forEach(({ key, regex }) => {
    const matches = notes.match(regex);
    if (matches && matches.length > 1) {
      fields[key] = matches[1].trim();
    } else if (matches && matches.length === 1) {
      fields[key] = matches[0].trim();
    }
  });

  return fields;
}

function extractShippingFromNotes(notes: string): string {
  if (!notes) return '';
  
  const shippingCompanies = [
    'MSC', 'MAERSK', 'CMA CGM', 'HAPAG LLOYD', 'EVERGREEN', 'COSCO', 
    'YANG MING', 'ONE', 'HMM', 'ZIM', 'PILGRIMS PRIDE', 'MOL'
  ];

  const upperNotes = notes.toUpperCase();
  
  for (const company of shippingCompanies) {
    if (upperNotes.includes(company)) {
      return company;
    }
  }
  
  return '';
}

function extractVesselFromNotes(notes: string): string {
  if (!notes) return '';
  
  // Patterns for vessel names
  const vesselPatterns = [
    /(?:MSC|CMA|MAERSK|EVER|COSCO|MOL)\s+([A-Z\s]{3,20})/i,
    /(?:M\.V\.|MV)\s*([A-Z\s]{3,20})/i,
    /VESSEL[:\s]+([A-Z\s]{3,20})/i,
    /NAVIO[:\s]+([A-Z\s]{3,20})/i
  ];

  for (const pattern of vesselPatterns) {
    const match = notes.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

function extractExporterFromTitle(title: string): string {
  const match = title.match(/^\d+º?\s+(.+?)(\s*\(|$)/);
  return match ? match[1].trim() : '';
}

function parseMultilineField(str: string): string[] {
  if (!str) return [];
  return str.split(/[,\n;]/).map(s => s.trim()).filter(Boolean);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}