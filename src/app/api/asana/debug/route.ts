// src/app/api/asana/debug/route.ts - Debug endpoint para analisar custom fields
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Debug Asana: Analisando custom fields...');
    
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado',
        setup: {
          step1: 'Configure ASANA_ACCESS_TOKEN no .env.local',
          step2: 'Obtenha token em: https://developers.asana.com/docs/personal-access-token'
        }
      }, { status: 401 });
    }

    // 1. Autenticar
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Erro de autenticação: ${userResponse.status}`,
        troubleshooting: 'Verifique se o token está correto e não expirou'
      }, { status: 401 });
    }

    const userData = await userResponse.json();

    // 2. Buscar workspace
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const workspacesData = await workspacesResponse.json();
    const workspace = workspacesData.data?.[0];

    if (!workspace) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum workspace encontrado'
      }, { status: 404 });
    }

    // 3. Buscar projeto operacional
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100&opt_fields=name,notes`,
      {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      }
    );
    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];
    
    const operationalProject = projects.find((p: any) => 
      p.name && p.name.toLowerCase().includes('operacional')
    );

    if (!operationalProject) {
      return NextResponse.json({
        success: false,
        error: 'Projeto operacional não encontrado',
        availableProjects: projects.map(p => ({ gid: p.gid, name: p.name }))
      }, { status: 404 });
    }

    // 4. Buscar algumas tasks para análise
    const tasksResponse = await fetch(
      `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=name,notes,completed,custom_fields.name,custom_fields.display_value,custom_fields.text_value,custom_fields.number_value,custom_fields.enum_value.name,custom_fields.resource_subtype&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      }
    );
    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data || [];

    // 5. Analisar custom fields
    const customFieldsAnalysis = {
      totalTasks: tasks.length,
      uniqueFieldNames: new Set<string>(),
      fieldsData: [] as any[],
      fieldFrequency: {} as Record<string, number>,
      sampleTasks: [] as any[]
    };

    tasks.forEach((task: any, index: number) => {
      const taskAnalysis = {
        taskName: task.name,
        customFields: {} as Record<string, any>,
        rawCustomFields: task.custom_fields || []
      };

      if (task.custom_fields) {
        task.custom_fields.forEach((field: any) => {
          if (field.name) {
            customFieldsAnalysis.uniqueFieldNames.add(field.name);
            customFieldsAnalysis.fieldFrequency[field.name] = 
              (customFieldsAnalysis.fieldFrequency[field.name] || 0) + 1;

            // Extrair valor
            let value = field.display_value || 
                       field.text_value || 
                       field.number_value?.toString() || 
                       field.enum_value?.name || 
                       null;

            taskAnalysis.customFields[field.name] = {
              value,
              type: field.resource_subtype || 'unknown',
              rawField: field
            };
          }
        });
      }

      if (index < 3) { // Primeiras 3 tasks para sample
        customFieldsAnalysis.sampleTasks.push(taskAnalysis);
      }
    });

    // 6. Estatísticas finais
    const fieldsArray = Array.from(customFieldsAnalysis.uniqueFieldNames);
    const mostCommonFields = Object.entries(customFieldsAnalysis.fieldFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      debug: {
        authenticatedUser: userData.data?.name,
        workspace: { gid: workspace.gid, name: workspace.name },
        project: { gid: operationalProject.gid, name: operationalProject.name },
        totalTasks: tasks.length,
        uniqueCustomFields: fieldsArray.length,
        customFieldNames: fieldsArray,
        mostCommonFields,
        sampleTasks: customFieldsAnalysis.sampleTasks,
        recommendations: {
          keyFields: [
            'ETD', 'ETA', 'Exportador', 'Armador', 'Terminal', 'Container', 
            'Produto', 'BL', 'Responsavel', 'Orgaos_Anuentes'
          ],
          nextSteps: [
            'Use os nomes exatos dos custom fields encontrados',
            'Verifique se os valores estão sendo extraídos corretamente',
            'Teste com empresa específica usando ?company=NOME_EMPRESA'
          ]
        }
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro no debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}