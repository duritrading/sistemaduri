// src/app/api/asana/deep-debug/route.ts - Debug profundo dos custom fields
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 DEEP DEBUG: Analisando custom fields detalhadamente...');
    
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado'
      }, { status: 401 });
    }

    // 1. Autenticar
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Erro de autenticação: ${userResponse.status}`
      }, { status: 401 });
    }

    const userData = await userResponse.json();

    // 2. Buscar workspace
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const workspacesData = await workspacesResponse.json();
    const workspace = workspacesData.data?.[0];

    // 3. Buscar projeto operacional
    const projectsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100&opt_fields=name,notes`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
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

    // 4. Buscar custom fields do projeto (MUITO IMPORTANTE)
    console.log('🔍 Buscando custom fields do projeto...');
    const projectDetailsResponse = await fetch(
      `https://app.asana.com/api/1.0/projects/${operationalProject.gid}?opt_fields=custom_fields.name,custom_fields.type,custom_fields.enum_options.name,custom_fields.enum_options.enabled`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const projectDetails = await projectDetailsResponse.json();
    const projectCustomFields = projectDetails.data?.custom_fields || [];

    // 5. Buscar tasks com TODOS os custom fields possíveis
    const allOptFields = [
      'name',
      'notes', 
      'completed',
      'custom_fields.name',
      'custom_fields.display_value',
      'custom_fields.text_value',
      'custom_fields.number_value',
      'custom_fields.enum_value.name',
      'custom_fields.enum_value.enabled',
      'custom_fields.multi_enum_values.name',
      'custom_fields.date_value',
      'custom_fields.resource_subtype',
      'custom_fields.type',
      'assignee.name',
      'created_at',
      'modified_at'
    ].join(',');

    const tasksResponse = await fetch(
      `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&opt_fields=${allOptFields}&limit=20`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data || [];

    // 6. ANÁLISE DETALHADA DOS CUSTOM FIELDS
    const detailedAnalysis = {
      projectCustomFields: projectCustomFields.map((field: any) => ({
        name: field.name,
        type: field.type,
        enumOptions: field.enum_options?.map((opt: any) => opt.name) || null
      })),
      
      taskCustomFieldsAnalysis: tasks.slice(0, 10).map((task: any, index: number) => {
        const analysis = {
          taskIndex: index + 1,
          taskName: task.name,
          taskCompleted: task.completed,
          customFieldsFound: task.custom_fields?.length || 0,
          customFieldsDetails: {} as any,
          allCustomFieldValues: {} as any
        };

        // Analisar cada custom field da task
        if (task.custom_fields) {
          task.custom_fields.forEach((field: any, fieldIndex: number) => {
            const fieldAnalysis = {
              name: field.name,
              type: field.type || field.resource_subtype,
              displayValue: field.display_value,
              textValue: field.text_value,
              numberValue: field.number_value,
              enumValue: field.enum_value?.name,
              dateValue: field.date_value,
              multiEnumValues: field.multi_enum_values?.map((v: any) => v.name),
              rawField: field
            };

            analysis.customFieldsDetails[`field_${fieldIndex}_${field.name || 'unnamed'}`] = fieldAnalysis;
            
            // Mapear valores para busca fácil
            if (field.name) {
              const value = field.display_value || 
                          field.text_value || 
                          field.number_value?.toString() || 
                          field.enum_value?.name ||
                          (field.multi_enum_values?.map((v: any) => v.name).join(', '));
              
              if (value) {
                analysis.allCustomFieldValues[field.name] = value;
              }
            }
          });
        }

        return analysis;
      }),

      // Análise de padrões de stage
      stagePatterns: {
        possibleStageFields: [],
        stageValuesFound: [],
        asanaStagesDetected: []
      } as any
    };

    // 7. DETECTAR CAMPOS QUE PODEM CONTER STAGES
    const allFieldNames = new Set<string>();
    const allFieldValues = new Set<string>();
    
    tasks.forEach((task: any) => {
      if (task.custom_fields) {
        task.custom_fields.forEach((field: any) => {
          if (field.name) {
            allFieldNames.add(field.name);
            
            const value = field.display_value || 
                         field.text_value || 
                         field.enum_value?.name;
            if (value) {
              allFieldValues.add(value);
            }
          }
        });
      }
    });

    // Campos que podem conter stages
    const stageKeywords = ['stage', 'status', 'etapa', 'fase', 'estado', 'situacao', 'current', 'flow'];
    detailedAnalysis.stagePatterns.possibleStageFields = Array.from(allFieldNames).filter(name =>
      stageKeywords.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Valores que correspondem aos stages esperados
    const expectedStages = [
      'Abertura do Processo',
      'Pré Embarque',
      'Rastreio da Carga',
      'Chegada da Carga',
      'Entrega',
      'Fechamento',
      'Processos Finalizados'
    ];

    detailedAnalysis.stagePatterns.asanaStagesDetected = Array.from(allFieldValues).filter(value =>
      expectedStages.some(stage => 
        stage.toLowerCase() === value.toLowerCase() ||
        value.toLowerCase().includes(stage.toLowerCase()) ||
        stage.toLowerCase().includes(value.toLowerCase())
      )
    );

    detailedAnalysis.stagePatterns.stageValuesFound = Array.from(allFieldValues);

    // 8. RECOMENDAÇÕES BASEADAS NA ANÁLISE
    const recommendations = {
      likelyStageField: null as string | null,
      mappingStrategy: 'unknown',
      nextSteps: [] as string[]
    };

    // Determinar campo mais provável para stages
    if (detailedAnalysis.stagePatterns.possibleStageFields.length > 0) {
      recommendations.likelyStageField = detailedAnalysis.stagePatterns.possibleStageFields[0];
      recommendations.mappingStrategy = 'custom_field_mapping';
      recommendations.nextSteps.push(`Use o campo "${recommendations.likelyStageField}" para mapeamento de stages`);
    } else if (detailedAnalysis.stagePatterns.asanaStagesDetected.length > 0) {
      recommendations.mappingStrategy = 'value_based_mapping';
      recommendations.nextSteps.push('Valores de stage encontrados, implementar busca por valor');
    } else {
      recommendations.mappingStrategy = 'fallback_mapping';
      recommendations.nextSteps.push('Usar mapeamento baseado em status padrão do Asana');
    }

    return NextResponse.json({
      success: true,
      debug: {
        authenticatedUser: userData.data?.name,
        workspace: { gid: workspace.gid, name: workspace.name },
        project: { gid: operationalProject.gid, name: operationalProject.name },
        totalTasks: tasks.length,
        ...detailedAnalysis,
        recommendations,
        summary: {
          totalFieldNames: allFieldNames.size,
          totalFieldValues: allFieldValues.size,
          possibleStageFields: detailedAnalysis.stagePatterns.possibleStageFields.length,
          detectedStageValues: detailedAnalysis.stagePatterns.asanaStagesDetected.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Deep debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro no debug profundo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}