// src/app/api/sync-companies/route.ts - VERSÃO COM UPSERT PARA EVITAR DUPLICATAS
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🔄 [SYNC] Iniciando sincronização com UPSERT...');

    // 1. TESTAR CONEXÃO SUPABASE
    const { supabase } = await import('@/lib/supabase');
    
    const { data: testConnection, error: connectionError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Erro conexão:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Erro de conexão com Supabase',
        details: connectionError.message
      }, { status: 500 });
    }
    
    console.log('✅ Conexão Supabase OK');

    // 2. BUSCAR EMPRESAS EXISTENTES PARA COMPARAÇÃO
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, display_name, slug, active')
      .eq('active', true);
    
    if (fetchError) {
      console.error('❌ Erro ao buscar empresas:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar empresas existentes',
        details: fetchError.message
      }, { status: 500 });
    }
    
    const existingCount = existingCompanies?.length || 0;
    console.log(`📋 Empresas existentes no banco: ${existingCount}`);
    
    // Log das empresas existentes para debug
    if (existingCompanies && existingCompanies.length > 0) {
      console.log('📋 Empresas no banco:', existingCompanies.slice(0, 10).map(c => c.name).join(', '));
    }

    // 3. BUSCAR DADOS DO ASANA
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const asanaResponse = await fetch(`${baseUrl}/api/asana/unified`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!asanaResponse.ok) {
      throw new Error(`Erro API Asana: ${asanaResponse.status}`);
    }

    const asanaResult = await asanaResponse.json();
    if (!asanaResult.success || !asanaResult.data) {
      throw new Error('Dados do Asana não encontrados');
    }

    // 4. EXTRAIR EMPRESAS
    const { extractCompaniesFromTrackings } = await import('@/lib/auth');
    const extractedCompanies = extractCompaniesFromTrackings(asanaResult.data);
    
    console.log(`📋 Empresas extraídas: ${extractedCompanies.length}`);
    console.log('🏢 Empresas do Asana:', extractedCompanies.slice(0, 10).map(c => c.name).join(', '));

    // 5. NORMALIZAR FUNÇÃO PARA COMPARAÇÃO
    const normalize = (str: string) => str.trim().toUpperCase().replace(/\s+/g, ' ');

    // 6. SINCRONIZAR COM UPSERT (uma por uma para controle)
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const results = [];

    for (let i = 0; i < extractedCompanies.length; i++) {
      const company = extractedCompanies[i];
      console.log(`\n[${i + 1}/${extractedCompanies.length}] Processando: "${company.name}"`);
      
      try {
        // Verificar se já existe com nome normalizado
        const normalizedAsanaName = normalize(company.name);
        const existing = existingCompanies?.find(e => 
          normalize(e.name) === normalizedAsanaName ||
          normalize(e.display_name || '') === normalizedAsanaName ||
          e.slug === (company.id || company.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
        );

        if (existing) {
          console.log(`  ✅ Empresa já existe: "${existing.name}" (ID: ${existing.id})`);
          
          // Verificar se precisa atualizar algum campo
          const needsUpdate = 
            existing.display_name !== company.displayName ||
            !existing.active;

          if (needsUpdate) {
            console.log(`  🔄 Atualizando empresa existente...`);
            console.log(`     Display: "${existing.display_name}" → "${company.displayName}"`);
            
            const { error: updateError } = await supabase
              .from('companies')
              .update({ 
                display_name: company.displayName,
                active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (updateError) {
              console.error(`  ❌ Erro ao atualizar:`, updateError.message);
              errorCount++;
              results.push({ company: company.name, action: 'error', error: updateError.message });
            } else {
              console.log(`  ✅ Atualizada com sucesso`);
              updatedCount++;
              results.push({ company: company.name, action: 'updated', id: existing.id });
            }
          } else {
            console.log(`  ℹ️ Não precisa de atualização`);
            skippedCount++;
            results.push({ company: company.name, action: 'skipped', id: existing.id });
          }
        } else {
          // Criar nova empresa usando UPSERT
          console.log(`  ➕ Criando nova empresa...`);
          
          const slug = company.id || company.name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
          
          const newCompanyData = {
            name: company.name.trim(),
            display_name: company.displayName,
            slug: slug,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          console.log(`     Nome: "${newCompanyData.name}"`);
          console.log(`     Display: "${newCompanyData.display_name}"`);
          console.log(`     Slug: "${newCompanyData.slug}"`);

          // USAR UPSERT PARA EVITAR CONFLITOS
          const { data: upsertResult, error: upsertError } = await supabase
            .from('companies')
            .upsert(newCompanyData, { 
              onConflict: 'name',
              ignoreDuplicates: false 
            })
            .select('id, name, display_name')
            .single();

          if (upsertError) {
            console.error(`  ❌ Erro UPSERT:`, upsertError.message);
            console.error(`  📋 Dados que causaram erro:`, newCompanyData);
            
            // Tentar diagnóstico do erro
            if (upsertError.message.includes('duplicate key')) {
              console.log(`  🔍 Tentando buscar empresa conflitante...`);
              
              const { data: conflicting } = await supabase
                .from('companies')
                .select('id, name, display_name, slug')
                .eq('name', company.name)
                .single();
              
              if (conflicting) {
                console.log(`  📋 Empresa conflitante encontrada:`, conflicting);
                skippedCount++;
                results.push({ 
                  company: company.name, 
                  action: 'conflict_resolved', 
                  existing: conflicting 
                });
              } else {
                errorCount++;
                results.push({ company: company.name, action: 'error', error: upsertError.message });
              }
            } else {
              errorCount++;
              results.push({ company: company.name, action: 'error', error: upsertError.message });
            }
          } else {
            console.log(`  ✅ UPSERT bem-sucedido: ID=${upsertResult?.id}`);
            createdCount++;
            results.push({ 
              company: company.name, 
              action: 'created', 
              id: upsertResult?.id,
              data: upsertResult
            });
          }
        }
      } catch (companyError) {
        console.error(`  ❌ Erro geral:`, companyError);
        errorCount++;
        results.push({ 
          company: company.name, 
          action: 'error', 
          error: companyError instanceof Error ? companyError.message : String(companyError)
        });
      }
    }

    // 7. VERIFICAR RESULTADO FINAL
    console.log('\n🎯 Verificando resultado final...');
    const { data: finalCompanies, error: finalError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('active', true);

    const finalCount = finalCompanies?.length || 0;
    console.log(`📊 Total no banco após sync: ${finalCount} (antes: ${existingCount})`);

    if (finalError) {
      console.warn('⚠️ Erro na verificação final:', finalError.message);
    }

    // 8. RESUMO DETALHADO
    const summary = {
      success: true,
      message: `Sync concluído: ${createdCount} criadas, ${updatedCount} atualizadas, ${skippedCount} já existentes, ${errorCount} erros`,
      stats: {
        totalProcessed: extractedCompanies.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
        beforeSync: existingCount,
        afterSync: finalCount
      },
      details: results.slice(0, 20),
      companies: {
        existing: existingCount,
        extracted: extractedCompanies.length,
        final: finalCount,
        netIncrease: finalCount - existingCount
      }
    };

    console.log('🎉 Sincronização concluída:', summary.message);
    console.log('📊 Resumo:', JSON.stringify(summary.stats, null, 2));
    
    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro crítico na sincronização',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET para status
export async function GET() {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, display_name, active, created_at')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      companiesInDatabase: companies?.length || 0,
      companies: companies || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}