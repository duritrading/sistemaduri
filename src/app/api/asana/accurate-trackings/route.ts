// src/app/api/asana/accurate-trackings/route.ts
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);
    
    console.log(`Processing ${tasks.length} tasks from Asana`);

    // Transform tasks with ONLY Asana data
    const trackings = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => transformAsanaTaskAccurate(task));

    // Calculate metrics with ONLY real data
    const accurateMetrics = calculateAccurateMetrics(trackings);
    
    console.log('Accurate metrics calculated:', accurateMetrics);

    return NextResponse.json({
      success: true,
      data: trackings,
      metrics: accurateMetrics,
      debug: {
        totalTasksFromAsana: tasks.length,
        processedTrackings: trackings.length,
        metricsBreakdown: accurateMetrics
      }
    });

  } catch (error) {
    console.error('Accurate Trackings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar dados precisos do Asana',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function transformAsanaTaskAccurate(task: any) {
  // Extract ONLY from Asana custom fields - no invention
  const customFieldsMap = new Map();
  
  if (task.custom_fields && Array.isArray(task.custom_fields)) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        const value = field.text_value || 
                     field.number_value?.toString() || 
                     field.enum_value?.name ||
                     '';
        
        // Store with multiple key variations for matching
        const originalKey = field.name;
        const lowerKey = field.name.toLowerCase();
        const normalizedKey = field.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        
        if (value) {
          customFieldsMap.set(originalKey, value);
          customFieldsMap.set(lowerKey, value);
          customFieldsMap.set(normalizedKey, value);
        }
      }
    });
  }

  // Extract data with strict field matching
  function getFieldValue(possibleNames: string[]): string {
    for (const name of possibleNames) {
      if (customFieldsMap.has(name)) {
        return customFieldsMap.get(name);
      }
      // Try case-insensitive
      for (const [key, value] of customFieldsMap.entries()) {
        if (key.toLowerCase() === name.toLowerCase()) {
          return value;
        }
      }
    }
    return '';
  }

  // Parse notes for additional data (as fallback)
  const notesData = parseNotesForData(task.notes || '');

  // Determine status from Asana data ONLY
  let operationalStatus = getFieldValue([
    'Status', 'status', 'Status Operacional', 'status_operacional',
    'Situação', 'situacao', 'Estado', 'estado'
  ]);

  // If no status field found, use completion status
  if (!operationalStatus) {
    operationalStatus = task.completed ? 'Concluído' : 'Em Progresso';
  }

  // Extract all other fields
  const transport = {
    exporter: getFieldValue(['Exportador', 'exportador', 'Exporter', 'Shipper', 'Cliente']) || 
              extractExporterFromTitle(task.name) || '',
    company: getFieldValue(['Armador', 'armador', 'Companhia', 'Shipping Company', 'Linha']) || 
             notesData.company || '',
    vessel: getFieldValue(['Navio', 'navio', 'Vessel', 'Ship', 'Embarcação']) || 
            notesData.vessel || '',
    blAwb: getFieldValue(['BL', 'bl', 'AWB', 'Bill of Lading', 'Conhecimento']) || '',
    containers: parseContainers(getFieldValue(['Container', 'Containers', 'CNTR'])) || [],
    terminal: getFieldValue(['Terminal', 'terminal', 'Porto', 'Port']) || '',
    products: parseProducts(getFieldValue(['Produto', 'Produtos', 'Product', 'Commodity', 'Mercadoria'])) || [],
    commodity: getFieldValue(['Commodity', 'commodity', 'Mercadoria', 'Produto Principal']) || ''
  };

  const schedule = {
    etd: formatAsanaDate(getFieldValue(['ETD', 'etd', 'Embarque', 'Data Embarque', 'Sailing'])),
    eta: formatAsanaDate(getFieldValue(['ETA', 'eta', 'Chegada', 'Data Chegada', 'Arrival'])),
    freetime: formatAsanaDate(getFieldValue(['Freetime', 'Free Time', 'Fim Freetime', 'Prazo'])),
    responsible: task.assignee?.name || 
                getFieldValue(['Responsável', 'responsavel', 'Responsible']) || 
                'Não atribuído',
    operationalStatus
  };

  const regulatory = {
    orgaosAnuentes: parseOrgaosAnuentes(getFieldValue(['Órgãos Anuentes', 'orgaos_anuentes', 'Anuentes', 'Regulatory'])) || [],
    customsBroker: getFieldValue(['Despachante', 'despachante', 'Customs Broker', 'Broker']) || '',
    licenses: parseLicenses(getFieldValue(['Licenças', 'licencas', 'Licenses', 'LI'])) || []
  };

  return {
    id: generateCleanId(task.name),
    asanaId: task.gid,
    title: task.name,
    description: task.notes || '',
    status: task.completed ? 'Concluído' : 'Em Progresso',
    lastUpdate: new Date(task.modified_at || task.created_at).toLocaleDateString('pt-BR'),
    transport,
    schedule,
    regulatory
  };
}

