// src/app/api/admin/sync-companies/route.ts - SINCRONIZAR EMPRESAS DO ASANA
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🔄 Iniciando sincronização de empresas do Asana...');

    // ✅ USAR EXTRATOR DIRETO DO ASANA
    const { syncCompaniesToSupabase } = await import('@/lib/companies-extractor');
    const result = await syncCompaniesToSupabase();

    console.log('🎯 Sincronização concluída:', result.message);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erro na sincronização de empresas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro na sincronização de empresas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// ✅ GET PARA VERIFICAR STATUS
export async function GET() {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Contar empresas no banco
    const { data: companies, error } = await supabase
      .from('companies')
      .select('name, display_name, active, created_at')
      .order('name');

    if (error) {
      throw error;
    }

    // Buscar empresas do Asana diretamente
    let asanaCompaniesCount = 0;
    
    try {
      const { fetchAsanaCompanies } = await import('@/lib/companies-extractor');
      const asanaCompanies = await fetchAsanaCompanies();
      asanaCompaniesCount = asanaCompanies.length;
    } catch (asanaError) {
      console.warn('Erro ao buscar empresas do Asana para comparação:', asanaError);
    }

    return NextResponse.json({
      success: true,
      companiesInDatabase: companies?.length || 0,
      companiesInAsana: asanaCompaniesCount,
      needsSync: (companies?.length || 0) < asanaCompaniesCount,
      companies: companies || []
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status das empresas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}