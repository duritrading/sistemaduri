// src/app/api/asana/debug-complete/route.ts
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    const workspaces = await asanaClient.getWorkspaces();
    const workspace = workspaces[0];
    const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
    const tasks = await asanaClient.getAllProjectTasks(operationalProject.gid);

    console.log('=== COMPLETE ASANA DEBUG ===');
    console.log(`Total tasks: ${tasks.length}`);

    // Debug first 3 tasks completely
    const debugTasks = tasks.slice(0, 3).map((task, index) => {
      console.log(`\n--- TASK ${index + 1}: ${task.name} ---`);
      console.log('Completed:', task.completed);
      console.log('Assignee:', task.assignee?.name);
      console.log('Custom fields count:', task.custom_fields?.length || 0);
      
      const customFieldsAnalysis: any = {};
      if (task.custom_fields) {
        task.custom_fields.forEach((field: any, i: number) => {
          const fieldData = {
            name: field.name,
            type: field.type,
            text_value: field.text_value,
            number_value: field.number_value,
            enum_value: field.enum_value?.name,
            display_value: field.display_value
          };
          
          console.log(`  Field ${i}:`, fieldData);
          customFieldsAnalysis[`field_${i}_${field.name || 'unnamed'}`] = fieldData;
        });
      }
      
      console.log('Notes length:', task.notes?.length || 0);
      console.log('Notes preview:', task.notes?.substring(0, 200));
      
      return {
        name: task.name,
        completed: task.completed,
        assignee: task.assignee?.name,
        customFieldsAnalysis,
        notesPreview: task.notes?.substring(0, 200),
        hasCustomFields: !!task.custom_fields?.length
      };
    });

    // Get ALL unique custom field names across all tasks
    const allCustomFieldNames = [...new Set(
      tasks.flatMap(t => t.custom_fields?.map((cf: any) => cf.name) || [])
    )].filter(Boolean);

    console.log('\n=== ALL CUSTOM FIELD NAMES ===');
    allCustomFieldNames.forEach((name, index) => {
      console.log(`${index + 1}. "${name}"`);
    });

    // Analyze title patterns for company extraction
    const titlePatterns = tasks.slice(0, 10).map(task => ({
      title: task.name,
      extracted: extractCompanyDebug(task.name)
    }));

    console.log('\n=== TITLE PATTERN ANALYSIS ===');
    titlePatterns.forEach(({ title, extracted }) => {
      console.log(`"${title}" -> Company: "${extracted.company}", REF: "${extracted.ref}"`);
    });

    return NextResponse.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        debugTasks,
        allCustomFieldNames,
        titlePatterns,
        fieldsFrequency: getFieldsFrequency(tasks),
        recommendation: 'Use this data to fix field mapping'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function extractCompanyDebug(title: string): { company: string, ref: string } {
  const patterns = [
    { name: 'Pattern 1', regex: /^(\d+)º?\s+([^(\-]+)(?:\s*\(.*\))?/ },
    { name: 'Pattern 2', regex: /^(\d+)\s*[-–]\s*([^(\-]+)/ },
    { name: 'Pattern 3', regex: /^(\d+)\s+([A-Z][^(\-\d]*)/ },
    { name: 'Pattern 4', regex: /^([A-Z][^(\-\d]*)/ }
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern.regex);
    if (match) {
      const ref = match[1] || '';
      const company = (match[2] || match[1] || '').trim();
      console.log(`  ${pattern.name} matched: REF="${ref}", Company="${company}"`);
      return { company, ref };
    }
  }
  
  return { company: 'Não identificado', ref: '' };
}

function getFieldsFrequency(tasks: any[]): Record<string, number> {
  const frequency: Record<string, number> = {};
  
  tasks.forEach(task => {
    if (task.custom_fields) {
      task.custom_fields.forEach((field: any) => {
        if (field.name) {
          frequency[field.name] = (frequency[field.name] || 0) + 1;
        }
      });
    }
  });
  
  return frequency;
}