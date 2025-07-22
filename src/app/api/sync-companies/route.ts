// src/app/api/sync-companies/route.ts - API SIMPLIFICADA PARA SINCRONIZAR EMPRESAS
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🔄 [API] Iniciando sincronização simplificada...');

    // ✅ 1. BUSCAR DADOS DO ASANA VIA API INTERNA
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const asanaResponse = await fetch(`${baseUrl}/api/asana/unified`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!asanaResponse.ok) {
      throw new Error(`Erro ao buscar dados do Asana: ${asanaResponse.status} - ${asanaResponse.statusText}`);
    }

    const asanaResult = await asanaResponse.json();
    
    if (!asanaResult.success || !asanaResult.data) {
      throw new Error('Dados do Asana não encontrados');
    }

    console.log(`📊 [API] Processando ${asanaResult.data.length} trackings do Asana`);

    // ✅ 2. EXTRAIR EMPRESAS USANDO FUNÇÃO EXISTENTE
    const { extractCompaniesFromTrackings } = await import('@/lib/auth');
    const extractedCompanies = extractCompaniesFromTrackings(asanaResult.data);

    console.log(`🏢 [API] Extraídas ${extractedCompanies.length} empresas:`, 
      extractedCompanies.slice(0, 5).map(c => c.name).join(', ') + '...');

    // ✅ 3. CONECTAR AO SUPABASE
    const { supabase } = await import('@/lib/supabase');

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    // ✅ 4. SINCRONIZAR CADA EMPRESA
    for (const company of extractedCompanies) {
      try {
        console.log(`🔄 [API] Processando empresa: ${company.name}`);

        // Verificar se já existe
        const { data: existing, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('name', company.name)
          .maybeSingle(); // usar maybeSingle em vez de single para evitar erro se não existir

        if (existing) {
          // Atualizar empresa existente
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              display_name: company.displayName,
              slug: company.id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ [API] Erro ao atualizar ${company.name}:`, updateError);
            errorCount++;
            results.push({ company: company.name, status: 'error', error: updateError.message });
          } else {
            console.log(`✅ [API] Atualizada: ${company.name}`);
            updatedCount++;
            results.push({ company: company.name, status: 'updated' });
          }
        } else {
          // Criar nova empresa
          const { error: insertError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              active: true
            });

          if (insertError) {
            console.error(`❌ [API] Erro ao criar ${company.name}:`, insertError);
            errorCount++;
            results.push({ company: company.name, status: 'error', error: insertError.message });
          } else {
            console.log(`✅ [API] Criada: ${company.name}`);
            createdCount++;
            results.push({ company: company.name, status: 'created' });
          }
        }
      } catch (companyError) {
        console.error(`❌ [API] Erro geral para ${company.name}:`, companyError);
        errorCount++;
        results.push({ 
          company: company.name, 
          status: 'error', 
          error: companyError instanceof Error ? companyError.message : 'Erro desconhecido' 
        });
      }
    }

    // ✅ 5. RESULTADO FINAL
    const summary = {
      success: true,
      message: `Sincronização concluída: ${createdCount} criadas, ${updatedCount} atualizadas, ${errorCount} erros`,
      stats: {
        totalProcessed: extractedCompanies.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      details: results.slice(0, 10) // Limitar detalhes para não sobrecarregar resposta
    };

    console.log('🎯 [API] Sincronização concluída:', summary.message);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ [API] Erro na sincronização:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro na sincronização de empresas',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// ✅ GET PARA VERIFICAR STATUS
export async function GET() {
  try {
    console.log('🔍 [API] Verificando status das empresas...');
    
    const { supabase } = await import('@/lib/supabase');
    
    // Contar empresas no banco
    const { data: companies, error } = await supabase
      .from('companies')
      .select('name, display_name, active, created_at')
      .eq('active', true)
      .order('name');

    if (error) {
      throw error;
    }

    console.log(`📊 [API] Encontradas ${companies?.length || 0} empresas no banco`);

    // Buscar dados do Asana para comparar
    let asanaCompaniesCount = 0;
    
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const asanaResponse = await fetch(`${baseUrl}/api/asana/unified`);
      
      if (asanaResponse.ok) {
        const asanaResult = await asanaResponse.json();
        if (asanaResult.success && asanaResult.data) {
          const { extractCompaniesFromTrackings } = await import('@/lib/auth');
          const extractedCompanies = extractCompaniesFromTrackings(asanaResult.data);
          asanaCompaniesCount = extractedCompanies.length;
          console.log(`📊 [API] Encontradas ${asanaCompaniesCount} empresas no Asana`);
        }
      }
    } catch (asanaError) {
      console.warn('⚠️ [API] Erro ao buscar empresas do Asana:', asanaError);
    }

    const result = {
      success: true,
      companiesInDatabase: companies?.length || 0,
      companiesInAsana: asanaCompaniesCount,
      needsSync: (companies?.length || 0) < asanaCompaniesCount,
      companies: companies || [],
      timestamp: new Date().toISOString()
    };

    console.log('✅ [API] Status verificado:', {
      database: result.companiesInDatabase,
      asana: result.companiesInAsana,
      needsSync: result.needsSync
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [API] Erro ao verificar status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status das empresas',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}