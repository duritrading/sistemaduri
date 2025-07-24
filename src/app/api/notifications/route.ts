// src/app/api/notifications/route.ts - COMPLETO COM FILTRO POR EMPRESA
import { NextRequest, NextResponse } from 'next/server';

interface CommentNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  commentText: string;
  author: string;
  createdAt: string;
  isNew: boolean;
}

interface NotificationsResponse {
  success: boolean;
  data: CommentNotification[];
  unreadCount: number;
  lastChecked: string;
  companyFilter?: string;
  error?: string;
  debugInfo?: any;
}

// ✅ Cache para controlar última verificação por usuário (em memória)
const userLastChecked = new Map<string, string>();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let debugInfo: any = {
    step: 'starting',
    timestamp: new Date().toISOString()
  };

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const companyFilter = searchParams.get('company'); // ✅ NOVO: Filtro por empresa
    const lastChecked = searchParams.get('lastChecked');

    debugInfo.userId = userId;
    debugInfo.companyFilter = companyFilter;
    debugInfo.lastChecked = lastChecked;

    console.log(`🔔 [Notifications] Buscando para usuário: ${userId}, empresa: ${companyFilter || 'todas'}`);

    // ✅ VERIFICAR TOKEN ASANA
    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      console.error('❌ [Notifications] Token Asana não configurado');
      return NextResponse.json({
        success: false,
        error: 'Sistema de notificações temporariamente indisponível',
        data: [],
        unreadCount: 0,
        lastChecked: new Date().toISOString(),
        debugInfo: { ...debugInfo, issue: 'missing_token' }
      }, { status: 200 });
    }

    debugInfo.step = 'token_validated';

    // ✅ BUSCAR TASKS FILTRADAS POR EMPRESA (usando API unificada)
    let filteredTasks: any[] = [];
    
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      
      const unifiedUrl = companyFilter 
        ? `${baseUrl}/api/asana/unified?company=${encodeURIComponent(companyFilter)}&refresh=true`
        : `${baseUrl}/api/asana/unified?refresh=true`;

      console.log(`📡 [Notifications] Buscando tasks: ${unifiedUrl}`);

      const unifiedResponse = await fetch(unifiedUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });

      if (unifiedResponse.ok) {
        const unifiedResult = await unifiedResponse.json();
        if (unifiedResult.success && unifiedResult.data) {
          filteredTasks = unifiedResult.data;
          console.log(`✅ [Notifications] Tasks encontradas: ${filteredTasks.length} (empresa: ${companyFilter || 'todas'})`);
        }
      }

      debugInfo.step = 'tasks_fetched';
      debugInfo.tasksFound = filteredTasks.length;

    } catch (error) {
      console.error('❌ [Notifications] Erro ao buscar tasks:', error);
      // Continuar sem tasks para não quebrar o sistema
      filteredTasks = [];
    }

    // ✅ SE NÃO TEMOS TASKS, RETORNAR VAZIO (mas não erro)
    if (filteredTasks.length === 0) {
      console.log('⚠️ [Notifications] Nenhuma task encontrada para a empresa');
      return NextResponse.json({
        success: true,
        data: [],
        unreadCount: 0,
        lastChecked: new Date().toISOString(),
        companyFilter,
        debugInfo: { ...debugInfo, issue: 'no_tasks_for_company' }
      });
    }

    // ✅ BUSCAR COMENTÁRIOS PARA AS TASKS (limitado a 20 tasks mais recentes)
    const notifications: CommentNotification[] = [];
    const recentTasks = filteredTasks.slice(0, 20); // Limitar para performance
    
    const userLastCheck = lastChecked || userLastChecked.get(userId) || 
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Últimas 24h por padrão

    console.log(`🔍 [Notifications] Processando ${recentTasks.length} tasks desde ${userLastCheck}`);

    // ✅ PROCESSAR TASKS EM PARALELO (lotes de 5 para não sobrecarregar)
    const batchSize = 5;
    for (let i = 0; i < recentTasks.length; i += batchSize) {
      const batch = recentTasks.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (task) => {
        try {
          // Buscar comentários da task
          const commentsUrl = `https://app.asana.com/api/1.0/tasks/${task.id}/stories?opt_fields=text,created_at,created_by.name&_t=${Date.now()}`;
          
          const commentsResponse = await fetch(commentsUrl, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            signal: AbortSignal.timeout(8000)
          });

          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            const stories = commentsData.data || [];

            // Filtrar comentários que começam com "&" e são novos
            const relevantComments = stories
              .filter((story: any) => {
                const hasText = story.text && typeof story.text === 'string';
                const startsWithAmpersand = hasText && story.text.trim().startsWith('&');
                const hasAuthor = story.created_by?.name;
                const isRecent = new Date(story.created_at) > new Date(userLastCheck);
                
                return hasText && startsWithAmpersand && hasAuthor && isRecent;
              })
              .map((story: any) => ({
                id: `${task.id}-${story.gid}`,
                taskId: task.id,
                taskTitle: task.title || 'Task sem título',
                commentText: story.text.trim().substring(1).trim(), // Remove "&"
                author: story.created_by.name,
                createdAt: story.created_at,
                isNew: true
              }));

            notifications.push(...relevantComments);
          }

        } catch (taskError) {
          console.warn(`⚠️ [Notifications] Erro ao processar task ${task.id}:`, taskError);
          // Continuar com outras tasks
        }
      }));
    }

    // ✅ ORDENAR POR DATA (mais recentes primeiro)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // ✅ LIMITAR QUANTIDADE E ATUALIZAR CACHE
    const maxNotifications = 50;
    const finalNotifications = notifications.slice(0, maxNotifications);
    const unreadCount = finalNotifications.filter(n => n.isNew).length;

    // Atualizar cache do usuário
    userLastChecked.set(userId, new Date().toISOString());

    const result: NotificationsResponse = {
      success: true,
      data: finalNotifications,
      unreadCount,
      lastChecked: new Date().toISOString(),
      companyFilter,
      debugInfo: {
        ...debugInfo,
        step: 'completed',
        tasksProcessed: recentTasks.length,
        notificationsFound: finalNotifications.length,
        unreadCount,
        processingTime: `${Date.now() - startTime}ms`,
        userLastCheck
      }
    };

    console.log(`✅ [Notifications] Concluído: ${finalNotifications.length} notificações, ${unreadCount} não lidas (${Date.now() - startTime}ms)`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [Notifications] Erro crítico:', error);
    
    // Retornar resposta vazia mas não quebrar a UI
    return NextResponse.json({
      success: false,
      error: 'Sistema temporariamente indisponível',
      data: [],
      unreadCount: 0,
      lastChecked: new Date().toISOString(),
      debugInfo: {
        ...debugInfo,
        step: 'error',
        error: errorMsg,
        processingTime: `${Date.now() - startTime}ms`
      }
    }, { status: 200 }); // Status 200 para não quebrar frontend
  }
}

// ✅ POST para marcar como lidas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, timestamp } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId é obrigatório'
      }, { status: 400 });
    }

    // Atualizar cache do usuário
    const newTimestamp = timestamp || new Date().toISOString();
    userLastChecked.set(userId, newTimestamp);

    console.log(`✅ [Notifications] Marcadas como lidas para usuário: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Notificações marcadas como lidas',
      lastChecked: newTimestamp
    });

  } catch (error) {
    console.error('❌ [Notifications] Erro ao marcar como lidas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao marcar notificações como lidas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}