import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🧪 Teste básico de inserção...');
    
    const { supabase } = await import('@/lib/supabase');
    
    // Teste 1: Buscar dados existentes
    const { data: existing, error: fetchError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5);
    
    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar dados',
        details: fetchError.message
      }, { status: 500 });
    }
    
    console.log('✅ Busca funcionou:', existing?.length || 0, 'empresas');
    
    // Teste 2: Inserir empresa de teste
    const testCompany = {
      name: 'TESTE_SYNC_' + Date.now(),
      display_name: 'Teste Sync',
      slug: 'teste-sync-' + Date.now(),
      active: true
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('companies')
      .insert(testCompany)
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao inserir',
        details: insertError.message,
        existing: existing?.length || 0
      }, { status: 500 });
    }
    
    console.log('✅ Inserção funcionou:', inserted);
    
    return NextResponse.json({
      success: true,
      message: 'Teste concluído com sucesso',
      existing: existing?.length || 0,
      inserted: inserted
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro geral',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}