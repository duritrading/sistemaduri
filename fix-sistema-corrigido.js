// fix-sistema-corrigido.js - CORREÇÃO AUTOMATIZADA (VERSÃO CORRIGIDA)
// Execute na raiz do projeto: node fix-sistema-corrigido.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 CORREÇÃO AUTOMATIZADA - SISTEMA DURI\n');

const projectRoot = process.cwd();

// 1. BACKUP DO .env.local ATUAL
console.log('1️⃣ FAZENDO BACKUP...');
const envLocalPath = path.join(projectRoot, '.env.local');

if (fs.existsSync(envLocalPath)) {
  const backupPath = path.join(projectRoot, '.env.local.backup');
  fs.copyFileSync(envLocalPath, backupPath);
  console.log('✅ Backup criado: .env.local.backup');
} else {
  console.log('❌ .env.local não encontrado!');
  process.exit(1);
}

// 2. LER E VALIDAR VARIÁVEIS ATUAIS
console.log('\n2️⃣ VALIDANDO VARIÁVEIS ATUAIS...');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const lines = envContent.split('\n');

let hasUrl = false;
let hasServiceKey = false;
let hasAnonKey = false;

const variables = {};

lines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    variables[key.trim()] = value ? value.trim() : '';
    
    if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') hasUrl = true;
    if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') hasServiceKey = true;
    if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') hasAnonKey = true;
  }
});

console.log('   - NEXT_PUBLIC_SUPABASE_URL: ' + (hasUrl ? '✅' : '❌'));
console.log('   - SUPABASE_SERVICE_ROLE_KEY: ' + (hasServiceKey ? '✅' : '❌'));
console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY: ' + (hasAnonKey ? '✅' : '❌'));

// 3. VALIDAR SERVICE_ROLE_KEY
console.log('\n3️⃣ VALIDANDO SERVICE_ROLE_KEY...');

const serviceKey = variables['SUPABASE_SERVICE_ROLE_KEY'];
if (!serviceKey || serviceKey.length < 50 || !serviceKey.startsWith('eyJ')) {
  console.log('❌ SERVICE_ROLE_KEY inválida!');
  console.log('📝 Por favor, obtenha a key correta:');
  console.log('   1. https://supabase.com/dashboard');
  console.log('   2. Seu projeto → Settings → API');
  console.log('   3. Copie "service_role" key');
  console.log('   4. Cole no .env.local');
  process.exit(1);
}

console.log('✅ SERVICE_ROLE_KEY válida (' + serviceKey.length + ' chars)');

// 4. CRIAR NOVO .env.local LIMPO
console.log('\n4️⃣ RECRIANDO .env.local LIMPO...');

const newEnvLines = [
  '# CONFIGURAÇÃO SUPABASE - SISTEMA DURI',
  '# Gerado automaticamente em ' + new Date().toISOString(),
  '',
  '# URL do projeto Supabase',
  'NEXT_PUBLIC_SUPABASE_URL=' + (variables['NEXT_PUBLIC_SUPABASE_URL'] || ''),
  '',
  '# Chave anônima (pública)',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=' + (variables['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || ''),
  '',
  '# Chave de serviço (ADMIN - manter secreta)',
  'SUPABASE_SERVICE_ROLE_KEY=' + (variables['SUPABASE_SERVICE_ROLE_KEY'] || ''),
  '',
  '# Tokens externos',
  'ASANA_ACCESS_TOKEN=' + (variables['ASANA_ACCESS_TOKEN'] || ''),
  '',
  '# NextAuth',
  'NEXTAUTH_SECRET=' + (variables['NEXTAUTH_SECRET'] || 'sua_secret_key_aqui'),
  'NEXTAUTH_URL=' + (variables['NEXTAUTH_URL'] || 'http://localhost:3000'),
  ''
];

fs.writeFileSync(envLocalPath, newEnvLines.join('\n'));
console.log('✅ .env.local recriado com formato limpo');

// 5. LIMPAR CACHE DO NEXT.JS
console.log('\n5️⃣ LIMPANDO CACHE...');

const nextCachePath = path.join(projectRoot, '.next');
if (fs.existsSync(nextCachePath)) {
  try {
    if (process.platform === 'win32') {
      execSync('rmdir /s /q .next', { cwd: projectRoot });
    } else {
      execSync('rm -rf .next', { cwd: projectRoot });
    }
    console.log('✅ Cache .next/ removido');
  } catch (error) {
    console.log('⚠️  Erro ao remover cache (tente manualmente: rm -rf .next)');
  }
} else {
  console.log('ℹ️  Nenhum cache encontrado');
}

