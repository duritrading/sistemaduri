// src/app/api/asana/unified/route.ts - API completamente corrigida
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚀 API Unified: Starting request...');
    
    // Verificação segura do token
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    const hasValidToken = token && token.trim() !== '' && token !== 'your_asana_token_here';

    if (!hasValidToken) {
      console.log('⚠️ Token não configurado, retornando dados mock...');
      return NextResponse.json({
        success: true,
        data: getMockTrackingData(),
        metrics: getMockMetrics(),
        meta: {
          workspace: 'Mock Workspace',
          project: 'Projeto Operacional (Demonstração)',
          totalTasks: 3,
          processedTrackings: 3,
          lastSync: new Date().toISOString(),
          apiVersion: 'unified-v1',
          dataSource: 'mock'
        }
      });
    }

    // Tentar buscar dados reais do Asana
    console.log('📡 Buscando dados reais do Asana...');
    
    // Teste de conectividade simples
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!userResponse.ok) {
      console.warn('⚠️ Falha na autenticação, usando dados mock');
      return getMockResponse();
    }

    const userData = await userResponse.json();
    console.log(`✅ Autenticado como: ${userData.data?.name}`);

    // Buscar workspaces
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const workspacesData = await workspacesResponse.json();
    const workspace = workspacesData.data?.[0];

    if (!workspace) {
      console.warn('⚠️ Nenhum workspace encontrado, usando dados mock');
      return getMockResponse();
    }

    // Buscar projetos
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    const operationalProject = projects.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      console.warn('⚠️ Projeto operacional não encontrado, usando dados mock');
      return getMockResponse();
    }

    // Buscar tasks do projeto
    const tasksResponse = await fetch(
      `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=name,completed,custom_fields.name,custom_fields.text_value,custom_fields.number_value,custom_fields.enum_value.name&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data || [];

    console.log(`📋 Encontradas ${tasks.length} tasks no projeto operacional`);

    // Transformar tasks em trackings
    const trackings = tasks
      .filter(task => task.name && !task.parent) // Filtrar subtasks
      .map(task => transformTaskToTracking(task));

    const metrics = calculateMetrics(trackings);

    console.log(`✅ Processados ${trackings.length} trackings com sucesso`);

    return NextResponse.json({
      success: true,
      data: trackings,
      metrics,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: tasks.length,
        processedTrackings: trackings.length,
        lastSync: new Date().toISOString(),
        apiVersion: 'unified-v1',
        dataSource: 'asana'
      }
    });

  } catch (error) {
    console.error('❌ API Unified Error:', error);
    
    // Em caso de erro, sempre retornar dados mock
    console.log('🔄 Fallback para dados mock devido ao erro');
    return getMockResponse();
  }
}

function getMockResponse() {
  return NextResponse.json({
    success: true,
    data: getMockTrackingData(),
    metrics: getMockMetrics(),
    meta: {
      workspace: 'Mock Workspace',
      project: 'Projeto Operacional (Demonstração)',
      totalTasks: 3,
      processedTrackings: 3,
      lastSync: new Date().toISOString(),
      apiVersion: 'unified-v1',
      dataSource: 'mock'
    }
  });
}

function getMockTrackingData() {
  return [
    {
      id: 'mock-1',
      asanaId: 'mock-1',
      title: '661º UNIVAR (PO 4527659420)',
      company: 'UNIVAR',
      ref: 'PO 4527659420',
      status: 'Em Progresso',
      transport: {
        exporter: 'UNIVAR',
        company: 'UNIVAR',
        vessel: 'MSC GENEVA',
        blAwb: 'MSCUGE123456',
        containers: ['MSCU1234567'],
        terminal: 'Santos',
        products: ['Produtos Químicos']
      },
      schedule: {
        etd: '2024-01-15',
        eta: '2024-02-15',
        freetime: '7 dias',
        responsible: 'Carlos Leal',
        operationalStatus: 'Em Progresso'
      },
      regulatory: {
        orgaosAnuentes: ['ANVISA', 'IBAMA']
      },
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'mock-2',
      asanaId: 'mock-2', 
      title: '662º AGRIVALE (BL MSCUNE1234567)',
      company: 'AGRIVALE',
      ref: 'BL MSCUNE1234567',
      status: 'A Embarcar',
      transport: {
        exporter: 'AGRIVALE',
        company: 'AGRIVALE',
        vessel: 'MAERSK LIMA',
        blAwb: 'MSKULI987654',
        containers: ['MSKU9876543'],
        terminal: 'Paranaguá',
        products: ['Produtos Agrícolas']
      },
      schedule: {
        etd: '2024-01-20',
        eta: '2024-02-20',
        freetime: '10 dias',
        responsible: 'Ana Silva',
        operationalStatus: 'A Embarcar'
      },
      regulatory: {
        orgaosAnuentes: ['MAPA']
      },
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'mock-3',
      asanaId: 'mock-3',
      title: '663º WCB (Container MSKU7654321)',
      company: 'WCB',
      ref: 'Container MSKU7654321',
      status: 'Concluído',
      transport: {
        exporter: 'WCB',
        company: 'WCB',
        vessel: 'CMA CGM MARCO POLO',
        blAwb: 'CMACGM456789',
        containers: ['CMAU7654321'],
        terminal: 'Itajaí',
        products: ['Frutas Frescas']
      },
      schedule: {
        etd: '2024-01-10',
        eta: '2024-02-10',
        freetime: '5 dias',
        responsible: 'João Santos',
        operationalStatus: 'Concluído'
      },
      regulatory: {
        orgaosAnuentes: ['VIGIAGRO']
      },
      lastUpdate: new Date().toISOString()
    }
  ];
}

function getMockMetrics() {
  return {
    totalOperations: 3,
    activeOperations: 2,
    completedOperations: 1,
    effectiveRate: 66.7,
    statusDistribution: {
      'Em Progresso': 1,
      'A Embarcar': 1,
      'Concluído': 1
    },
    exporterDistribution: {
      'UNIVAR': 1,
      'AGRIVALE': 1,
      'WCB': 1
    },
    armadorDistribution: {
      'MSC': 1,
      'MAERSK': 1,
      'CMA CGM': 1
    },
    uniqueExporters: 3,
    uniqueShippingLines: 3,
    uniqueTerminals: 3,
    totalContainers: 3
  };
}

function transformTaskToTracking(task: any) {
  const customFields = extractCustomFields(task.custom_fields || []);
  const company = extractCompanyFromTitle(task.name) || 'UNKNOWN';
  
  return {
    id: task.gid,
    asanaId: task.gid,
    title: task.name,
    company,
    ref: extractReferenceFromTitle(task.name),
    status: task.completed ? 'Concluído' : 'Em Progresso',
    transport: {
      exporter: customFields.Exportador || company,
      company: company,
      vessel: customFields.Navio || customFields.Vessel || '',
      blAwb: customFields.BL || customFields.AWB || '',
      containers: customFields.Container ? [customFields.Container] : [],
      terminal: customFields.Terminal || '',
      products: customFields.Produto ? [customFields.Produto] : []
    },
    schedule: {
      etd: customFields.ETD || '',
      eta: customFields.ETA || '',
      freetime: customFields.Freetime || '',
      responsible: customFields.Responsavel || customFields.Responsible || '',
      operationalStatus: task.completed ? 'Concluído' : 'Em Progresso'
    },
    regulatory: {
      orgaosAnuentes: customFields.OrgaosAnuentes ? [customFields.OrgaosAnuentes] : []
    },
    lastUpdate: task.modified_at || new Date().toISOString()
  };
}

function extractCustomFields(customFields: any[]) {
  const fields: Record<string, any> = {};
  
  customFields.forEach(field => {
    if (field.name) {
      const value = field.text_value || 
                   field.number_value?.toString() || 
                   field.enum_value?.name || 
                   '';
      if (value) {
        fields[field.name] = value;
      }
    }
  });
  
  return fields;
}

function extractCompanyFromTitle(title: string): string | null {
  if (!title) return null;
  
  // Padrões para extrair empresa do título
  const patterns = [
    /^\d+º?\s+([A-Z][A-Z\s&\.]+?)(?:\s*\(|$)/i,
    /^(\d+)?\s*[-–]\s*([A-Z][A-Z\s&\.]+)/i,
    /^([A-Z][A-Z\s&\.]{2,})(?:\s*\(|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const company = (match[2] || match[1])?.trim().toUpperCase();
      if (company && company.length > 1) {
        return company;
      }
    }
  }
  
  return null;
}

function extractReferenceFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

function calculateMetrics(trackings: any[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  const statusDistribution: Record<string, number> = {};
  const exporterDistribution: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    statusDistribution[tracking.status] = (statusDistribution[tracking.status] || 0) + 1;
    exporterDistribution[tracking.company] = (exporterDistribution[tracking.company] || 0) + 1;
  });
  
  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    statusDistribution,
    exporterDistribution,
    armadorDistribution: {},
    uniqueExporters: Object.keys(exporterDistribution).length,
    uniqueShippingLines: 0,
    uniqueTerminals: 0,
    totalContainers: trackings.reduce((sum, t) => sum + (t.transport.containers?.length || 0), 0)
  };
}