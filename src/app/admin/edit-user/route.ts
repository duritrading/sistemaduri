// src/app/api/admin/edit-user/route.ts - API PARA EDITAR USUÁRIOS
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EditUserData {
  userId: string;
  email: string;
  fullName: string;
  companyId: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active: boolean;
}

// SUBSTITUIR a função PUT em: src/app/api/admin/edit-user/route.ts
// Cole esta versão que desativa sessões quando usuário é marcado como inativo

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 [EDIT] Recebendo requisição para editar usuário...');

    const body: EditUserData = await request.json();
    console.log('📝 [EDIT] Dados recebidos:', { 
      userId: body.userId, 
      email: body.email, 
      role: body.role, 
      companyId: body.companyId,
      active: body.active
    });

    // ✅ VALIDAÇÕES (mantidas iguais)
    if (!body.userId || !body.email || !body.fullName || !body.companyId || !body.role) {
      return NextResponse.json({
        success: false,
        error: 'Todos os campos são obrigatórios'
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        success: false,
        error: 'Email inválido'
      }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'operator', 'viewer'];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({
        success: false,
        error: 'Papel de usuário inválido'
      }, { status: 400 });
    }

    console.log('✅ [EDIT] Dados validados, conectando ao Supabase...');

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

    console.log('✅ [EDIT] Conexão Supabase estabelecida');

    // ✅ VERIFICAR SE EMPRESA EXISTE
    console.log('🔍 [EDIT] Verificando empresa:', body.companyId);
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, display_name')
      .eq('id', body.companyId)
      .single();

    if (companyError || !company) {
      console.error('❌ [EDIT] Empresa não encontrada:', companyError);
      return NextResponse.json({
        success: false,
        error: `Empresa não encontrada: ${body.companyId}`
      }, { status: 400 });
    }

    console.log('✅ [EDIT] Empresa encontrada:', company.display_name);

    // ✅ VERIFICAR SE USUÁRIO EXISTE E CAPTURAR STATUS ANTERIOR
    console.log('🔍 [EDIT] Verificando usuário:', body.userId);
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', body.userId)
      .single();

    if (userError || !existingUser) {
      console.error('❌ [EDIT] Usuário não encontrado:', userError);
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    console.log('✅ [EDIT] Usuário encontrado:', existingUser.email);
    const wasActiveBeforeEdit = existingUser.active;
    const willBeActiveAfterEdit = body.active;

    // ✅ VERIFICAR EMAIL DUPLICADO
    if (body.email !== existingUser.email) {
      console.log('🔍 [EDIT] Verificando se novo email já existe...');
      const { data: emailUser, error: emailError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', body.email)
        .neq('id', body.userId)
        .single();

      if (emailUser && !emailError) {
        return NextResponse.json({
          success: false,
          error: 'Este email já está sendo usado por outro usuário'
        }, { status: 400 });
      }
    }

    // ✅ ATUALIZAR PROFILE
    console.log('🔄 [EDIT] Atualizando profile do usuário...');
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        email: body.email,
        full_name: body.fullName,
        company_id: body.companyId,
        role: body.role,
        active: body.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.userId)
      .select(`
        *,
        companies (
          id,
          name,
          display_name,
          slug,
          active
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ [EDIT] Erro ao atualizar profile:', updateError);
      return NextResponse.json({
        success: false,
        error: `Erro ao atualizar usuário: ${updateError.message}`
      }, { status: 500 });
    }

    // ✅ ATUALIZAR EMAIL NO AUTH SE MUDOU
    if (body.email !== existingUser.email) {
      console.log('🔄 [EDIT] Atualizando email no auth...');
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        body.userId,
        { email: body.email }
      );

      if (authUpdateError) {
        console.warn('⚠️ [EDIT] Erro ao atualizar email no auth:', authUpdateError.message);
      }
    }

    // 🚨 NOVA FUNCIONALIDADE: DESATIVAR SESSÕES SE USUÁRIO FOI INATIVADO
    if (wasActiveBeforeEdit && !willBeActiveAfterEdit) {
      console.log('🚨 [EDIT] Usuário foi desativado - invalidando todas as sessões...');
      
      try {
        const { error: logoutError } = await supabaseAdmin.auth.admin.signOut(body.userId, 'others');
        
        if (logoutError) {
          console.warn('⚠️ [EDIT] Erro ao invalidar sessões:', logoutError.message);
        } else {
          console.log('✅ [EDIT] Todas as sessões do usuário invalidadas');
        }
      } catch (logoutError) {
        console.warn('⚠️ [EDIT] Erro na invalidação de sessões:', logoutError);
      }
    }

    console.log('✅ [EDIT] Usuário atualizado com sucesso:', body.email);

    return NextResponse.json({
      success: true,
      message: `Usuário ${body.email} atualizado com sucesso`,
      user: updatedProfile,
      actions: wasActiveBeforeEdit && !willBeActiveAfterEdit ? 
        ['Profile atualizado', 'Sessões ativas invalidadas'] : 
        ['Profile atualizado']
    });

  } catch (error) {
    console.error('❌ [EDIT] Erro geral na edição de usuário:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}