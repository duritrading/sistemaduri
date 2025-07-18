// src/app/api/asana/trackings/route.ts - Fix usando a mesma lógica do test-asana
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();

    // 1. Get workspace
    const workspaces = await asanaClient.getWorkspaces();
    if (workspaces.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum workspace encontrado'
      }, { status: 404 });
    }

    const workspace = workspaces[0];

    // 2. Find "Operacional" project (same logic as test-asana)
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);

    // 3. Get tasks from Operacional project
    const tasks = await asanaClient.getProjectTasks(operationalProject.gid);
    console.log(`Found ${tasks.length} tasks in Operacional project`);

    // 4. Transform ALL tasks to tracking format (remove filters for now)
    const trackings = tasks
      .filter(task => task.name && task.name.trim()) // Only filter empty names
      .map(task => transformAsanaTaskToTracking(task));

    console.log(`Transformed ${trackings.length} trackings`);

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

function transformAsanaTaskToTracking(task: any) {
  // Extract custom fields with flexible field name matching
  const customFields: Record<string, string> = {};
  if (task.custom_fields) {
    task.custom_fields.forEach((field: any) => {
      if (field.name) {
        const key = field.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
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
      exporter: extractField(customFields, ['exportador', 'exporter', 'shipper']),
      company: extractField(customFields, ['companhia', 'company', 'shipping_company', 'armador']),
      vessel: extractField(customFields, ['navio', 'vessel', 'ship', 'embarcacao']),
      blAwb: extractField(customFields, ['bl_awb', 'bl', 'awb', 'bill_of_lading', 'conhecimento']),
      containers: parseMultilineField(extractField(customFields, ['containers', 'container', 'conteineres'])),
      terminal: extractField(customFields, ['terminal', 'port', 'porto'])
    },
    schedule: {
      eta: formatDate(extractField(customFields, ['eta', 'chegada', 'arrival', 'previsao_chegada'])),
      freetime: formatDate(extractField(customFields, ['freetime', 'fim_freetime', 'free_time', 'prazo_freetime'])),
      responsible: task.assignee?.name || extractField(customFields, ['responsavel', 'responsible', 'encarregado']),
      status: extractField(customFields, ['status_entrega', 'delivery_status', 'status', 'situacao']) || 
             (task.completed ? 'Concluído' : 'Em Progresso')
    },
    partners: {
      dispatcher: extractField(customFields, ['despachante', 'dispatcher', 'customs_broker', 'despachante_aduaneiro']),
      transporter: extractField(customFields, ['transportadora', 'transporter', 'logistics', 'transportador']),
      invoices: parseMultilineField(extractField(customFields, ['invoices', 'faturas', 'invoice_numbers', 'nf']))
    }
  };
}

function extractField(customFields: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (customFields[name]) {
      return customFields[name];
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