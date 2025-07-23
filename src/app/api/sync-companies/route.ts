// src/app/api/sync-companies/route.ts - FIXED: NO INTERNAL FETCH DURING BUILD
import { NextResponse } from 'next/server';

// ✅ FORCE RUNTIME ONLY - NO STATIC GENERATION
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 [API] Iniciando sincronização...');

    // ✅ Check environment first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    // ✅ Import companies extractor - NO INTERNAL FETCH
    const { fetchAsanaCompanies } = await import('@/lib/companies-extractor');
    
    // ✅ Get companies directly from Asana
    const extractedCompanies = await fetchAsanaCompanies();
    
    if (!extractedCompanies || extractedCompanies.length === 0) {
      console.log('📊 [API] Nenhuma empresa encontrada no Asana');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma empresa encontrada no Asana',
        stats: { totalProcessed: 0, created: 0, updated: 0, errors: 0 }
      });
    }

    console.log(`🏢 [API] Extraídas ${extractedCompanies.length} empresas:`, 
      extractedCompanies.slice(0, 5).map(c => c.name).join(', ') + '...');

    // ✅ Connect to Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    // ✅ Process each company
    for (const company of extractedCompanies) {
      try {
        // Check if company exists
        const { data: existing, error: fetchError } = await supabase
          .from('companies')
          .select('id, name, updated_at')
          .eq('name', company.name)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (existing) {
          // Update existing company
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              display_name: company.displayName,
              slug: company.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            throw updateError;
          }

          updatedCount++;
          results.push({
            action: 'updated',
            company: company.name,
            id: existing.id
          });

        } else {
          // Create new company
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              display_name: company.displayName,
              slug: company.id,
              active: true,
              settings: {}
            })
            .select('id')
            .single();

          if (createError) {
            throw createError;
          }

          createdCount++;
          results.push({
            action: 'created',
            company: company.name,
            id: newCompany.id
          });
        }

      } catch (companyError) {
        console.error(`❌ [API] Erro ao processar empresa ${company.name}:`, companyError);
        errorCount++;
        results.push({
          action: 'error',
          company: company.name,
          error: companyError instanceof Error ? companyError.message : 'Erro desconhecido'
        });
      }
    }

    // ✅ Final result
    const summary = {
      success: true,
      message: `Sincronização concluída: ${createdCount} criadas, ${updatedCount} atualizadas, ${errorCount} erros`,
      stats: {
        totalProcessed: extractedCompanies.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      details: results.slice(0, 10) // Limit details
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

// ✅ GET STATUS - ALSO RUNTIME ONLY
export async function GET() {
  try {
    console.log('🔍 [API] Verificando status das empresas...');
    
    // ✅ Direct Supabase connection - NO FETCH
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Count companies in database
    const { data: companies, error } = await supabase
      .from('companies')
      .select('name, display_name, active, created_at')
      .eq('active', true)
      .order('name');

    if (error) {
      throw error;
    }

    console.log(`📊 [API] Encontradas ${companies?.length || 0} empresas no banco`);

    // ✅ Get Asana companies count (NO FETCH) - Using direct extractor
    let asanaCompaniesCount = 0;
    
    try {
      const { fetchAsanaCompanies } = await import('@/lib/companies-extractor');
      const asanaCompanies = await fetchAsanaCompanies();
      
      if (asanaCompanies && asanaCompanies.length > 0) {
        asanaCompaniesCount = asanaCompanies.length;
        console.log(`📊 [API] Encontradas ${asanaCompaniesCount} empresas no Asana`);
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