// 6. VERIFICAR NODE_MODULES
console.log('\n6️⃣ VERIFICANDO DEPENDÊNCIAS...');

const nodeModulesPath = path.join(projectRoot, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules não encontrado');
  console.log('📝 Execute: npm install');
} else {
  console.log('✅ node_modules encontrado');
}

// 7. TESTAR CARREGAMENTO DAS VARIÁVEIS
console.log('\n7️⃣ TESTANDO CARREGAMENTO...');

// Limpar process.env
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Carregar novamente
require('dotenv').config({ path: envLocalPath });

const testUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const testKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('   - URL carregada: ' + (testUrl ? '✅' : '❌'));
console.log('   - Service Key carregada: ' + (testKey ? '✅' : '❌') + ' (' + (testKey ? testKey.length : 0) + ' chars)');
console.log('   - Anon Key carregada: ' + (testAnon ? '✅' : '❌'));

// 8. CRIAR ARQUIVO DE TESTE
console.log('\n8️⃣ CRIANDO TESTE DE CONEXÃO...');

// Usar concatenação de strings para evitar problemas de template strings
const testConnectionCode = [
  "// test-connection.js - TESTE DE CONEXÃO SUPABASE",
  "// Execute: node test-connection.js",
  "",
  "require('dotenv').config({ path: '.env.local' });",
  "",
  "async function testConnection() {",
  "  console.log('🧪 TESTANDO CONEXÃO SUPABASE...\\n');",
  "  ",
  "  // Verificar variáveis",
  "  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;",
  "  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;",
  "  ",
  "  console.log('📋 Variáveis:');",
  "  console.log('   - URL: ' + (url ? url.substring(0, 30) + '...' : 'UNDEFINED'));",
  "  console.log('   - Service Key: ' + (serviceKey ? serviceKey.substring(0, 20) + '...' : 'UNDEFINED') + ' (' + (serviceKey ? serviceKey.length : 0) + ' chars)');",
  "  ",
  "  if (!url || !serviceKey) {",
  "    console.log('❌ Variáveis não carregadas!');",
  "    return;",
  "  }",
  "  ",
  "  try {",
  "    // Testar conexão",
  "    const { createClient } = require('@supabase/supabase-js');",
  "    ",
  "    const supabase = createClient(url, serviceKey, {",
  "      auth: {",
  "        autoRefreshToken: false,",
  "        persistSession: false",
  "      }",
  "    });",
  "    ",
  "    console.log('\\n🔄 Testando conexão...');",
  "    ",
  "    const { data, error } = await supabase.auth.admin.listUsers();",
  "    ",
  "    if (error) {",
  "      console.log('❌ Erro na conexão:', error.message);",
  "    } else {",
  "      console.log('✅ Conexão OK! ' + data.users.length + ' usuários encontrados');",
  "      console.log('\\n🎉 CONFIGURAÇÃO FUNCIONANDO!');",
  "    }",
  "    ",
  "  } catch (err) {",
  "    console.log('❌ Erro ao testar:', err.message);",
  "  }",
  "}",
  "",
  "testConnection();"
].join('\n');

fs.writeFileSync(path.join(projectRoot, 'test-connection.js'), testConnectionCode);
console.log('✅ Arquivo test-connection.js criado');

// 9. RESULTADO FINAL
console.log('\n9️⃣ RESULTADO FINAL:');

if (testUrl && testKey && testKey.length > 50) {
  console.log('✅ CORREÇÃO CONCLUÍDA COM SUCESSO!\n');
  
  console.log('🔄 PRÓXIMOS PASSOS:');
  console.log('   1. npm run dev (iniciar servidor)');
  console.log('   2. Acesse http://localhost:3000');
  console.log('   3. Teste criar usuário novamente');
  console.log('');
  console.log('🧪 PARA TESTAR A CONEXÃO:');
  console.log('   node test-connection.js');
  console.log('');
  console.log('📁 ARQUIVOS CRIADOS:');
  console.log('   - .env.local.backup (backup do original)');
  console.log('   - test-connection.js (teste de conexão)');
  
} else {
  console.log('❌ AINDA HÁ PROBLEMAS!\n');
  
  console.log('🔧 AÇÃO MANUAL NECESSÁRIA:');
  console.log('   1. Acesse: https://supabase.com/dashboard');
  console.log('   2. Selecione seu projeto');
  console.log('   3. Settings → API');
  console.log('   4. Copie a "service_role" key');
  console.log('   5. Edite .env.local:');
  console.log('      SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui');
  console.log('   6. Execute: node test-connection.js');
}

console.log('\n==========================================');
console.log('✅ SCRIPT DE CORREÇÃO EXECUTADO!');
console.log('==========================================');