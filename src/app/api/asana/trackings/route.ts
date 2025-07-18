// src/app/api/asana/trackings/route.ts - Produção real
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();

    // 1. Get workspace
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];

    // 2. Get all projects
    const projects = await asanaClient.getProjects(workspace.gid);
    
    // 3. Find tracking project (flexible search)
    const trackingProject = projects.find(p => 
      p.name.toLowerCase().includes('tracking') ||
      p.name.toLowerCase().includes('marítimo') ||
      p.name.toLowerCase().includes('importação') ||
      p.name.toLowerCase().includes('porcelanosa') ||
      p.name.toLowerCase().includes('univar')
    );

    if (!trackingProject) {
      return NextResponse.json({
        success: false,
        error: 'Projeto de tracking não encontrado',
        availableProjects: projects.map(p => p.name)
      }, { status: 404 });
    }

    // 4. Get tasks
    const tasks = await asanaClient.getProjectTasks(trackingProject.gid);

    // 5. Transform tasks to tracking format
    const trackings = tasks
      .filter(task => task.name && task.name.trim())
      .map(task => transformAsanaTaskToTracking(task));

    return NextResponse.json({
      success: true,
      data: trackings,
      meta: {
        workspace: workspace.name,
        project: trackingProject.name,
        count: trackings.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get Trackings Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao buscar trackings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function transformAsanaTaskToTracking(task: any) {
  // Extract custom fields
  const customFields: Record<string, string> = {};
  if (task.custom_fields) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        const key = field.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        
        customFields[key] = field.text_value || 
                           field.number_value?.toString() || 
                           field.enum_value?.name || 
                           '';
      }
    });
  }

  // Generate clean ID for URL
  const trackingId = task.name
    .toLowerCase()
    .replace(/[°\s-]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return {
    id: trackingId,
    asanaId: task.gid,
    title: task.name,
    description: task.notes || '',
    status: task.completed ? 'Concluído' : 'Em Progresso',
    lastUpdate: new Date(task.modified_at || task.created_at).toLocaleDateString('pt-BR'),
    transport: {
      exporter: customFields.exportador || customFields.exporter || '',
      company: customFields.companhia || customFields.company || customFields.shipping_company || '',
      vessel: customFields.navio || customFields.vessel || customFields.ship || '',
      blAwb: customFields.bl_awb || customFields.bl || customFields.awb || customFields.bill_of_lading || '',
      containers: parseMultilineField(customFields.containers || customFields.container || ''),
      terminal: customFields.terminal || customFields.port || ''
    },
    schedule: {
      eta: formatDate(customFields.eta || customFields.chegada || customFields.arrival || ''),
      freetime: formatDate(customFields.freetime || customFields.fim_freetime || customFields.free_time || ''),
      responsible: task.assignee?.name || customFields.responsavel || customFields.responsible || '',
      status: customFields.status_entrega || customFields.delivery_status || customFields.status || 
             (task.completed ? 'Concluído' : 'Em Progresso')
    },
    partners: {
      dispatcher: customFields.despachante || customFields.dispatcher || customFields.customs_broker || '',
      transporter: customFields.transportadora || customFields.transporter || customFields.logistics || '',
      invoices: parseMultilineField(customFields.invoices || customFields.faturas || customFields.invoice_numbers || '')
    }
  };
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