// scripts/check-env.js - VERIFICADOR DE VARIÁVEIS DE AMBIENTE
require('dotenv').config({ path: '.env.local' });

console.log('🔍 VERIFICANDO VARIÁVEIS DE AMBIENTE\n');

// Verificar arquivo .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
console.log('📁 Arquivo .env.local existe:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📋 Conteúdo do .env.local:');
  console.log(envContent.split('\n').filter(line => line.includes('SUPABASE')).join('\n'));
}

console.log('\n🔍 VARIÁVEIS CARREGADAS NO PROCESS.ENV:');

// Verificar variáveis do Supabase
const supabaseVars = Object.keys(process.env).filter(key => key.includes('SUPABASE'));

console.log('📊 Variáveis encontradas:', supabaseVars.length);

supabaseVars.forEach(key => {
  const value = process.env[key];
  console.log(`- ${key}: ${value ? `${value.substring(0, 30)}...` : 'NÃO DEFINIDA'}`);
});

// Verificações específicas
console.log('\n✅ VERIFICAÇÕES ESPECÍFICAS:');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('1. NEXT_PUBLIC_SUPABASE_URL:');
console.log(`   - Definida: ${!!url}`);
console.log(`   - Válida: ${url && url.length > 10 && !url.includes('your_')}`);
console.log(`   - Valor: ${url || 'UNDEFINED'}`);

console.log('\n2. SUPABASE_SERVICE_ROLE_KEY:');
console.log(`   - Definida: ${!!serviceKey}`);
console.log(`   - Válida: ${serviceKey && serviceKey.length > 50 && !serviceKey.includes('your_')}`);
console.log(`   - Começa com eyJ: ${serviceKey && serviceKey.startsWith('eyJ')}`);
console.log(`   - Tamanho: ${serviceKey ? serviceKey.length : 0} caracteres`);
console.log(`   - Preview: ${serviceKey ? serviceKey.substring(0, 50) + '...' : 'UNDEFINED'}`);

// Verificar se é JWT válido
if (serviceKey && serviceKey.startsWith('eyJ')) {
  try {
    const parts = serviceKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log(`   - Role no JWT: ${payload.role}`);
      console.log(`   - Issuer: ${payload.iss}`);
      console.log(`   - Expiry: ${new Date(payload.exp * 1000).toISOString()}`);
    }
  } catch (e) {
    console.log('   - JWT inválido:', e.message);
  }
}

console.log('\n🎯 AÇÕES RECOMENDADAS:');

if (!url) {
  console.log('❌ Configure NEXT_PUBLIC_SUPABASE_URL no .env.local');
}

if (!serviceKey) {
  console.log('❌ Configure SUPABASE_SERVICE_ROLE_KEY no .env.local');
} else if (!serviceKey.startsWith('eyJ')) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY não parece ser um JWT válido');
} else if (serviceKey.length < 100) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY muito curta, pode estar incorreta');
}

if (url && serviceKey && serviceKey.startsWith('eyJ') && serviceKey.length > 100) {
  console.log('✅ Configuração parece correta!');
  console.log('🔄 Reinicie o servidor: npm run dev');
}