function parseNotesForData(notes: string): any {
  const data: any = { company: '', vessel: '' };
  
  if (!notes) return data;
  
  // Extract shipping companies from notes
  const shippingCompanies = ['MSC', 'MAERSK', 'CMA CGM', 'HAPAG LLOYD', 'EVERGREEN', 'COSCO'];
  const upperNotes = notes.toUpperCase();
  
  for (const company of shippingCompanies) {
    if (upperNotes.includes(company)) {
      data.company = company;
      break;
    }
  }
  
  // Extract vessel names
  const vesselPatterns = [
    /(?:MSC|CMA|MAERSK|EVER|HAPAG)\s+([A-Z\s]{3,20})/i,
    /(?:M\.V\.|MV)\s*([A-Z\s]{3,20})/i,
    /VESSEL[:\s]+([A-Z\s]{3,20})/i,
    /NAVIO[:\s]+([A-Z\s]{3,20})/i
  ];

  for (const pattern of vesselPatterns) {
    const match = notes.match(pattern);
    if (match && match[1]) {
      data.vessel = match[1].trim();
      break;
    }
  }
  
  return data;
}

function parseContainers(value: string): string[] {
  if (!value) return [];
  return value.split(/[,;\n]/).map(c => c.trim()).filter(Boolean);
}

function parseProducts(value: string): string[] {
  if (!value) return [];
  return value.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
}

function parseOrgaosAnuentes(value: string): string[] {
  if (!value) return [];
  return value.split(/[,;\n]/).map(o => o.trim()).filter(Boolean);
}

function parseLicenses(value: string): string[] {
  if (!value) return [];
  return value.split(/[,;\n]/).map(l => l.trim()).filter(Boolean);
}

function formatAsanaDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
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

function calculateAccurateMetrics(trackings: any[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  // Status distribution from REAL Asana data
  const statusDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    const status = t.schedule?.operationalStatus || t.status;
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  // REAL container count from Asana
  const totalContainers = trackings.reduce((sum, t) => {
    return sum + (t.transport?.containers?.length || 0);
  }, 0);
  
  // REAL delays calculation
  const now = new Date();
  const withDelays = trackings.filter(t => {
    if (t.schedule?.eta && t.status !== 'Concluído') {
      try {
        const etaDate = new Date(t.schedule.eta.split('/').reverse().join('-'));
        return etaDate < now;
      } catch {
        return false;
      }
    }
    return false;
  }).length;
  
  // REAL embarques this month
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const embarquesThisMonth = trackings.filter(t => {
    if (t.schedule?.etd) {
      try {
        const etdDate = new Date(t.schedule.etd.split('/').reverse().join('-'));
        return etdDate.getMonth() === currentMonth && etdDate.getFullYear() === currentYear;
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  // Validate that status counts match total
  const statusTotal = Object.values(statusDistribution).reduce((sum, count) => sum + count, 0);
  
  console.log('Metrics validation:', {
    totalOperations: total,
    statusTotal,
    statusBreakdown: statusDistribution,
    mathCheck: statusTotal === total
  });

  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    statusDistribution,
    totalContainers,
    withDelays,
    embarquesThisMonth,
    // Debug info
    validation: {
      statusTotal,
      mathValid: statusTotal === total
    }
  };
}