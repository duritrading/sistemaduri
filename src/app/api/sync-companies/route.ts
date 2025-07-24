// src/app/api/sync-companies/route.ts - STRICT MODE - SÓ FORMATO "número + empresa"
import { NextResponse } from 'next/server';

// ✅ EXTRAÇÃO ESTRITA - MESMA LÓGICA DO unified/route.ts
function extractCompanyNameStrict(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  // ✅ Limpar título (remover timestamps se houver)
  let cleanTitle = title.trim();
  cleanTitle = cleanTitle.replace(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+[A-Z]{3,4}\s+/, '').trim();
  
  // ✅ PADRÃO ESTRITO: APENAS "número + empresa" ou "número + empresa + (detalhes)"
  // ✅ Aceitos: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "13º.1 NATURALLY"
  // ❌ Rejeitados: "DURI TRADING", "EXPOFRUT (IMPORTAÇÃO)", qualquer coisa sem número
  
  const strictPattern = /^\d+º(?:\.\d+)?\s+([A-Z][A-Za-z\s&.'-]+?)(?:\s*\(.*)?$/i;
  const match = cleanTitle.match(strictPattern);
  
  if (match && match[1]) {
    let company = match[1].trim().toUpperCase();
    
    // ✅ Validações de qualidade
    if (company.length >= 2 &&           // Mínimo 2 caracteres
        company.length <= 50 &&          // Máximo 50 caracteres  
        company.match(/[A-Z]/) &&        // Deve ter pelo menos uma letra
        !company.match(/^[\d\s]*$/)) {   // Não pode ser só números/espaços
      
      console.log(`✅ Empresa aceita no sync: "${cleanTitle}" → "${company}"`);
      return company;
    }
  }
  
  // ✅ DEBUG: Log de títulos rejeitados
  console.log(`❌ Título rejeitado no sync (não segue padrão): "${cleanTitle}"`);
  return null;
}

// ✅ EXTRAÇÃO ESTRITA DE EMPRESAS DOS TRACKINGS
function extractCompaniesFromTrackingsStrict(trackings: any[]): any[] {
  if (!trackings || !Array.isArray(trackings)) {
    console.warn('⚠️ Trackings inválidos para extração de empresas');
    return [];
  }

  console.log(`🔍 Extraindo empresas STRICT MODE de ${trackings.length} trackings...`);
  
  const companySet = new Set<string>();
  let validCount = 0;
  let rejectedCount = 0;
  
  trackings.forEach((tracking, index) => {
    const title = tracking.name || tracking.title || '';
    if (!title) return;

    const extractedCompany = extractCompanyNameStrict(title);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      validCount++;
      console.log(`✅ [${index + 1}] "${title}" → "${extractedCompany}"`);
    } else {
      rejectedCount++;
      console.log(`❌ [${index + 1}] "${title}" → REJEITADO (sem padrão número+empresa)`);
    }
  });

  // Converter Set para Array de Company objects
  const companiesArray = Array.from(companySet)
    .sort()
    .map((name, index) => ({
      id: generateCompanyId(name),
      name: name,
      displayName: formatDisplayName(name)
    }));

  console.log(`\n📊 RESULTADO EXTRAÇÃO STRICT:`);
  console.log(`   ✅ Válidas: ${validCount}`);
  console.log(`   ❌ Rejeitadas: ${rejectedCount}`);
  console.log(`   🏢 Empresas únicas: ${companiesArray.length}`);
  console.log(`   📋 Lista: ${companiesArray.map(c => c.name).join(', ')}`);
  
  return companiesArray;
}

// ✅ GERAR ID ÚNICO PARA EMPRESA
function generateCompanyId(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove tudo que não for letra ou número
    .substring(0, 20) // Limita tamanho
    || `company_${Date.now()}`; // Fallback se o nome for muito limpo
}

// ✅ FORMATAR NOME PARA DISPLAY
function formatDisplayName(companyName: string): string {
  // Para nomes curtos ou siglas, manter como está
  if (companyName.length <= 6) {
    return companyName;
  }
  
  return companyName
    .split(/[\s&-]+/) // Split por espaços, & e -
    .map(word => {
      if (word.length <= 3) return word; // Manter siglas como estão
      
      // Primeira letra maiúscula, resto minúsculo
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export async function POST() {
  try {
    console.log('🔄 [SYNC STRICT] Iniciando sincronização com padrão rígido...');

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

    // 3. BUSCAR DADOS DO ASANA COM REFRESH FORÇADO
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const asanaResponse = await fetch(`${baseUrl}/api/asana/unified?refresh=true`, {
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

    // 4. EXTRAIR EMPRESAS COM LÓGICA ESTRITA
    const extractedCompanies = extractCompaniesFromTrackingsStrict(asanaResult.data);
    
    console.log(`📋 Empresas extraídas (STRICT): ${extractedCompanies.length}`);
    if (extractedCompanies.length === 0) {
      console.log('⚠️ NENHUMA EMPRESA EXTRAÍDA! Possíveis causas:');
      console.log('   - Nenhuma tarefa segue o padrão "número + empresa"');
      console.log('   - Todas as tarefas estão sendo rejeitadas');
      console.log('   - Verificar títulos das tarefas no Asana');
    }

    // 5. NORMALIZAR FUNÇÃO PARA COMPARAÇÃO
    const normalize = (str: string) => str.trim().toUpperCase().replace(/\s+/g, ' ');

    // 6. IDENTIFICAR EMPRESAS INVÁLIDAS PARA DESATIVAR
    const validCompanyNames = new Set(extractedCompanies.map(c => normalize(c.name)));
    const invalidCompanies = existingCompanies?.filter(existing => 
      !validCompanyNames.has(normalize(existing.name))
    ) || [];

    console.log(`\n🗑️ Empresas inválidas para desativar: ${invalidCompanies.length}`);
    if (invalidCompanies.length > 0) {
      console.log('❌ Serão desativadas:', invalidCompanies.map(c => c.name).join(', '));
    }

    // 7. DESATIVAR EMPRESAS INVÁLIDAS
    let deactivatedCount = 0;
    if (invalidCompanies.length > 0) {
      const invalidIds = invalidCompanies.map(c => c.id);
      
      const { error: deactivateError } = await supabase
        .from('companies')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', invalidIds);

      if (deactivateError) {
        console.error('❌ Erro ao desativar empresas inválidas:', deactivateError.message);
      } else {
        deactivatedCount = invalidCompanies.length;
        console.log(`✅ ${deactivatedCount} empresas inválidas desativadas`);
      }
    }

    // 8. SINCRONIZAR EMPRESAS VÁLIDAS (uma por uma para controle)
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
            console.log(`     Active: ${existing.active} → true`);
            
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

    // 9. VERIFICAR RESULTADO FINAL
    console.log('\n🎯 Verificando resultado final...');
    const { data: finalCompanies, error: finalError } = await supabase
      .from('companies')
      .select('id, name, active')
      .eq('active', true);

    const finalCount = finalCompanies?.length || 0;
    console.log(`📊 Total no banco após sync: ${finalCount} (antes: ${existingCount})`);

    if (finalError) {
      console.warn('⚠️ Erro na verificação final:', finalError.message);
    }

    // 10. RESUMO DETALHADO COM CLEANUP
    const summary = {
      success: true,
      message: `STRICT SYNC concluído: ${createdCount} criadas, ${updatedCount} atualizadas, ${skippedCount} já existentes, ${deactivatedCount} desativadas, ${errorCount} erros`,
      stats: {
        totalProcessed: extractedCompanies.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        deactivated: deactivatedCount,
        errors: errorCount,
        beforeSync: existingCount,
        afterSync: finalCount
      },
      details: results.slice(0, 20),
      companies: {
        existing: existingCount,
        extracted: extractedCompanies.length,
        final: finalCount,
        netChange: finalCount - existingCount
      },
      cleanup: {
        invalidCompaniesFound: invalidCompanies.length,
        companiesDeactivated: deactivatedCount,
        companiesRemaining: finalCount
      },
      strictMode: true,
      extractionPattern: "^\\d+º(?:\\.\\d+)?\\s+([A-Z][A-Za-z\\s&.'-]+?)(?:\\s*\\(.*)?$"
    };

    console.log('🎉 STRICT SYNC concluído:', summary.message);
    console.log('📊 Resumo:', JSON.stringify(summary.stats, null, 2));
    console.log('🗑️ Cleanup:', JSON.stringify(summary.cleanup, null, 2));
    
    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ ERRO CRÍTICO no STRICT SYNC:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro crítico na sincronização strict',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      strictMode: true
    }, { status: 500 });
  }
}

// GET para status com informações sobre padrão strict
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
      timestamp: new Date().toISOString(),
      strictMode: true,
      extractionPattern: "Só aceita formato: número + empresa (ex: '122º WCB', '28º AGRIVALE')",
      note: "Empresas sem padrão número+empresa são automaticamente desativadas"
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar status',
      details: error instanceof Error ? error.message : String(error),
      strictMode: true
    }, { status: 500 });
  }
}