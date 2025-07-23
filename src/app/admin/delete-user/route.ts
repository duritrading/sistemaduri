// src/app/api/admin/delete-user/route.ts - API PARA EXCLUIR USUÁRIOS
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔄 [API] Recebendo requisição para excluir usuário...');

    // Obter userId dos query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID do usuário é obrigatório'
      }, { status: 400 });
    }

    console.log('📝 [API] Excluindo usuário:', userId);

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }

    // Conectar ao Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('✅ [API] Conexão Supabase estabelecida');

    // Verificar se usuário existe
    console.log('🔍 [API] Verificando usuário:', userId);
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (userError || !existingUser) {
      console.error('❌ [API] Usuário não encontrado:', userError);
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    console.log('✅ [API] Usuário encontrado:', existingUser.email);

    // Verificar se não é o último admin (proteção)
    if (existingUser.role === 'admin') {
      console.log('🔍 [API] Verificando se é o último admin...');
      const { data: adminUsers, error: adminError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('active', true);

      if (adminError) {
        console.error('❌ [API] Erro ao verificar admins:', adminError);
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

    // Excluir profile (CASCADE irá excluir auth automaticamente)
    console.log('🗑️ [API] Excluindo profile do usuário...');
    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('❌ [API] Erro ao excluir profile:', deleteProfileError);
      return NextResponse.json({
        success: false,
        error: `Erro ao excluir usuário: ${deleteProfileError.message}`
      }, { status: 500 });
    }

    // Excluir do auth também (para garantir)
    console.log('🗑️ [API] Excluindo usuário do auth...');
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.warn('⚠️ [API] Erro ao excluir do auth:', deleteAuthError.message);
      // Não falhar aqui, o profile já foi excluído
    }

    console.log('✅ [API] Usuário excluído com sucesso:', existingUser.email);

    return NextResponse.json({
      success: true,
      message: `Usuário ${existingUser.email} excluído com sucesso`,
      deletedUser: {
        id: existingUser.id,
        email: existingUser.email,
        full_name: existingUser.full_name
      }
    });

  } catch (error) {
    console.error('❌ [API] Erro geral na exclusão de usuário:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// Também suportar POST para compatibilidade com alguns clientes
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

    // Redirecionar para DELETE com userId como query param
    const deleteUrl = new URL(request.url);
    deleteUrl.searchParams.set('userId', userId);
    
    // Criar nova request com DELETE method
    const deleteRequest = new NextRequest(deleteUrl, {
      method: 'DELETE',
      headers: request.headers
    });

    return DELETE(deleteRequest);

  } catch (error) {
    console.error('❌ [API] Erro no POST delete:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}