// test-extraction.js - SCRIPT PARA VALIDAR A NOVA LÓGICA DE EXTRAÇÃO
// Execute: node test-extraction.js

require('dotenv').config({ path: '.env.local' });
const https = require('https');

// ✅ COLE A NOVA FUNÇÃO ROBUSTA AQUI PARA TESTE ISOLADO
function extractCompanyNameRobust(title) {
  if (!title || typeof title !== 'string') return null;
  let cleanTitle = title.trim();
  cleanTitle = cleanTitle.replace(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+[A-Z]{3,4}\s+/, '').trim();
  const patterns = [
    /^\d+(?:\.\d+)?[°º]?\s*[-–]?\s*([A-Z][A-Za-z\s&.'-]+?)(?:\s*\(|\s*[-–]|\s*$)/,
    /^([A-Z][A-Za-z\s&.'-]{2,})(?:\s*\(|\s*[-–]|\s*$)/
  ];
  for (const pattern of patterns) {
    const match = cleanTitle.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company.length > 1 && company.length < 50) return company;
    }
  }
  return null;
}

async function testAsanaExtraction() {
  console.log('🧪 Testando extração de empresas do Asana...');
  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ ASANA_ACCESS_TOKEN não encontrado em .env.local');
    return;
  }

  const options = {
    hostname: 'app.asana.com',
    path: '/api/1.0/tasks?project=1204856191429393&opt_fields=name&limit=100', // Substitua pelo GID do seu projeto se necessário
    headers: { 'Authorization': `Bearer ${token}` }
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const tasks = JSON.parse(data).data;
        if (!tasks) {
          console.error('❌ Nenhuma tarefa encontrada. Verifique o ID do projeto.');
          console.log('Raw response:', data);
          return;
        }
        
        console.log(`📊 Encontradas ${tasks.length} tarefas. Analisando...`);
        let success = 0;
        let errors = 0;

        tasks.forEach(task => {
          const company = extractCompanyNameRobust(task.name);
          if (company) {
            console.log(`✅ SUCESSO: "${task.name}" -> "${company}"`);
            success++;
          } else {
            console.log(`❌ FALHA: "${task.name}"`);
            errors++;
          }
        });

        console.log('\n🎯 RESULTADO DO TESTE:');
        console.log(`   - Sucessos: ${success}`);
        console.log(`   - Falhas: ${errors}`);
        console.log(`   - Taxa de sucesso: ${((success / tasks.length) * 100).toFixed(1)}%`);
        
      } catch (e) {
        console.error('❌ Erro ao processar resposta do Asana:', e.message);
      }
    });
  }).on('error', (e) => {
    console.error(`❌ Erro na requisição para o Asana: ${e.message}`);
  });
}

testAsanaExtraction();