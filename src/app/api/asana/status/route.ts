// src/app/api/asana/status/route.ts - Endpoint para verificar status sem causar erro
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.ASANA_ACCESS_TOKEN || '';
    const isTokenValid = token && token.trim() !== '' && token !== 'your_asana_token_here';

    const status = {
      tokenConfigured: isTokenValid,
      usingMockData: !isTokenValid,
      tokenLength: token.length,
      message: isTokenValid 
        ? 'Conectado ao Asana' 
        : 'Usando dados de demonstração (configure ASANA_ACCESS_TOKEN)',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };

    // Se token configurado, testar conectividade básica
    if (isTokenValid) {
      try {
        const testResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (testResponse.ok) {
          const userData = await testResponse.json();
          status.message = `Conectado ao Asana como ${userData.data?.name || 'usuário'}`;
        } else {
          status.tokenConfigured = false;
          status.usingMockData = true;
          status.message = `Token inválido (${testResponse.status}). Usando dados de demonstração.`;
        }
      } catch (connectError) {
        status.tokenConfigured = false;
        status.usingMockData = true;
        status.message = 'Erro de conectividade com Asana. Usando dados de demonstração.';
      }
    }

    return NextResponse.json(status);

  } catch (error) {
    return NextResponse.json({
      tokenConfigured: false,
      usingMockData: true,
      tokenLength: 0,
      message: 'Erro na verificação. Usando dados de demonstração.',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}