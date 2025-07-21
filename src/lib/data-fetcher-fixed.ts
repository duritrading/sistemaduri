// src/lib/data-fetcher-fixed.ts - Fix Imediato para Error de Conexão
export async function getAllTrackings() {
  try {
    console.log('🔍 Tentando nova API unificada...');
    
    // Tentar a nova API unificada primeiro
    const response = await fetch('/api/asana/unified', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Unificada funcionou!', result.meta);
      return result.data || [];
    }
    
    console.warn('⚠️ API Unificada falhou, tentando fallback...');
    
    // Fallback: tentar APIs antigas que ainda podem existir
    const fallbackApis = [
      '/api/asana/trackings',
      '/api/asana/enhanced-trackings',
      '/api/asana/comprehensive-trackings'
    ];
    
    for (const api of fallbackApis) {
      try {
        console.log(`🔄 Tentando fallback: ${api}`);
        const fallbackResponse = await fetch(api, { cache: 'no-store' });
        
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.success && fallbackResult.data) {
            console.log(`✅ Fallback ${api} funcionou!`);
            return fallbackResult.data;
          }
        }
      } catch (fallbackError) {
        console.log(`❌ Fallback ${api} falhou:`, fallbackError.message);
        continue;
      }
    }
    
    // Se chegou até aqui, nenhuma API funcionou
    console.error('❌ Todas as APIs falharam');
    return [];
    
  } catch (error) {
    console.error('❌ Erro crítico no data fetcher:', error);
    return [];
  }
}

export async function getTrackingData(id: string) {
  try {
    console.log(`🔍 Buscando tracking individual: ${id}`);
    
    // Tentar API unificada para tracking individual
    const response = await fetch('/api/asana/unified', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        console.log('✅ Tracking individual encontrado via API unificada');
        return result.data;
      }
    }
    
    // Fallback: buscar todos e filtrar
    console.log('🔄 Fallback: buscando todos os trackings...');
    const allTrackings = await getAllTrackings();
    const tracking = allTrackings.find(t => t.id === id);
    
    if (tracking) {
      console.log('✅ Tracking encontrado via fallback');
      return tracking;
    }
    
    console.error(`❌ Tracking ${id} não encontrado`);
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao buscar tracking individual:', error);
    return null;
  }
}

// Função de teste para verificar conectividade
export async function testApiConnectivity() {
  console.log('🧪 Testando conectividade das APIs...');
  
  const apis = [
    '/api/asana/unified',
    '/api/asana/trackings',
    '/api/asana/enhanced-trackings'
  ];
  
  const results = [];
  
  for (const api of apis) {
    try {
      const response = await fetch(api, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      results.push({
        api,
        status: response.status,
        ok: response.ok,
        working: response.ok
      });
      
    } catch (error) {
      results.push({
        api,
        status: 'ERROR',
        ok: false,
        working: false,
        error: error.message
      });
    }
  }
  
  console.table(results);
  return results;
}

// Função para verificar se as APIs necessárias existem
export function validateApiSetup() {
  const issues = [];
  
  // Verificar se estamos no browser
  if (typeof window === 'undefined') {
    return { valid: true, issues: [] };
  }
  
  // Verificar environment
  const currentUrl = window.location.origin;
  console.log('🌐 Current URL:', currentUrl);
  
  return {
    valid: issues.length === 0,
    issues,
    currentUrl
  };
}