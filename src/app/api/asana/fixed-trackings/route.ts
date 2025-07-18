// src/app/api/asana/fixed-trackings/route.ts - API com mapeamento corrigido
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';
import { AsanaFieldMapper, type ProcessedTracking } from '@/lib/asana-field-mapper';

export async function GET() {
  try {
    console.log('🚀 INICIANDO BUSCA ASANA COM MAPEAMENTO CORRIGIDO');
    
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
    
    console.log(`📊 Encontradas ${tasks.length} tasks no projeto Operacional`);

    // Transformar usando o mapeador específico
    const trackings: ProcessedTracking[] = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => AsanaFieldMapper.transformAsanaTask(task));

    console.log(`✅ Transformadas ${trackings.length} trackings`);

    // Log de debug dos primeiros itens
    if (trackings.length > 0) {
      console.log('\n=== SAMPLE DATA ===');
      trackings.slice(0, 3).forEach((tracking, index) => {
        console.log(`${index + 1}. ${tracking.title}`);
        console.log(`   Company: ${tracking.company}`);
        console.log(`   Exporter: ${tracking.transport.exporter}`);
        console.log(`   Shipping: ${tracking.transport.shippingCompany}`);
        console.log(`   Products: ${tracking.transport.products.join(', ')}`);
        console.log(`   Status: ${tracking.status}`);
      });
    }

    // Calcular métricas corretas
    const metrics = calculateCorrectMetrics(trackings);
    
    console.log('\n=== MÉTRICAS CALCULADAS ===');
    console.log(`Total operations: ${metrics.totalOperations}`);
    console.log(`Unique exporters: ${metrics.uniqueExporters}`);
    console.log(`Unique shipping lines: ${metrics.uniqueShippingLines}`);
    console.log(`Unique terminals: ${metrics.uniqueTerminals}`);
    console.log(`Total containers: ${metrics.totalContainers}`);

    return NextResponse.json({
      success: true,
      data: trackings,
      metrics,
      meta: {
        workspace: workspace.name,
        project: operationalProject.name,
        totalTasks: tasks.length,
        processedTrackings: trackings.length,
        lastSync: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro na API Fixed Trackings:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar dados do Asana',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

function calculateCorrectMetrics(trackings: ProcessedTracking[]) {
  const total = trackings.length;
  const completed = trackings.filter(t => t.status === 'Concluído').length;
  const active = total - completed;
  
  // Status distribution
  const statusDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    statusDistribution[t.status] = (statusDistribution[t.status] || 0) + 1;
  });
  
  // Company distribution (from titles)
  const companyDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.company && t.company !== 'Não identificado') {
      companyDistribution[t.company] = (companyDistribution[t.company] || 0) + 1;
    }
  });
  
  // Exporters (from Exportador field)
  const exporterDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.transport.exporter && t.transport.exporter.trim()) {
      exporterDistribution[t.transport.exporter] = (exporterDistribution[t.transport.exporter] || 0) + 1;
    }
  });
  
  // Shipping lines (from CIA DE TRANSPORTE field)
  const shippingLines = new Set<string>();
  trackings.forEach(t => {
    if (t.transport.shippingCompany && t.transport.shippingCompany.trim()) {
      shippingLines.add(t.transport.shippingCompany);
    }
  });
  
  // Terminals
  const terminals = new Set<string>();
  trackings.forEach(t => {
    if (t.transport.terminal && t.transport.terminal.trim()) {
      terminals.add(t.transport.terminal);
    }
  });
  
  // Products
  const allProducts = new Set<string>();
  trackings.forEach(t => {
    t.transport.products.forEach(product => {
      if (product && product.trim()) {
        allProducts.add(product);
      }
    });
  });
  
  // Containers count
  const totalContainers = trackings.reduce((sum, t) => {
    return sum + t.transport.containers.length;
  }, 0);
  
  // Órgãos Anuentes
  const orgaosAnuentes = new Set<string>();
  trackings.forEach(t => {
    t.regulatory.orgaosAnuentes.forEach(orgao => {
      if (orgao && orgao.trim()) {
        orgaosAnuentes.add(orgao);
      }
    });
  });
  
  // Armadores distribution
  const armadorDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.transport.shippingCompany && t.transport.shippingCompany.trim()) {
      armadorDistribution[t.transport.shippingCompany] = (armadorDistribution[t.transport.shippingCompany] || 0) + 1;
    }
  });
  
  // Products distribution
  const productDistribution: Record<string, number> = {};
  trackings.forEach(t => {
    t.transport.products.forEach(product => {
      if (product && product.trim()) {
        productDistribution[product] = (productDistribution[product] || 0) + 1;
      }
    });
  });
  
  // ETD timeline
  const etdTimeline: Record<string, number> = {};
  trackings.forEach(t => {
    if (t.schedule.etd) {
      try {
        const [day, month, year] = t.schedule.etd.split('/');
        const monthKey = `${month}/${year}`;
        etdTimeline[monthKey] = (etdTimeline[monthKey] || 0) + 1;
      } catch (e) {
        // Ignorar datas inválidas
      }
    }
  });

  return {
    totalOperations: total,
    activeOperations: active,
    completedOperations: completed,
    effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    
    // Distributions for charts
    statusDistribution,
    companyDistribution,
    exporterDistribution,
    armadorDistribution,
    productDistribution,
    etdTimeline,
    
    // Counts for cards
    uniqueExporters: Object.keys(exporterDistribution).length,
    uniqueShippingLines: shippingLines.size,
    uniqueTerminals: terminals.size,
    totalContainers,
    
    // Arrays for components
    allShippingLines: Array.from(shippingLines),
    allTerminals: Array.from(terminals),
    allProducts: Array.from(allProducts),
    allOrgaosAnuentes: Array.from(orgaosAnuentes),
    
    // Additional metrics
    withProductInfo: trackings.filter(t => t.transport.products.length > 0).length,
    withETD: trackings.filter(t => t.schedule.etd).length,
    withETA: trackings.filter(t => t.schedule.eta).length,
    withContainers: trackings.filter(t => t.transport.containers.length > 0).length
  };
}