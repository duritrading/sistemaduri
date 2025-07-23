// src/app/api/admin/create-user/route.ts - API ROUTE PARA CRIAÇÃO DE USUÁRIOS
import { NextRequest, NextResponse } from 'next/server';
import { createUserWithProfile } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [API] Recebendo requisição para criar usuário...');

    // Parse do body da requisição
    const body = await request.json();
    console.log('📝 [API] Dados recebidos:', { 
      email: body.email, 
      role: body.role, 
      companyId: body.companyId 
    });

    // Validação básica dos dados
    if (!body.email || !body.password || !body.fullName || !body.companyId || !body.role) {
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

    // Validação de senha
    if (body.password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Senha deve ter pelo menos 6 caracteres'
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

    console.log('✅ [API] Dados validados, chamando createUserWithProfile...');

    // Chamar função admin (server-side)
    const result = await createUserWithProfile({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      companyId: body.companyId,
      role: body.role
    });

    if (!result.success) {
      console.error('❌ [API] Erro na criação:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Erro ao criar usuário'
      }, { status: 400 });
    }

    console.log('✅ [API] Usuário criado com sucesso:', body.email);

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: result.user?.id,
        email: result.user?.email
      },
      profile: result.profile
    });

  } catch (error) {
    console.error('❌ [API] Erro geral na criação de usuário:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 });
  }
}