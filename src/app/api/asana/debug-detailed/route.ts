// src/app/api/asana/debug-detailed/route.ts
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);

    // Debug COMPLETO de 3 tasks para ver EXATAMENTE o que vem do Asana
    const debugTasks = tasks.slice(0, 3).map(task => {
      console.log('=== TASK DEBUG ===');
      console.log('Task name:', task.name);
      console.log('Task completed:', task.completed);
      console.log('Task assignee:', task.assignee?.name);
      console.log('Custom fields count:', task.custom_fields?.length);
      
      const customFieldsDebug: any = {};
      if (task.custom_fields) {
        task.custom_fields.forEach((field: any, index: number) => {
          console.log(`Field ${index}:`, {
            name: field.name,
            text_value: field.text_value,
            number_value: field.number_value,
            enum_value: field.enum_value,
            type: field.type
          });
          
          customFieldsDebug[field.name || `field_${index}`] = {
            text_value: field.text_value,
            number_value: field.number_value,
            enum_value: field.enum_value?.name,
            type: field.type
          };
        });
      }
      
      console.log('Notes preview:', task.notes?.substring(0, 100));
      
      return {
        name: task.name,
        completed: task.completed,
        assignee: task.assignee?.name,
        customFields: customFieldsDebug,
        notesPreview: task.notes?.substring(0, 100),
        hasNotes: !!task.notes
      };
    });

    // Listar TODOS os nomes de custom fields únicos
    const allCustomFieldNames = [...new Set(
      tasks.flatMap(t => t.custom_fields?.map((cf: any) => cf.name) || [])
    )].filter(Boolean);

    // Contar status REAIS baseado nos dados do Asana
    const statusCounts: Record<string, number> = {};
    const completionCounts = { completed: 0, notCompleted: 0 };
    
    tasks.forEach(task => {
      if (task.completed) {
        completionCounts.completed++;
      } else {
        completionCounts.notCompleted++;
      }
      
      // Tentar extrair status dos custom fields
      let taskStatus = 'Não Definido';
      if (task.custom_fields) {
        task.custom_fields.forEach((field: any) => {
          if (field.name && field.name.toLowerCase().includes('status')) {
            taskStatus = field.text_value || field.enum_value?.name || 'Não Definido';
          }
        });
      }
      
      // Se não achou status nos custom fields, usar completed
      if (taskStatus === 'Não Definido') {
        taskStatus = task.completed ? 'Concluído' : 'Em Progresso';
      }
      
      statusCounts[taskStatus] = (statusCounts[taskStatus] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      debug: {
        totalTasks: tasks.length,
        sampleTasks: debugTasks,
        allCustomFieldNames,
        statusCounts,
        completionCounts,
        rawFieldsFound: allCustomFieldNames.length
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}