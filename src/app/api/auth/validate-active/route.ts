// CRIAR: src/app/api/auth/validate-active/route.ts
// Esta API verifica se o usuário está ativo antes de permitir acesso

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [VALIDATE] Verificando status ativo do usuário...');

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID do usuário é obrigatório',
        shouldLogout: false
      }, { status: 400 });
    }

    // Conectar ao Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ✅ VERIFICAR SE USUÁRIO EXISTE E ESTÁ ATIVO
    console.log('🔍 [VALIDATE] Buscando usuário:', userId);
    const { data: userProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, active, role, full_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ [VALIDATE] Erro ao buscar usuário:', error.message);
      
      if (error.code === 'PGRST116') {
        // Usuário não encontrado - foi excluído
        return NextResponse.json({
          success: false,
          error: 'Usuário não encontrado',
          shouldLogout: true,
          reason: 'USER_DELETED'
        }, { status: 404 });
      }
      
      throw error;
    }

    // ✅ VERIFICAR SE USUÁRIO ESTÁ ATIVO
    if (!userProfile.active) {
      console.log('❌ [VALIDATE] Usuário inativo:', userProfile.email);
      return NextResponse.json({
        success: false,
        error: 'Sua conta foi desativada. Entre em contato com o administrador.',
        shouldLogout: true,
        reason: 'USER_INACTIVE'
      }, { status: 403 });
    }

    // ✅ USUÁRIO VÁLIDO E ATIVO
    console.log('✅ [VALIDATE] Usuário ativo:', userProfile.email);
    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        active: userProfile.active,
        role: userProfile.role,
        full_name: userProfile.full_name
      },
      shouldLogout: false
    });

  } catch (error) {
    console.error('❌ [VALIDATE] Erro geral na validação:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      shouldLogout: false
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Suporte a GET também para conveniência
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({
      success: false,
      error: 'ID do usuário é obrigatório'
    }, { status: 400 });
  }

  // Redirecionar para POST
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ userId }),
    headers: { 'Content-Type': 'application/json' }
  }));
}