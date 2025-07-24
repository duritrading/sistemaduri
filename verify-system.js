const fs = require('fs');
const path = require('path');

function findCountUsage(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      findCountUsage(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('count(*)')) {
        console.log(`❌ ENCONTRADO count(*) em: ${fullPath}`);
        
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('count(*)')) {
            console.log(`   Linha ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('🔍 Procurando por count(*) em todo o projeto...');
findCountUsage('./src');
console.log('✅ Verificação concluída');