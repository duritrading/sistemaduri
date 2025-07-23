// src/app/api/admin/companies/route.ts - API PARA LISTAR EMPRESAS DO ASANA (ADMIN ONLY)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🏢 [API] Admin solicitando lista de empresas do Asana...');

    // ✅ BUSCAR DADOS DO ASANA VIA API UNIFICADA EXISTENTE
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const asanaResponse = await fetch(`${baseUrl}/api/asana/unified`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!asanaResponse.ok) {
      throw new Error(`Erro ao buscar dados do Asana: ${asanaResponse.status}`);
    }

    const asanaResult = await asanaResponse.json();
    
    if (!asanaResult.success || !asanaResult.data) {
      throw new Error('Dados do Asana não encontrados');
    }

    // ✅ EXTRAIR EMPRESAS USANDO FUNÇÃO EXISTENTE
    const { extractCompaniesFromTrackings } = await import('@/lib/auth');
    const companies = extractCompaniesFromTrackings(asanaResult.data);

    console.log(`✅ [API] ${companies.length} empresas encontradas no Asana`);

    return NextResponse.json({
      success: true,
      companies: companies,
      total: companies.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [API] Erro ao buscar empresas:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar empresas do Asana',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}