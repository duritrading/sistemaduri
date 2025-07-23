// diagnose-env-loading.js - DIAGNÓSTICO COMPLETO DE ENV VARS
// Execute: node diagnose-env-loading.js

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO COMPLETO DE VARIÁVEIS DE AMBIENTE\n');
console.log('==========================================\n');

// 1. VERIFICAR ESTRUTURA DO PROJETO
console.log('1️⃣ VERIFICANDO ESTRUTURA DO PROJETO:');
const projectRoot = process.cwd();
console.log('📁 Diretório atual:', projectRoot);

const files = [
  'package.json',
  '.env.local',
  '.env',
  '.env.example',
  'next.config.js',
  'next.config.mjs'
];

files.forEach(file => {
  const filePath = path.join(projectRoot, file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 2. ANALISAR .env.local
console.log('\n2️⃣ ANALISANDO .env.local:');
const envLocalPath = path.join(projectRoot, '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.log('❌ ARQUIVO .env.local NÃO EXISTE!');
  console.log('\n🔧 SOLUÇÃO:');
  console.log('1. Crie o arquivo .env.local na raiz do projeto');
  console.log('2. Adicione as variáveis do Supabase');
  console.log('3. Reinicie o servidor');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

console.log(`📄 Arquivo encontrado (${lines.length} variáveis):`);

const envVars = {};
lines.forEach((line, index) => {
  if (line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    envVars[key.trim()] = value;
    
    if (key.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      if (value && value.length > 50) {
        console.log(`   ✅ ${key.trim()}=${value.substring(0, 20)}...${value.substring(value.length - 10)} (${value.length} chars)`);
      } else {
        console.log(`   ❌ ${key.trim()}=${value} (MUITO CURTO!)`);
      }
    } else {
      console.log(`   ℹ️  ${key.trim()}=[HIDDEN]`);
    }
  }
});

// 3. VALIDAR VARIÁVEIS CRÍTICAS
console.log('\n3️⃣ VALIDANDO VARIÁVEIS CRÍTICAS:');

const criticalVars = {
  'NEXT_PUBLIC_SUPABASE_URL': envVars['NEXT_PUBLIC_SUPABASE_URL'],
  'SUPABASE_SERVICE_ROLE_KEY': envVars['SUPABASE_SERVICE_ROLE_KEY']
};

let allValid = true;

Object.entries(criticalVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`   ❌ ${key}: NÃO DEFINIDA`);
    allValid = false;
  } else if (value.includes('your_') || value.length < 10) {
    console.log(`   ❌ ${key}: INVÁLIDA (placeholder ou muito curta)`);
    allValid = false;
  } else if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !value.startsWith('eyJ')) {
    console.log(`   ❌ ${key}: NÃO PARECE SER UMA JWT (deve começar com 'eyJ')`);
    allValid = false;
  } else {
    console.log(`   ✅ ${key}: VÁLIDA`);
  }
});

// 4. TESTAR CARREGAMENTO COM DOTENV
console.log('\n4️⃣ TESTANDO CARREGAMENTO COM DOTENV:');

// Limpar process.env das variáveis
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

// Carregar com dotenv
require('dotenv').config({ path: envLocalPath });

const loadedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const loadedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('   NEXT_PUBLIC_SUPABASE_URL carregada:', !!loadedUrl ? '✅' : '❌');
console.log('   SUPABASE_SERVICE_ROLE_KEY carregada:', !!loadedKey ? '✅' : '❌');

if (loadedKey) {
  console.log(`   SERVICE_ROLE_KEY preview: ${loadedKey.substring(0, 20)}...${loadedKey.substring(loadedKey.length - 10)}`);
}

// 5. VERIFICAR PROBLEMAS COMUNS
console.log('\n5️⃣ VERIFICANDO PROBLEMAS COMUNS:');

// Verificar se há caracteres invisíveis
const serviceKeyLine = lines.find(line => line.includes('SUPABASE_SERVICE_ROLE_KEY'));
if (serviceKeyLine) {
  const hasInvisibleChars = /[\u200B-\u200D\uFEFF]/.test(serviceKeyLine);
  console.log('   Caracteres invisíveis:', hasInvisibleChars ? '❌ ENCONTRADOS' : '✅ OK');
  
  const hasCorrectFormat = /^SUPABASE_SERVICE_ROLE_KEY=eyJ/.test(serviceKeyLine.trim());
  console.log('   Formato correto:', hasCorrectFormat ? '✅ OK' : '❌ INCORRETO');
}

// Verificar .env em conflito
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ⚠️  Arquivo .env encontrado (pode estar conflitando)');
  const envContentMain = fs.readFileSync(envPath, 'utf8');
  if (envContentMain.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('   ❌ .env contém SUPABASE_SERVICE_ROLE_KEY (conflito!)');
  }
}

// 6. SOLUÇÃO RECOMENDADA
console.log('\n6️⃣ SOLUÇÃO RECOMENDADA:');

if (!allValid || !loadedKey) {
  console.log('❌ PROBLEMAS ENCONTRADOS!\n');
  
  console.log('🔧 PASSOS PARA CORREÇÃO:');
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto: Duri Trading');
  console.log('3. Vá em: Settings → API');
  console.log('4. Copie a "service_role" key (não a anon!)');
  console.log('5. Edite o .env.local:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui');
  console.log('6. IMPORTANTE: Sem espaços, sem aspas, key deve começar com eyJ');
  console.log('7. Execute:');
  console.log('   rm -rf .next');
  console.log('   npm run dev');
  
} else {
  console.log('✅ VARIÁVEIS OK!\n');
  
  console.log('🔧 PRÓXIMOS PASSOS:');
  console.log('1. Pare o servidor Next.js (Ctrl+C)');
  console.log('2. Limpe o cache: rm -rf .next');
  console.log('3. Reinicie: npm run dev');
  console.log('4. Teste criar usuário novamente');
}

console.log('\n==========================================');
console.log('✅ DIAGNÓSTICO COMPLETO!');