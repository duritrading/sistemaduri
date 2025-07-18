// src/app/api/debug-asana/route.ts
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);

    // Debug detailed task analysis
    const debugData = tasks.slice(0, 3).map(task => {
      const customFields: Record<string, any> = {};
      
      if (task.custom_fields) {
        task.custom_fields.forEach((field: any, index: number) => {
          customFields[`field_${index}`] = {
            name: field.name,
            text_value: field.text_value,
            number_value: field.number_value,
            enum_value: field.enum_value,
            type: field.type || 'unknown',
            raw: field
          };
        });
      }

      return {
        name: task.name,
        notes: task.notes,
        assignee: task.assignee?.name,
        customFieldsCount: task.custom_fields?.length || 0,
        customFieldsData: customFields,
        // Try to extract from notes
        notesExtraction: {
          hasNavio: task.notes?.toLowerCase().includes('navio'),
          hasArmador: task.notes?.toLowerCase().includes('armador'),
          hasMSC: task.notes?.toLowerCase().includes('msc'),
          hasCMA: task.notes?.toLowerCase().includes('cma'),
          hasContainer: task.notes?.toLowerCase().includes('container'),
          notesContent: task.notes?.substring(0, 200)
        }
      };
    });

    // Get all unique custom field names
    const allCustomFieldNames = [...new Set(
      tasks.flatMap(t => t.custom_fields?.map((cf: any) => cf.name) || [])
    )];

    return NextResponse.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        debugTasks: debugData,
        allCustomFieldNames,
        recommendation: 'Check custom field names and extraction logic'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}