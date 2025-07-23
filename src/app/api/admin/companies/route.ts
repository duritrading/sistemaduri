// src/app/api/admin/companies/route.ts - API PARA LISTAR E CRIAR EMPRESAS
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 [API] Listando empresas...');

    // Importar supabase admin
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar empresas existentes
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [API] Erro ao buscar empresas:', error);
      throw error;
    }

    console.log(`✅ [API] ${companies?.length || 0} empresas encontradas`);

    // Se não houver empresas, criar empresa padrão
    if (!companies || companies.length === 0) {
      console.log('🔄 [API] Criando empresa padrão...');
      
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'EMPRESA_PADRAO',
          display_name: 'Empresa Padrão',
          slug: 'empresa-padrao',
          active: true,
          settings: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [API] Erro ao criar empresa padrão:', createError);
        throw createError;
      }

      console.log('✅ [API] Empresa padrão criada:', newCompany?.id);
      
      return NextResponse.json({
        success: true,
        companies: [newCompany],
        defaultCompanyId: newCompany?.id
      });
    }

    // Identificar empresa padrão existente
    const defaultCompany = companies.find(c => 
      c.slug === 'empresa-padrao' || 
      c.name === 'EMPRESA_PADRAO' ||
      c.display_name === 'Empresa Padrão'
    ) || companies[0]; // Primeira empresa como fallback

    return NextResponse.json({
      success: true,
      companies,
      defaultCompanyId: defaultCompany?.id
    });

  } catch (error) {
    console.error('❌ [API] Erro geral ao listar empresas:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar empresas',
      companies: [],
      defaultCompanyId: null
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [API] Criando nova empresa...');

    const body = await request.json();
    
    // Validações
    if (!body.name || !body.display_name) {
      return NextResponse.json({
        success: false,
        error: 'Nome e nome de exibição são obrigatórios'
      }, { status: 400 });
    }

    // Criar slug automaticamente se não fornecido
    const slug = body.slug || body.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        name: body.name,
        display_name: body.display_name,
        slug: slug,
        active: body.active !== false,
        settings: body.settings || {}
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Erro ao criar empresa:', error);
      throw error;
    }

    console.log('✅ [API] Empresa criada:', newCompany?.id);

    return NextResponse.json({
      success: true,
      company: newCompany
    });

  } catch (error) {
    console.error('❌ [API] Erro geral ao criar empresa:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar empresa'
    }, { status: 500 });
  }
}