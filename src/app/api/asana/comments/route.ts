// src/app/api/asana/comments/route.ts - API CORRIGIDA PARA COMENTÁRIOS SEM CACHE
import { NextRequest, NextResponse } from 'next/server';

// ✅ FORCE DYNAMIC RENDERING
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Nunca cachear

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
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const forceRefresh = searchParams.get('refresh') || timestamp; // Force cache bust

    console.log(`🔄 [Comments API] Buscando comentários para task ${taskId} - ${timestamp}`);

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Task ID é obrigatório'
      }, { status: 400 });
    }

    // ✅ Token validation
    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token || token.trim() === '' || token === 'your_asana_token_here') {
      console.error('❌ [Comments API] Token Asana não configurado');
      return NextResponse.json({
        success: false,
        error: 'Token Asana não configurado'
      }, { status: 401 });
    }

    // ✅ Buscar stories/comentários da task com cache-busting headers
    const apiUrl = `https://app.asana.com/api/1.0/tasks/${taskId}/stories?opt_fields=text,created_at,created_by.name&_t=${Date.now()}`;
    console.log(`📡 [Comments API] Fazendo request para: ${apiUrl}`);

    const storiesResponse = await fetch(apiUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
      cache: 'no-store' // Force no cache
    });

    if (!storiesResponse.ok) {
      const errorText = await storiesResponse.text();
      console.error(`❌ [Comments API] Erro ${storiesResponse.status}: ${errorText}`);
      throw new Error(`Erro ${storiesResponse.status}: ${storiesResponse.statusText}`);
    }

    const storiesData = await storiesResponse.json();
    const stories = storiesData.data || [];
    
    console.log(`📊 [Comments API] Total stories retornadas: ${stories.length}`);

    // ✅ Filtrar apenas comentários que começam com "&" - TEXTO LIMPO SEM "&"
    const filteredComments: AsanaComment[] = stories
      .filter((story: any) => {
        // Log para debug
        const hasText = story.text && typeof story.text === 'string';
        const startsWithAmpersand = hasText && story.text.trim().startsWith('&');
        const hasAuthor = story.created_by?.name;
        
        if (hasText && !startsWithAmpersand) {
          console.log(`🔍 [Comments API] Story ignorada (não inicia com &): "${story.text.substring(0, 50)}..."`);
        }
        
        return hasText && startsWithAmpersand && hasAuthor;
      })
      .map((story: any) => {
        // ✅ REMOVER O "&" DO INÍCIO E LIMPAR ESPAÇOS
        const cleanText = story.text.trim().substring(1).trim(); // Remove primeiro char (&) e limpa espaços
        
        return {
          gid: story.gid,
          text: cleanText, // Texto limpo sem o "&"
          created_at: story.created_at,
          created_by: {
            name: story.created_by.name,
            gid: story.created_by.gid
          }
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`✅ [Comments API] Task ${taskId}: ${filteredComments.length} comentários com "&" encontrados`);
    
    // ✅ Log dos comentários encontrados para debug
    if (filteredComments.length > 0) {
      console.log('📝 [Comments API] Comentários encontrados (texto limpo):');
      filteredComments.forEach((comment, index) => {
        console.log(`   ${index + 1}. "${comment.text.substring(0, 100)}..." por ${comment.created_by.name} em ${comment.created_at}`);
      });
    } else {
      console.log('⚠️ [Comments API] NENHUM COMENTÁRIO COM "&" ENCONTRADO!');
      console.log('🔍 [Comments API] Verifique se:');
      console.log('   - O comentário realmente começa com "&"');
      console.log('   - O comentário foi salvo no Asana');
      console.log('   - Você tem acesso à task no Asana');
      console.log('   - O texto após "&" não está vazio');
    }

    return NextResponse.json({
      success: true,
      data: filteredComments,
      taskId,
      total: filteredComments.length,
      timestamp,
      processingTime: `${Date.now() - startTime}ms`,
      debugInfo: {
        totalStories: stories.length,
        filteredComments: filteredComments.length,
        forceRefresh,
        apiUrl
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ [Comments API] Erro completo:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar comentários',
      details: errorMsg,
      timestamp,
      processingTime: `${Date.now() - startTime}ms`,
      debugInfo: {
        taskId: new URL(request.url).searchParams.get('taskId'),
        errorType: error instanceof Error ? error.name : 'Unknown'
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}