// src/app/api/asana/debug-companies/route.ts - Debug endpoint
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);
    
    console.log(`\n=== DEBUGGING COMPANIES EXTRACTION ===`);
    console.log(`Total tasks: ${tasks.length}`);

    const debugData = tasks.slice(0, 10).map((task, index) => {
      const fields = new Map<string, string>();
      
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        task.custom_fields.forEach((field: any) => {
          if (field.name) {
            const value = field.text_value || 
                         field.number_value?.toString() || 
                         field.enum_value?.name ||
                         field.display_value ||
                         '';
            if (value && value.trim()) {
              fields.set(field.name, value.trim());
            }
          }
        });
      }

      return {
        index,
        taskName: task.name,
        exportadorField: fields.get('Exportador') || 'NOT_FOUND',
        customFieldsCount: task.custom_fields?.length || 0,
        hasExportadorField: fields.has('Exportador'),
        allFields: Array.from(fields.keys())
      };
    });

    return NextResponse.json({
      success: true,
      debug: {
        totalTasks: tasks.length,
        taskDebugData: debugData,
        allUniqueFields: [...new Set(
          tasks.flatMap(t => t.custom_fields?.map((cf: any) => cf.name) || [])
        )].filter(Boolean)
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}