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

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 [API] Recebendo requisição para editar usuário...');

    // Parse do body
    const body: EditUserData = await request.json();
    console.log('📝 [API] Dados recebidos:', { 
      userId: body.userId, 
      email: body.email, 
      role: body.role, 
      companyId: body.companyId,
      active: body.active
    });

    // Validação básica
    if (!body.userId || !body.email || !body.fullName || !body.companyId || !body.role) {
      return NextResponse.json({
        success: false,
        error: 'Todos os campos são obrigatórios'
      }, { status: 400 });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        success: false,
        error: 'Email inválido'
      }, { status: 400 });
    }

    // Validação de role
    const validRoles = ['admin', 'manager', 'operator', 'viewer'];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({
        success: false,
        error: 'Papel de usuário inválido'
      }, { status: 400 });
    }

    console.log('✅ [API] Dados validados, conectando ao Supabase...');

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

    // Verificar se empresa existe
    console.log('🔍 [API] Verificando empresa:', body.companyId);
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, display_name')
      .eq('id', body.companyId)
      .single();

    if (companyError || !company) {
      console.error('❌ [API] Empresa não encontrada:', companyError);
      return NextResponse.json({
        success: false,
        error: `Empresa não encontrada: ${body.companyId}`
      }, { status: 400 });
    }

    console.log('✅ [API] Empresa encontrada:', company.display_name);

    // Verificar se usuário existe
    console.log('🔍 [API] Verificando usuário:', body.userId);
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', body.userId)
      .single();

    if (userError || !existingUser) {
      console.error('❌ [API] Usuário não encontrado:', userError);
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 });
    }

    console.log('✅ [API] Usuário encontrado:', existingUser.email);

    // Verificar se email já está em uso por outro usuário
    if (body.email !== existingUser.email) {
      console.log('🔍 [API] Verificando se novo email já existe...');
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

    // Atualizar profile
    console.log('🔄 [API] Atualizando profile do usuário...');
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
      console.error('❌ [API] Erro ao atualizar profile:', updateError);
      return NextResponse.json({
        success: false,
        error: `Erro ao atualizar usuário: ${updateError.message}`
      }, { status: 500 });
    }

    // Atualizar email no auth se mudou
    if (body.email !== existingUser.email) {
      console.log('🔄 [API] Atualizando email no auth...');
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        body.userId,
        { email: body.email }
      );

      if (authUpdateError) {
        console.warn('⚠️ [API] Erro ao atualizar email no auth:', authUpdateError.message);
        // Não falhar aqui, o profile já foi atualizado
      }
    }

    console.log('✅ [API] Usuário atualizado com sucesso:', body.email);

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: updatedProfile
    });

  } catch (error) {
    console.error('❌ [API] Erro geral na edição de usuário:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}