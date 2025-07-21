// src/app/api/asana/unified/route.ts - API Consolidada Robusta (Service Layer)
import { NextResponse } from 'next/server';
import { TrackingService } from '@/lib/tracking-service';

export async function GET() {
  try {
    console.log('🚀 UNIFIED API - Starting consolidated request');
    
    const trackingService = new TrackingService();
    const response = await trackingService.getAllTrackings();

    if (!response.success) {
      return NextResponse.json(response, { status: 500 });
    }

    console.log(`✅ API Unified: ${response.data.length} trackings, ${response.metrics.totalOperations} total operations`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Unified API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tracking data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fetchAsanaData() {
  const headers = {
    'Authorization': `Bearer ${ASANA_TOKEN}`,
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  };

  // 1. Get workspace
  const workspacesRes = await fetch(`${ASANA_BASE_URL}/workspaces`, { headers });
  const workspacesData = await workspacesRes.json();
  const workspace = workspacesData.data[0];

  if (!workspace) throw new Error('No workspace found');

  // 2. Find operational project
  const projectsRes = await fetch(
    `${ASANA_BASE_URL}/projects?workspace=${workspace.gid}&limit=100`, 
    { headers }
  );
  const projectsData = await projectsRes.json();
  const project = projectsData.data.find((p: any) => 
    p.name && p.name.toLowerCase().includes('operacional')
  );

  if (!project) throw new Error('Operational project not found');

  // 3. Get all tasks with optimized fields
  const optFields = [
    'name', 'notes', 'completed', 'assignee.name', 
    'custom_fields.name', 'custom_fields.text_value',
    'custom_fields.number_value', 'custom_fields.enum_value.name',
    'due_date', 'created_at', 'modified_at', 'parent'
  ].join(',');

  let allTasks: any[] = [];
  let offset: string | undefined;
  
  do {
    const url = `${ASANA_BASE_URL}/tasks?project=${project.gid}&opt_fields=${optFields}&limit=100${offset ? `&offset=${offset}` : ''}`;
    const tasksRes = await fetch(url, { headers });
    const tasksData = await tasksRes.json();
    
    allTasks = allTasks.concat(tasksData.data);
    offset = tasksData.next_page?.offset;
  } while (offset);

  return { tasks: allTasks, project, workspace };
}

function isSubtask(task: any): boolean {
  return task.parent && task.parent.resource_type === 'task';
}

function transformTask(task: any) {
  // Extract company from title - consolidated logic
  const { company, ref } = extractFromTitle(task.name);
  
  // Extract custom fields - optimized mapping
  const fields = extractCustomFields(task.custom_fields || []);
  
  // Extract from notes - enhanced patterns  
  const notesData = extractFromNotes(task.notes || '');
  
  // Merge all data sources
  const allData = { ...fields, ...notesData };

  return {
    id: generateId(task.name),
    asanaId: task.gid,
    title: task.name,
    company,
    ref,
    status: determineStatus(task, allData),
    
    transport: {
      exporter: getValue(allData, ['exportador', 'exporter', 'shipper']) || 
                extractExporterFromTitle(task.name),
      company: getValue(allData, ['armador', 'shipping_company', 'carrier']),
      vessel: getValue(allData, ['navio', 'vessel', 'ship']),
      blAwb: getValue(allData, ['bl_awb', 'bl', 'bill_of_lading']),
      containers: parseArray(getValue(allData, ['containers', 'cntr'])),
      terminal: getValue(allData, ['terminal', 'port', 'porto']),
      products: parseArray(getValue(allData, ['produto', 'product', 'produtos']))
    },
    
    schedule: {
      etd: formatDate(getValue(allData, ['etd', 'departure'])),
      eta: formatDate(getValue(allData, ['eta', 'arrival', 'chegada'])),
      freetime: formatDate(getValue(allData, ['freetime', 'fim_freetime'])),
      responsible: task.assignee?.name || getValue(allData, ['responsavel']) || 'Não atribuído',
      operationalStatus: getValue(allData, ['status', 'situacao']) || 
                        (task.completed ? 'Concluído' : 'Em Progresso')
    },
    
    regulatory: {
      orgaosAnuentes: parseArray(getValue(allData, ['orgaos_anuentes', 'orgaos']))
    },
    
    lastUpdate: formatDate(task.modified_at) || new Date().toLocaleDateString('pt-BR')
  };
}

function extractFromTitle(title: string): { company: string, ref: string } {
  if (!title) return { company: 'UNKNOWN', ref: '' };
  
  const patterns = [
    /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]*?)(?:\s*\(.*\))?$/,
    /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]+?)$/
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return { 
        company: match[2].trim(), 
        ref: match[1] 
      };
    }
  }
  
  return { company: 'UNKNOWN', ref: '' };
}

