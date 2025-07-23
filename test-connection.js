// test-connection.js - TESTE DE CONEXÃO SUPABASE
// Execute: node test-connection.js

require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🧪 TESTANDO CONEXÃO SUPABASE...\n');
  
  // Verificar variáveis
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Variáveis:');
  console.log('   - URL: ' + (url ? url.substring(0, 30) + '...' : 'UNDEFINED'));
  console.log('   - Service Key: ' + (serviceKey ? serviceKey.substring(0, 20) + '...' : 'UNDEFINED') + ' (' + (serviceKey ? serviceKey.length : 0) + ' chars)');
  
  if (!url || !serviceKey) {
    console.log('❌ Variáveis não carregadas!');
    return;
  }
  
  try {
    // Testar conexão
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('\n🔄 Testando conexão...');
    
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
    } else {
      console.log('✅ Conexão OK! ' + data.users.length + ' usuários encontrados');
      console.log('\n🎉 CONFIGURAÇÃO FUNCIONANDO!');
    }
    
  } catch (err) {
    console.log('❌ Erro ao testar:', err.message);
  }
}

testConnection();