// debug-env.js - DEBUGGAR VARIÁVEIS DE AMBIENTE
// Execute na raiz do projeto: node debug-env.js

const path = require('path');
const fs = require('fs');

console.log('🔍 DEBUGGANDO VARIÁVEIS DE AMBIENTE\n');

// 1. Verificar localização do arquivo
const envLocalPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envLocalPath);

console.log('📁 LOCALIZAÇÃO DOS ARQUIVOS:');
console.log('Current Directory:', process.cwd());
console.log('.env.local path:', envLocalPath);
console.log('.env.local exists:', envExists ? '✅' : '❌');

if (!envExists) {
  console.log('\n❌ ARQUIVO .env.local NÃO ENCONTRADO!');
  console.log('📝 Crie o arquivo .env.local na raiz do projeto (mesmo nível do package.json)');
  process.exit(1);
}

// 2. Ler conteúdo do arquivo
console.log('\n📄 CONTEÚDO DO .env.local:');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

lines.forEach((line, index) => {
  if (line.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    const [key, value] = line.split('=');
    if (value && value.length > 20) {
      console.log(`${index + 1}. ✅ ${key}=${value.substring(0, 20)}...${value.substring(value.length - 10)}`);
    } else {
      console.log(`${index + 1}. ❌ ${line} (VALOR MUITO CURTO OU INVÁLIDO)`);
    }
  } else {
    const [key] = line.split('=');
    console.log(`${index + 1}. ℹ️  ${key}=***`);
  }
});

// 3. Testar carregamento manual
console.log('\n🧪 TESTE DE CARREGAMENTO MANUAL:');
require('dotenv').config({ path: envLocalPath });

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log('SUPABASE_URL loaded:', !!supabaseUrl ? '✅' : '❌');
console.log('SERVICE_ROLE_KEY loaded:', !!serviceKey ? '✅' : '❌');

if (serviceKey) {
  console.log('SERVICE_ROLE_KEY preview:', serviceKey.substring(0, 20) + '...' + serviceKey.substring(serviceKey.length - 10));
  console.log('SERVICE_ROLE_KEY length:', serviceKey.length);
  
  // Verificar se é realmente uma JWT
  if (serviceKey.startsWith('eyJ') && serviceKey.includes('.')) {
    console.log('✅ SERVICE_ROLE_KEY parece ser uma JWT válida');
  } else {
    console.log('❌ SERVICE_ROLE_KEY não parece ser uma JWT válida');
  }
} else {
  console.log('❌ SERVICE_ROLE_KEY não foi carregada!');
}

// 4. Instruções
console.log('\n📋 PRÓXIMOS PASSOS:');
if (serviceKey && supabaseUrl) {
  console.log('✅ Variáveis encontradas! Execute:');
  console.log('   1. rm -rf .next (limpar cache do Next.js)');
  console.log('   2. npm run dev (reiniciar servidor)');
  console.log('   3. Teste criar usuário novamente');
} else {
  console.log('❌ Variáveis não carregadas! Verifique:');
  console.log('   1. Arquivo .env.local na raiz do projeto');
  console.log('   2. Sintaxe: SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui');
  console.log('   3. Sem espaços ao redor do =');
  console.log('   4. Key deve começar com eyJ');
}

console.log('\n🔗 Para obter a SERVICE_ROLE_KEY:');
console.log('   https://supabase.com/dashboard → Seu Projeto → Settings → API → service_role');