function extractCustomFields(customFields: any[]) {
  const fields: Record<string, string> = {};
  
  customFields.forEach(field => {
    if (field.name) {
      const key = field.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      
      fields[key] = field.text_value || 
                   field.number_value?.toString() || 
                   field.enum_value?.name || 
                   '';
    }
  });
  
  return fields;
}

function extractFromNotes(notes: string) {
  if (!notes) return {};
  
  const patterns = [
    { key: 'armador', regex: /(?:armador|carrier|shipping[\s_]?company)[\s:]+([^\n\r]+)/i },
    { key: 'navio', regex: /(?:navio|vessel|ship)[\s:]+([^\n\r]+)/i },
    { key: 'exportador', regex: /(?:exportador|exporter|shipper)[\s:]+([^\n\r]+)/i },
    { key: 'eta', regex: /(?:eta|chegada|arrival)[\s:]+([^\n\r]+)/i },
    { key: 'terminal', regex: /(?:terminal|porto|port)[\s:]+([^\n\r]+)/i }
  ];
  
  const fields: Record<string, string> = {};
  
  patterns.forEach(({ key, regex }) => {
    const match = notes.match(regex);
    if (match) fields[key] = match[1].trim();
  });
  
  return fields;
}

function getValue(data: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (data[key]) return data[key];
  }
  return '';
}

function parseArray(str: string): string[] {
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

function generateId(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°\s-]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractExporterFromTitle(title: string): string {
  const match = title.match(/^\d+[º°]?\s+(.+?)(?:\s*\(|$)/);
  return match ? match[1].trim() : '';
}

function determineStatus(task: any, fields: Record<string, string>): string {
  if (task.completed) return 'Concluído';
  if (fields.status) return fields.status;
  return 'Em Progresso';
}

function calculateMetrics(trackings: any[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  // Status distribution
  const statusDistribution: Record<string, number> = {};
  const exporterDistribution: Record<string, number> = {};
  const armadorDistribution: Record<string, number> = {};
  const productDistribution: Record<string, number> = {};
  const terminals = new Set<string>();
  const shippingLines = new Set<string>();
  
  let totalContainers = 0;
  
  trackings.forEach(tracking => {
    // Status
    statusDistribution[tracking.status] = (statusDistribution[tracking.status] || 0) + 1;
    
    // Exporter
    if (tracking.transport.exporter) {
      exporterDistribution[tracking.transport.exporter] = 
        (exporterDistribution[tracking.transport.exporter] || 0) + 1;
    }
    
    // Shipping company
    if (tracking.transport.company) {
      armadorDistribution[tracking.transport.company] = 
        (armadorDistribution[tracking.transport.company] || 0) + 1;
      shippingLines.add(tracking.transport.company);
    }
    
    // Terminal
    if (tracking.transport.terminal) {
      terminals.add(tracking.transport.terminal);
    }
    
    // Products
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
    
    // Distributions
    statusDistribution,
    exporterDistribution,
    armadorDistribution,
    productDistribution,
    
    // Counts
    uniqueExporters: Object.keys(exporterDistribution).length,
    uniqueShippingLines: shippingLines.size,
    uniqueTerminals: terminals.size,
    totalContainers,
    
    // Arrays for components
    allShippingLines: Array.from(shippingLines),
    allTerminals: Array.from(terminals)
  };
}