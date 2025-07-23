// diagnose-sistema.js - DIAGNÓSTICO COMPLETO DO PROBLEMA
// Execute na raiz do projeto: node diagnose-sistema.js

const fs = require('fs');
const path = require('path');

console.log('🚨 DIAGNÓSTICO COMPLETO - SISTEMA DURI\n');

// 1. VERIFICAR ESTRUTURA DO PROJETO
console.log('1️⃣ ESTRUTURA DO PROJETO:');
const projectRoot = process.cwd();
console.log('📁 Diretório atual:', projectRoot);

const criticalFiles = [
  '.env.local',
  'package.json',
  'next.config.js',
  'src/lib/supabase-admin.ts'
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(projectRoot, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 2. ANÁLISE DO .env.local
console.log('\n2️⃣ ANÁLISE DO .env.local:');
const envLocalPath = path.join(projectRoot, '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.log('❌ ARQUIVO .env.local NÃO EXISTE!');
  console.log('📝 Crie o arquivo na raiz do projeto');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

console.log(`📋 Arquivo encontrado com ${lines.length} linhas`);

// Verificar cada linha do .env.local
lines.forEach((line, index) => {
  if (line.includes('SUPABASE')) {
    const [key, value] = line.split('=');
    
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
      if (!value) {
        console.log(`❌ Linha ${index + 1}: ${key} sem valor`);
      } else if (value.length < 50) {
        console.log(`❌ Linha ${index + 1}: ${key} muito curta (${value.length} chars)`);
      } else if (!value.startsWith('eyJ')) {
        console.log(`❌ Linha ${index + 1}: ${key} não começa com eyJ`);
      } else {
        console.log(`✅ Linha ${index + 1}: ${key} parece válida (${value.length} chars)`);
      }
    } else {
      console.log(`ℹ️  Linha ${index + 1}: ${key}=***`);
    }
  }
});

// 3. TESTE DE CARREGAMENTO MANUAL
console.log('\n3️⃣ TESTE DE CARREGAMENTO:');

// Limpar process.env primeiro
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Carregar com dotenv
require('dotenv').config({ path: envLocalPath });

const testVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

Object.entries(testVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`❌ ${key}: NÃO CARREGADA`);
  } else {
    const preview = value.length > 30 ? 
      `${value.substring(0, 15)}...${value.substring(value.length - 8)}` : 
      value;
    console.log(`✅ ${key}: ${preview} (${value.length} chars)`);
  }
});

// 4. TESTAR VALIDAÇÃO DO CÓDIGO ATUAL
console.log('\n4️⃣ TESTANDO VALIDAÇÃO ATUAL:');

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Simular a validação do código atual
function validateEnvironmentTest() {
  const serviceKeyToTest = serviceKey || process.env.SUPABASE_SERVICE_KEY;
  
  console.log('🔍 Validação SERVICE_ROLE_KEY:');
  console.log(`   - Existe: ${!!serviceKeyToTest}`);
  console.log(`   - Comprimento: ${serviceKeyToTest ? serviceKeyToTest.length : 0}`);
  console.log(`   - Comprimento > 50: ${serviceKeyToTest && serviceKeyToTest.length > 50}`);
  console.log(`   - Não contém 'your_': ${serviceKeyToTest && !serviceKeyToTest.includes('your_')}`);
  console.log(`   - Não é 'dummy': ${serviceKeyToTest && serviceKeyToTest !== 'dummy'}`);
  
  const isValid = serviceKeyToTest && 
                  serviceKeyToTest.length > 50 && 
                  !serviceKeyToTest.includes('your_') && 
                  serviceKeyToTest !== 'dummy';
  
  console.log(`   - VALIDAÇÃO FINAL: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  
  return isValid;
}

const isValidNow = validateEnvironmentTest();

// 5. VERIFICAR ARQUIVOS EM CONFLITO
console.log('\n5️⃣ VERIFICANDO CONFLITOS:');

const envFiles = ['.env', '.env.development', '.env.production'];

envFiles.forEach(envFile => {
  const envPath = path.join(projectRoot, envFile);
  if (fs.existsSync(envPath)) {
    console.log(`⚠️  ${envFile} existe (pode estar conflitando)`);
    const content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.log(`   ❌ ${envFile} contém SUPABASE_SERVICE_ROLE_KEY!`);
    }
  }
});

// 6. VERIFICAR CACHE DO NEXT.JS
console.log('\n6️⃣ VERIFICANDO CACHE:');
const nextCachePath = path.join(projectRoot, '.next');
if (fs.existsSync(nextCachePath)) {
  console.log('⚠️  Cache .next/ existe (pode estar usando valores antigos)');
} else {
  console.log('✅ Sem cache .next/');
}

// 7. SOLUÇÃO RECOMENDADA
console.log('\n7️⃣ SOLUÇÃO RECOMENDADA:');

if (!isValidNow) {
  console.log('❌ PROBLEMA IDENTIFICADO!\n');
  
  if (!serviceKey) {
    console.log('🔧 PROBLEMA: SERVICE_ROLE_KEY não está carregando');
    console.log('📝 SOLUÇÃO:');
    console.log('   1. Verifique se o .env.local está na raiz do projeto');
    console.log('   2. Verifique se não há espaços na linha da variável');
    console.log('   3. Format correto: SUPABASE_SERVICE_ROLE_KEY=eyJ...');
    console.log('   4. Sem aspas, sem espaços ao redor do =');
  } else if (serviceKey.length < 50) {
    console.log('🔧 PROBLEMA: SERVICE_ROLE_KEY muito curta');
    console.log('📝 SOLUÇÃO:');
    console.log('   1. Acesse: https://supabase.com/dashboard');
    console.log('   2. Selecione seu projeto');
    console.log('   3. Vá em: Settings → API');
    console.log('   4. Copie a "service_role" key (NÃO a anon!)');
    console.log('   5. Cole no .env.local substituindo a atual');
  } else {
    console.log('🔧 PROBLEMA: SERVICE_ROLE_KEY inválida');
    console.log('📝 SOLUÇÃO:');
    console.log('   1. A key deve começar com eyJ');
    console.log('   2. Deve ter mais de 100 caracteres');
    console.log('   3. É um JWT válido do Supabase');
  }
  
  console.log('\n🔄 APÓS CORRIGIR:');
  console.log('   1. rm -rf .next');
  console.log('   2. npm run dev');
  console.log('   3. Teste criar usuário novamente');
  
} else {
  console.log('✅ VARIÁVEIS PARECEM CORRETAS!\n');
  
  console.log('🔧 PROBLEMA PODE SER CACHE:');
  console.log('   1. Pare o servidor (Ctrl+C)');
  console.log('   2. rm -rf .next');
  console.log('   3. npm run dev');
  console.log('   4. Teste novamente');
  
  if (fs.existsSync(nextCachePath)) {
    console.log('\n⚠️  CACHE DETECTADO - Execute: rm -rf .next');
  }
}

console.log('\n==========================================');
console.log('✅ DIAGNÓSTICO COMPLETO EXECUTADO!');
console.log('📞 Se o problema persistir após seguir as instruções,');
console.log('    execute o próximo script de correção automatizada.');
console.log('==========================================');