// src/app/api/asana/accurate-trackings/route.ts - Separate company from exporter
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);
    
    console.log(`\n=== PROCESSING ${tasks.length} TASKS FROM ASANA ===`);

    const trackings = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => transformTaskCorrectly(task));

    console.log(`Transformed ${trackings.length} trackings`);
    
    // Log sample data for debugging
    console.log('\n=== SAMPLE TRACKINGS ===');
    trackings.slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. Title: "${t.title}" -> Company: "${t.company}" -> Exporter: "${t.transport.exporter}" -> REF: "${t.ref}"`);
    });

    const metrics = calculateRealMetrics(trackings);
    
    return NextResponse.json({
      success: true,
      data: trackings,
      metrics,
      debug: {
        totalTasksFromAsana: tasks.length,
        processedTrackings: trackings.length,
        sampleData: trackings.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Accurate Trackings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar dados do Asana',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function transformTaskCorrectly(task: any) {
  console.log(`\n--- Processing: ${task.name} ---`);
  
  // Extract custom fields
  const fields = new Map<string, string>();
  
  if (task.custom_fields && Array.isArray(task.custom_fields)) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        const value = extractFieldValue(field);
        if (value && value.trim()) {
          fields.set(field.name, value.trim());
          console.log(`  Field: "${field.name}" = "${value}"`);
        }
      }
    });
  }

  // ALWAYS extract company from task title (not from Exportador field)
  const titleInfo = extractCompanyAndRefFromTitle(task.name);
  console.log(`  Company from title: "${titleInfo.company}"`);
  console.log(`  REF from title: "${titleInfo.ref}"`);
  
  // Exportador is a separate custom field
  const exportadorField = fields.get('Exportador') || '';
  console.log(`  Exportador field: "${exportadorField}"`);

  const tracking = {
    id: generateTrackingId(task.name),
    asanaId: task.gid,
    title: task.name,
    description: task.notes || '',
    
    // Company ALWAYS comes from title
    company: titleInfo.company,
    ref: titleInfo.ref,
    status: determineRealStatus(task, fields),
    priority: fields.get('Prioridade') || '',
    
    business: {
      empresa: fields.get('EMPRESA') || '',
      servicos: fields.get('SERVIÇOS') || '',
      beneficioFiscal: fields.get('Benefício Fiscal') || '',
      canal: fields.get('Canal') || ''
    },
    
    transport: {
      vessel: fields.get('NAVIO') || '',
      company: fields.get('CIA DE TRANSPORTE') || '',
      containers: parseArray(fields.get('CNTR')),
      products: parseArray(fields.get('PRODUTO')),
      // Exportador is the custom field, NOT the company
      exporter: exportadorField,
      terminal: fields.get('Terminal') || '',
      despachante: fields.get('Despachante') || '',
      transportadora: fields.get('TRANSPORTADORA') || ''
    },
    
    schedule: {
      etd: fields.get('ETD') || '',
      eta: fields.get('ETA') || '',
      fimFreetime: fields.get('Fim do Freetime') || '',
      fimArmazenagem: fields.get('Fim da armazenagem') || '',
      operationalStatus: fields.get('Status') || '',
      adiantamento: fields.get('Adiantamento') || '',
      responsible: task.assignee?.name || ''
    },
    
    documentation: {
      bl: fields.get('Nº BL/AWB') || '',
      invoice: fields.get('INVOICE') || ''
    },
    
    regulatory: {
      orgaosAnuentes: parseArray(fields.get('Órgãos Anuentes'))
    },
    
    lastUpdate: new Date().toLocaleDateString('pt-BR')
  };

  return tracking;
}

function extractCompanyAndRefFromTitle(title: string): { company: string, ref: string } {
  if (!title || typeof title !== 'string') {
    return { company: '', ref: '' };
  }
  
  console.log(`  Extracting from title: "${title}"`);
  
  // Patterns to extract company from task title format: "17º AMZ (IMPORTAÇÃO)"
  const patterns = [
    // Pattern 1: "17º AMZ (IMPORTAÇÃO)" -> REF: "17", Company: "AMZ"
    /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]*?)(?:\s*\(.*\))?$/,
    
    // Pattern 2: "115º WCB" -> REF: "115", Company: "WCB"
    /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]+?)$/,
    
    // Pattern 3: Handle spaces in company names: "17º AMZ COMPANY (details)"
    /^(\d+)[º°]\s+([A-Z][A-Z0-9\s&.-]*?)(?:\s*\(|$)/
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = title.match(pattern);
    
    if (match && match[1] && match[2]) {
      const ref = match[1];
      let company = match[2].trim();
      
      // Clean up company name - remove trailing spaces and dots
      company = company.replace(/[.\s]+$/, '');
      
      console.log(`  Pattern ${i + 1} matched - REF: "${ref}", Company: "${company}"`);
      
      if (company && company.length > 0) {
        return { company, ref };
      }
    }
  }
  
  console.log(`  No pattern matched for: "${title}"`);
  return { company: '', ref: '' };
}

function extractFieldValue(field: any): string {
  return field.text_value || 
         field.number_value?.toString() || 
         field.enum_value?.name ||
         field.display_value ||
         '';
}

function determineRealStatus(task: any, fields: Map<string, string>): string {
  if (fields.has('Status') && fields.get('Status')!.trim()) {
    return fields.get('Status')!;
  }
  
  if (fields.has('Prioridade') && fields.get('Prioridade')!.trim()) {
    const prioridade = fields.get('Prioridade')!.toLowerCase();
    if (prioridade.includes('baixa')) return 'Em dia';
    if (prioridade.includes('alta')) return 'Em atraso'; 
    if (prioridade.includes('média')) return 'Em risco';
    return fields.get('Prioridade')!;
  }
  
  return task.completed ? 'Concluído' : 'Em Progresso';
}

function parseArray(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  
  return value.split(/[,;\n|\/]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function generateTrackingId(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°\s\-()]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function calculateRealMetrics(trackings: any[]) {
  const total = trackings.length;
  
  console.log('\n=== CALCULATING REAL METRICS ===');
  console.log(`Total trackings: ${total}`);
  
  // Company distribution (from title)
  const companyDist: Record<string, number> = {};
  trackings.forEach(t => {
    const company = t.company;
    if (company && company.trim()) {
      companyDist[company] = (companyDist[company] || 0) + 1;
    }
  });
  
  // Status distribution
  const statusDist: Record<string, number> = {};
  trackings.forEach(t => {
    const status = t.status;
    if (status) {
      statusDist[status] = (statusDist[status] || 0) + 1;
    }
  });
  
  // Shipping lines from CIA DE TRANSPORTE field
  const shippingLines = new Set<string>();
  trackings.forEach(t => {
    if (t.transport?.company && t.transport.company.trim()) {
      shippingLines.add(t.transport.company);
    }
  });
  
  // Products from PRODUTO field
  const allProducts = new Set<string>();
  trackings.forEach(t => {
    if (t.transport?.products && Array.isArray(t.transport.products)) {
      t.transport.products.forEach((p: string) => {
        if (p && p.trim()) {
          allProducts.add(p);
        }
      });
    }
  });
  
  // Terminals
  const terminals = new Set<string>();
  trackings.forEach(t => {
    if (t.transport?.terminal && t.transport.terminal.trim()) {
      terminals.add(t.transport.terminal);
    }
  });
  
  // Containers
  const totalContainers = trackings.reduce((sum, t) => {
    return sum + (t.transport?.containers?.length || 0);
  }, 0);
  
  // Órgãos anuentes
  const orgaosAnuentes = new Set<string>();
  trackings.forEach(t => {
    if (t.regulatory?.orgaosAnuentes && Array.isArray(t.regulatory.orgaosAnuentes)) {
      t.regulatory.orgaosAnuentes.forEach((o: string) => {
        if (o && o.trim()) {
          orgaosAnuentes.add(o);
        }
      });
    }
  });
  
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  
  console.log('Company distribution:', companyDist);
  console.log('Status distribution:', statusDist);
  console.log('Shipping lines:', Array.from(shippingLines));
  console.log('Terminals:', Array.from(terminals));
  console.log('Total containers:', totalContainers);
  
  return {
    totalOperations: total,
    activeOperations: total - completed,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    statusDistribution: statusDist,
    companyDistribution: companyDist,
    uniqueExporters: Object.keys(companyDist).length,
    uniqueShippingLines: shippingLines.size,
    uniqueTerminals: terminals.size,
    totalContainers: totalContainers,
    withDelays: 0,
    embarquesThisMonth: 0,
    allProducts: Array.from(allProducts),
    allShippingLines: Array.from(shippingLines),
    allTerminals: Array.from(terminals),
    allOrgaosAnuentes: Array.from(orgaosAnuentes)
  };
}