// src/app/api/asana/comments/route.ts - API PARA BUSCAR COMENTÁRIOS/STORIES DO ASANA - VERCEL BUILD FIX
import { NextRequest, NextResponse } from 'next/server';

// ✅ FORCE DYNAMIC RENDERING - ESSENCIAL PARA VERCEL BUILD
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AsanaComment {
  gid: string;
  text: string;
  created_at: string;
  created_by: {
    name: string;
    gid: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Task ID é obrigatório'
      }, { status: 400 });
    }

    // ✅ Token validation
    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token || token.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado'
      }, { status: 401 });
    }

    // ✅ Buscar stories/comentários da task específica
    const storiesResponse = await fetch(
      `https://app.asana.com/api/1.0/tasks/${taskId}/stories?opt_fields=text,created_at,created_by.name`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!storiesResponse.ok) {
      throw new Error(`Erro ao buscar comentários: ${storiesResponse.status}`);
    }

    const storiesData = await storiesResponse.json();
    const stories = storiesData.data || [];

    // ✅ Filtrar apenas comentários que começam com "&"
    const filteredComments: AsanaComment[] = stories
      .filter((story: any) => {
        return story.text && 
               typeof story.text === 'string' && 
               story.text.trim().startsWith('&') &&
               story.created_by?.name; // Garantir que tem autor
      })
      .map((story: any) => ({
        gid: story.gid,
        text: story.text.trim(),
        created_at: story.created_at,
        created_by: {
          name: story.created_by.name,
          gid: story.created_by.gid
        }
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Mais recentes primeiro

    console.log(`📝 [API] Task ${taskId}: ${filteredComments.length} comentários com "&" encontrados`);

    return NextResponse.json({
      success: true,
      data: filteredComments,
      taskId,
      total: filteredComments.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [API] Erro ao buscar comentários:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar comentários',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}