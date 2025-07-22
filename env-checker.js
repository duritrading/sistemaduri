// env-checker.js - VERIFICAR VARIÁVEIS DE AMBIENTE
// Execute: node env-checker.js

console.log('🔍 VERIFICANDO VARIÁVEIS DE AMBIENTE...\n');

const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'ASANA_ACCESS_TOKEN': process.env.ASANA_ACCESS_TOKEN,
  'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
  'NEXTAUTH_URL': process.env.NEXTAUTH_URL
};

let allGood = true;

Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value || value.includes('your_') || value === '') {
    console.log(`❌ ${key}: FALTANDO ou INVÁLIDA`);
    allGood = false;
  } else {
    const preview = value.length > 50 ? value.substring(0, 20) + '...' + value.substring(value.length - 10) : value;
    console.log(`✅ ${key}: ${preview}`);
  }
});

console.log('\n🎯 RESULTADO:');
if (allGood) {
  console.log('✅ Todas as variáveis estão configuradas!');
  console.log('📝 Se ainda estiver dando erro, reinicie o servidor: npm run dev');
} else {
  console.log('❌ Algumas variáveis estão faltando.');
  console.log('📝 Copie as variáveis corretas para .env.local e reinicie o servidor.');
}

console.log('\n📋 Para obter as chaves do Supabase:');
console.log('1. Acesse: https://supabase.com/dashboard');
console.log('2. Selecione seu projeto');
console.log('3. Vá em: Settings > API');
console.log('4. Copie: anon/public key + service_role key');
console.log('5. Cole no .env.local');
console.log('6. Reinicie: npm run dev\n');