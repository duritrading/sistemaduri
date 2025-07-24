// src/app/api/asana/health/route.ts - HEALTH CHECK COMPLETO PARA ASANA API
import { NextResponse } from 'next/server';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    tokenValid: boolean;
    connectivityOk: boolean;
    workspaceFound: boolean;
    projectFound: boolean;
    canFetchTasks: boolean;
  };
  details: {
    tokenLength: number;
    userInfo?: any;
    workspace?: any;
    project?: any;
    taskCount?: number;
    errors: string[];
  };
  recommendations: string[];
}

export async function GET() {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      tokenValid: false,
      connectivityOk: false,
      workspaceFound: false,
      projectFound: false,
      canFetchTasks: false
    },
    details: {
      tokenLength: 0,
      errors: []
    },
    recommendations: []
  };

  try {
    console.log('🔍 Iniciando health check completo do Asana...');

    // 1. VERIFICAR TOKEN
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    result.details.tokenLength = token.length;

    if (!token || token.trim() === '' || token === 'your_asana_token_here' || token.includes('your_')) {
      result.details.errors.push('Token não configurado ou inválido');
      result.recommendations.push('Configure ASANA_ACCESS_TOKEN no arquivo .env.local');
      result.recommendations.push('Obtenha o token em: https://app.asana.com/0/my-apps');
      return NextResponse.json(result);
    }

    result.checks.tokenValid = true;
    console.log('✅ Token configurado');

    // 2. TESTAR CONECTIVIDADE BÁSICA
    try {
      const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!userResponse.ok) {
        throw new Error(`API retornou ${userResponse.status}: ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();
      result.details.userInfo = {
        name: userData.data?.name,
        email: userData.data?.email,
        gid: userData.data?.gid
      };
      
      result.checks.connectivityOk = true;
      console.log(`✅ Conectado como: ${userData.data?.name} (${userData.data?.email})`);

    } catch (connectError) {
      result.details.errors.push(`Erro de conectividade: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
      result.recommendations.push('Verifique sua conexão com a internet');
      result.recommendations.push('Confirme se o token não expirou');
      return NextResponse.json(result);
    }

    // 3. VERIFICAR WORKSPACES
    try {
      const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!workspacesResponse.ok) {
        throw new Error(`Workspaces API retornou ${workspacesResponse.status}`);
      }

      const workspacesData = await workspacesResponse.json();
      const workspace = workspacesData.data?.[0];

      if (!workspace) {
        result.details.errors.push('Nenhum workspace encontrado');
        result.recommendations.push('Verifique se você tem acesso a pelo menos um workspace no Asana');
        return NextResponse.json(result);
      }

      result.details.workspace = {
        name: workspace.name,
        gid: workspace.gid
      };
      
      result.checks.workspaceFound = true;
      console.log(`✅ Workspace encontrado: ${workspace.name}`);

      // 4. VERIFICAR PROJETO OPERACIONAL
      try {
        const projectsResponse = await fetch(
          `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          }
        );

        if (!projectsResponse.ok) {
          throw new Error(`Projects API retornou ${projectsResponse.status}`);
        }

        const projectsData = await projectsResponse.json();
        const operationalProject = projectsData.data?.find((p: any) => 
          p.name && p.name.toLowerCase().includes('operacional')
        );

        if (!operationalProject) {
          result.details.errors.push('Projeto operacional não encontrado');
          result.recommendations.push('Crie um projeto com nome contendo "operacional"');
          result.recommendations.push(`Projetos disponíveis: ${projectsData.data?.map((p: any) => p.name).join(', ')}`);
          
          // Ainda consideramos parcialmente saudável se chegamos até aqui
          result.status = 'degraded';
          return NextResponse.json(result);
        }

        result.details.project = {
          name: operationalProject.name,
          gid: operationalProject.gid
        };
        
        result.checks.projectFound = true;
        console.log(`✅ Projeto operacional encontrado: ${operationalProject.name}`);

        // 5. TESTAR BUSCA DE TAREFAS (com limite correto)
        try {
          const tasksResponse = await fetch(
            `https://app.asana.com/api/1.0/tasks?project=${operationalProject.gid}&limit=50`, // Limite seguro
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
              signal: AbortSignal.timeout(10000)
            }
          );

          if (!tasksResponse.ok) {
            throw new Error(`Tasks API retornou ${tasksResponse.status}`);
          }

          const tasksData = await tasksResponse.json();
          result.details.taskCount = tasksData.data?.length || 0;
          
          result.checks.canFetchTasks = true;
          console.log(`✅ Consegue buscar tarefas: ${result.details.taskCount} encontradas (primeira página)`);

          // TUDO OK!
          result.status = 'healthy';
          result.recommendations.push('Sistema Asana está funcionando perfeitamente!');
          result.recommendations.push('Pode executar a sincronização de empresas com segurança');
          result.recommendations.push(`Total de tarefas disponíveis: ${result.details.taskCount}+ (paginação automática)`);

        } catch (tasksError) {
          result.details.errors.push(`Erro ao buscar tarefas: ${tasksError instanceof Error ? tasksError.message : String(tasksError)}`);
          result.recommendations.push('Verifique as permissões do projeto operacional');
          result.status = 'degraded';
        }

      } catch (projectsError) {
        result.details.errors.push(`Erro ao buscar projetos: ${projectsError instanceof Error ? projectsError.message : String(projectsError)}`);
        result.recommendations.push('Verifique as permissões do workspace');
        result.status = 'degraded';
      }

    } catch (workspaceError) {
      result.details.errors.push(`Erro ao buscar workspaces: ${workspaceError instanceof Error ? workspaceError.message : String(workspaceError)}`);
      result.recommendations.push('Token pode estar com permissões limitadas');
    }

  } catch (error) {
    result.details.errors.push(`Erro geral: ${error instanceof Error ? error.message : String(error)}`);
    result.recommendations.push('Contate o suporte técnico com estes detalhes');
  }

  const endTime = Date.now();
  console.log(`🏁 Health check concluído em ${endTime - startTime}ms. Status: ${result.status}`);

  return NextResponse.json(result);
}