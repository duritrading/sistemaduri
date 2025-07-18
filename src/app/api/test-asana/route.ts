// src/app/api/test-asana/route.ts - Updated para projeto "Operacional"
import { NextResponse } from 'next/server';
import { AsanaClient } from '@/lib/asana-client';

export async function GET() {
  try {
    const asanaClient = new AsanaClient();
    
    // 1. Get workspaces
    const workspaces = await asanaClient.getWorkspaces();
    console.log('Available workspaces:', workspaces.map(w => ({ name: w.name, gid: w.gid })));

    if (workspaces.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum workspace encontrado'
      }, { status: 404 });
    }

    const workspace = workspaces[0];

    // 2. Get all projects
    const projects = await asanaClient.getProjects(workspace.gid);
    console.log('Available projects:', projects.map(p => p.name));

    // 3. Find "Operacional" project
    try {
      const operationalProject = await asanaClient.findOperationalProject(workspace.gid);
      console.log('Found Operacional project:', operationalProject);

      // 4. Get tasks from Operacional project
      const tasks = await asanaClient.getProjectTasks(operationalProject.gid);
      console.log(`Found ${tasks.length} tasks in Operacional project`);

      // 5. Sample task analysis
      const sampleTasks = tasks.slice(0, 5).map(task => ({
        name: task.name,
        hasNotes: !!task.notes,
        customFieldsCount: task.custom_fields?.length || 0,
        customFieldNames: task.custom_fields?.map((cf: any) => cf.name) || [],
        completed: task.completed,
        assignee: task.assignee?.name || null
      }));

      return NextResponse.json({
        success: true,
        data: {
          workspace: {
            name: workspace.name,
            gid: workspace.gid
          },
          operationalProject: {
            name: operationalProject.name,
            gid: operationalProject.gid
          },
          tasksCount: tasks.length,
          sampleTasks,
          allCustomFields: [...new Set(
            tasks.flatMap(t => t.custom_fields?.map((cf: any) => cf.name) || [])
          )]
        }
      });

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Projeto Operacional não encontrado',
        availableProjects: projects.map(p => p.name)
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Test Asana Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}