// src/app/api/asana/enhanced-trackings/route.ts
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
    
    // Enhanced transformation with better field extraction
    const trackings = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => enhancedTransformAsanaTask(task));

    // Calculate enhanced metrics
    const enhancedMetrics = calculateEnhancedMetrics(trackings);

    return NextResponse.json({
      success: true,
      data: trackings,
      metrics: enhancedMetrics,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: tasks.length,
        lastSync: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Enhanced Trackings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar dados aprimorados',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function enhancedTransformAsanaTask(task: any) {
  const customFields: Record<string, string> = {};
  
  // Enhanced field extraction with better normalization
  if (task.custom_fields) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        const normalizedKey = normalizeFieldName(field.name);
        customFields[normalizedKey] = extractFieldValue(field) || '';
      }
    });
  }

  // Extract from notes if custom fields are missing
  const notesFields = extractFromNotes(task.notes || '');
  
  // Merge custom fields with notes extraction
  const allFields = { ...customFields, ...notesFields };

  const trackingId = generateTrackingId(task.name);

  return {
    id: trackingId,
    asanaId: task.gid,
    title: task.name,
    description: task.notes || '',
    status: task.completed ? 'Concluído' : 'Em Progresso',
    lastUpdate: new Date(task.modified_at || task.created_at).toLocaleDateString('pt-BR'),
    
    transport: {
      exporter: extractField(allFields, [
        'exportador', 'exporter', 'shipper', 'fornecedor', 'empresa_origem'
      ]) || extractExporterFromTitle(task.name),
      
      company: extractField(allFields, [
        'armador', 'companhia', 'company', 'shipping_company', 'linha_maritima', 'carrier'
      ]) || extractCompanyFromNotes(task.notes),
      
      vessel: extractField(allFields, [
        'navio', 'vessel', 'ship', 'embarcacao', 'vessel_name', 'nome_navio'
      ]) || extractVesselFromNotes(task.notes),
      
      blAwb: extractField(allFields, [
        'bl_awb', 'bl', 'awb', 'bill_of_lading', 'conhecimento', 'bl_number'
      ]),
      
      containers: parseMultilineField(extractField(allFields, [
        'containers', 'container', 'conteineres', 'container_numbers'
      ])),
      
      terminal: extractField(allFields, [
        'terminal', 'port', 'porto', 'terminal_porto', 'porto_destino'
      ])
    },
    
    schedule: {
      eta: formatDate(extractField(allFields, [
        'eta', 'chegada', 'arrival', 'previsao_chegada', 'data_chegada'
      ])),
      
      freetime: formatDate(extractField(allFields, [
        'freetime', 'fim_freetime', 'free_time', 'prazo_freetime'
      ])),
      
      responsible: task.assignee?.name || extractField(allFields, [
        'responsavel', 'responsible', 'encarregado', 'coordenador'
      ]) || 'Não atribuído',
      
      status: extractField(allFields, [
        'status_entrega', 'delivery_status', 'status', 'situacao'
      ]) || (task.completed ? 'Concluído' : 'Em Progresso')
    },
    
    partners: {
      dispatcher: extractField(allFields, [
        'despachante', 'dispatcher', 'customs_broker', 'despachante_aduaneiro'
      ]),
      
      transporter: extractField(allFields, [
        'transportadora', 'transporter', 'logistics', 'transportador'
      ]),
      
      invoices: parseMultilineField(extractField(allFields, [
        'invoices', 'faturas', 'invoice_numbers', 'nf', 'nota_fiscal'
      ]))
    }
  };
}

function normalizeFieldName(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
}

function extractFieldValue(field: any): string | null {
  return field.text_value || 
         field.number_value?.toString() || 
         field.enum_value?.name || 
         null;
}

function extractFromNotes(notes: string): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!notes) return fields;

  // Patterns to extract common shipping info from notes
  const patterns = [
    { key: 'navio', regex: /(?:navio|vessel|ship)[\s:]+([^\n\r]+)/i },
    { key: 'armador', regex: /(?:armador|carrier|shipping[\s_]?company)[\s:]+([^\n\r]+)/i },
    { key: 'exportador', regex: /(?:exportador|exporter|shipper)[\s:]+([^\n\r]+)/i },
    { key: 'eta', regex: /(?:eta|chegada|arrival)[\s:]+([^\n\r]+)/i },
    { key: 'terminal', regex: /(?:terminal|porto|port)[\s:]+([^\n\r]+)/i }
  ];

  patterns.forEach(({ key, regex }) => {
    const match = notes.match(regex);
    if (match) {
      fields[key] = match[1].trim();
    }
  });

  return fields;
}

function extractCompanyFromNotes(notes: string): string {
  if (!notes) return '';
  
  // Common shipping company patterns in notes
  const companyPatterns = [
    /MSC[\s\w]*/i,
    /MAERSK[\s\w]*/i,
    /CMA[\s\w]*/i,
    /HAPAG[\s\w]*/i,
    /EVERGREEN[\s\w]*/i,
    /COSCO[\s\w]*/i
  ];

  for (const pattern of companyPatterns) {
    const match = notes.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return '';
}

function extractVesselFromNotes(notes: string): string {
  if (!notes) return '';
  
  // Look for vessel names (usually all caps or specific patterns)
  const vesselPatterns = [
    /(?:MSC|CMA|MAERSK|HAPAG|EVER|COSCO)\s+[A-Z\s]{3,}/i,
    /(?:M\.V\.|MV)\s+[A-Z\s]{3,}/i,
    /[A-Z]{3,}\s+[A-Z]{3,}(?:\s+[A-Z]{3,})?/
  ];

  for (const pattern of vesselPatterns) {
    const match = notes.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return '';
}

function calculateEnhancedMetrics(trackings: any[]) {
  const totalOperations = trackings.length;
  const activeOperations = trackings.filter(t => t.status === 'Em Progresso').length;
  const completedOperations = trackings.filter(t => t.status === 'Concluído').length;
  const effectiveRate = totalOperations > 0 ? Math.round((completedOperations / totalOperations) * 100) : 0;

  // Recent updates (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUpdates = trackings.filter(t => {
    const updateDate = new Date(t.lastUpdate.split('/').reverse().join('-'));
    return updateDate > sevenDaysAgo;
  }).length;

  // Vessels with data
  const vesselsWithData = trackings.filter(t => t.transport?.vessel && t.transport.vessel !== 'Não informado').length;
  
  // Companies with data
  const companiesWithData = trackings.filter(t => t.transport?.company && t.transport.company !== 'Não informado').length;

  return {
    totalOperations,
    activeOperations,
    completedOperations,
    effectiveRate,
    recentUpdates,
    vesselsWithData,
    companiesWithData,
    dataCompleteness: Math.round(((vesselsWithData + companiesWithData) / (totalOperations * 2)) * 100)
  };
}

// Helper functions from original code
function extractField(fields: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (fields[name]) {
      return fields[name];
    }
  }
  return '';
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

function generateTrackingId(name: string): string {
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