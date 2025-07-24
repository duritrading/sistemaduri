// SUBSTITUIR COMPLETAMENTE: src/app/api/admin/delete-user/route.ts
// Esta versão garante remoção completa do usuário do sistema

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔄 [DELETE] Recebendo requisição para excluir usuário...');

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID do usuário é obrigatório'
      }, { status: 400 });
    }

    console.log('📝 [DELETE] Excluindo usuário:', userId);

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    // Conectar ao Supabase Admin
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ [DELETE] Conexão Supabase estabelecida');

    // ✅ VERIFICAR SE USUÁRIO EXISTE
    console.log('🔍 [DELETE] Verificando usuário:', userId);
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (userError || !existingUser) {
      console.error('❌ [DELETE] Usuário não encontrado:', userError);
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    console.log('✅ [DELETE] Usuário encontrado:', existingUser.email);

    // ✅ PROTEÇÃO: VERIFICAR SE NÃO É O ÚLTIMO ADMIN
    if (existingUser.role === 'admin') {
      console.log('🔍 [DELETE] Verificando se é o último admin...');
      const { data: adminUsers, error: adminError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('active', true);

      if (adminError) {
        console.error('❌ [DELETE] Erro ao verificar admins:', adminError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao verificar permissões de admin'
        }, { status: 500 });
      }

      if (adminUsers && adminUsers.length <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Não é possível excluir o último administrador do sistema'
        }, { status: 400 });
      }
    }

    // ✅ PASSO 1: INVALIDAR TODAS AS SESSÕES DO USUÁRIO
    console.log('🔄 [DELETE] Invalidando sessões ativas...');
    try {
      const { error: logoutError } = await supabaseAdmin.auth.admin.signOut(userId, 'others');
      if (logoutError) {
        console.warn('⚠️ [DELETE] Erro ao invalidar sessões:', logoutError.message);
      } else {
        console.log('✅ [DELETE] Sessões invalidadas');
      }
    } catch (logoutError) {
      console.warn('⚠️ [DELETE] Erro na invalidação de sessões:', logoutError);
    }

    // ✅ PASSO 2: EXCLUIR DO AUTH.USERS PRIMEIRO
    console.log('🗑️ [DELETE] Excluindo usuário do auth...');
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('❌ [DELETE] Erro ao excluir do auth:', deleteAuthError.message);
      
      // Se falhar na exclusão do auth, não continuar
      if (!deleteAuthError.message.includes('User not found')) {
        return NextResponse.json({
          success: false,
          error: `Erro ao excluir usuário do auth: ${deleteAuthError.message}`
        }, { status: 500 });
      } else {
        console.log('ℹ️ [DELETE] Usuário não encontrado no auth (já removido)');
      }
    } else {
      console.log('✅ [DELETE] Usuário excluído do auth');
    }

    // ✅ PASSO 3: EXCLUIR DO USER_PROFILES
    console.log('🗑️ [DELETE] Excluindo profile do usuário...');
    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('❌ [DELETE] Erro ao excluir profile:', deleteProfileError);
      return NextResponse.json({
        success: false,
        error: `Erro ao excluir profile: ${deleteProfileError.message}`
      }, { status: 500 });
    }

    console.log('✅ [DELETE] Profile excluído');

    // ✅ SUCESSO COMPLETO
    console.log('🎉 [DELETE] Usuário completamente removido:', existingUser.email);

    return NextResponse.json({
      success: true,
      message: `Usuário ${existingUser.email} foi completamente removido do sistema`,
      deletedUser: {
        id: existingUser.id,
        email: existingUser.email,
        full_name: existingUser.full_name
      },
      actions: [
        'Sessões ativas invalidadas',
        'Removido do sistema de autenticação',
        'Profile de usuário excluído'
      ]
    });

  } catch (error) {
    console.error('❌ [DELETE] Erro geral na exclusão:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// ✅ SUPORTE A POST PARA COMPATIBILIDADE
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID do usuário é obrigatório'
      }, { status: 400 });
    }

    // Criar URL com userId como query param
    const deleteUrl = new URL(request.url);
    deleteUrl.searchParams.set('userId', userId);
    
    // Criar nova request DELETE
    const deleteRequest = new NextRequest(deleteUrl, {
      method: 'DELETE',
      headers: request.headers
    });

    return DELETE(deleteRequest);

  } catch (error) {
    console.error('❌ [DELETE] Erro no POST:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}