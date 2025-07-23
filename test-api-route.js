// test-api-route.js - TESTE DA API ROUTE DE CRIAÇÃO DE USUÁRIOS
// Execute: node test-api-route.js (com o servidor rodando)

const https = require('https');

async function testCreateUserAPI() {
  console.log('🧪 TESTANDO API ROUTE DE CRIAÇÃO DE USUÁRIOS\n');

  // Dados de teste (use dados válidos do seu sistema)
  const testUserData = {
    email: 'teste@exemplo.com',
    password: 'senha123',
    fullName: 'Usuário Teste',
    companyId: 'empresa-padrao-id', // Use um ID válido da sua empresa
    role: 'viewer'
  };

  const postData = JSON.stringify(testUserData);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/create-user',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    rejectUnauthorized: false
  };

  return new Promise((resolve, reject) => {
    console.log('📡 Fazendo requisição para:', `http://localhost:3000${options.path}`);
    console.log('📝 Dados enviados:', {
      email: testUserData.email,
      role: testUserData.role,
      companyId: testUserData.companyId
    });

    const req = https.request(options, (res) => {
      console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ SUCESSO! Resposta da API:');
            console.log('   - Success:', response.success);
            console.log('   - Message:', response.message);
            console.log('   - User ID:', response.user?.id);
            console.log('   - Email:', response.user?.email);
            
            if (response.profile) {
              console.log('   - Profile criado:', response.profile.full_name);
            }
            
            console.log('\n🎉 API ROUTE FUNCIONANDO CORRETAMENTE!');
            resolve(response);
            
          } else {
            console.log('❌ ERRO na API:');
            console.log('   - Status:', res.statusCode);
            console.log('   - Error:', response.error);
            console.log('   - Success:', response.success);
            reject(new Error(response.error || 'Erro desconhecido'));
          }
          
        } catch (parseError) {
          console.log('❌ Erro ao fazer parse da resposta:');
          console.log('Raw response:', data);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Erro na requisição:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n🔧 SOLUÇÃO:');
        console.log('   1. Certifique-se que o servidor está rodando');
        console.log('   2. Execute: npm run dev');
        console.log('   3. Aguarde o servidor iniciar completamente');
        console.log('   4. Execute este teste novamente');
      }
      
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Função usando fetch para Node.js moderno (se disponível)
async function testWithFetch() {
  try {
    const testUserData = {
      email: 'teste@exemplo.com',
      password: 'senha123',
      fullName: 'Usuário Teste',
      companyId: 'empresa-padrao-id',
      role: 'viewer'
    };

    console.log('🔄 Testando com fetch...');

    const response = await fetch('http://localhost:3000/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUserData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Fetch test SUCCESS:', result);
    } else {
      console.log('❌ Fetch test ERROR:', result);
    }

  } catch (error) {
    console.log('❌ Fetch não disponível, usando https nativo');
    return false;
  }
  
  return true;
}

// Executar teste
async function runTest() {
  console.log('🚀 Iniciando teste da API route...\n');

  // Tentar usar fetch primeiro, depois https
  const fetchWorked = await testWithFetch().catch(() => false);
  
  if (!fetchWorked) {
    await testCreateUserAPI();
  }
}

runTest().catch(error => {
  console.error('\n💥 Erro no teste:', error.message);
  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('   1. Certifique-se que npm run dev está rodando');
  console.log('   2. Verifique se as variáveis estão carregadas');
  console.log('   3. Execute: node test-connection.js primeiro');
  console.log('   4. Tente este teste novamente');
});