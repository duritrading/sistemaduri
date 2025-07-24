// ✅ ATUALIZAÇÃO PARA lib/auth.ts - EXTRAÇÃO ESTRITA
// Substitua as funções existentes por estas versões strict

export interface Company {
  id: string;
  name: string;
  displayName: string;
}

export function getCurrentCompany(): Company | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('currentCompany');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Erro ao parsear empresa armazenada:', e);
    }
  }
  return null;
}

export function setCurrentCompany(company: Company): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('currentCompany', JSON.stringify(company));
  console.log(`✅ Empresa ${company.name} salva no localStorage`);
}

export function clearCurrentCompany(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('currentCompany');
  console.log('🗑️ Empresa removida do localStorage');
}

/**
 * ✅ EXTRAÇÃO ESTRITA - SÓ ACEITA FORMATO: "número + empresa"
 * Aceitos: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "13º.1 NATURALLY"
 * Rejeitados: "DURI TRADING", "EXPOFRUT (IMPORTAÇÃO)", qualquer coisa sem número ordinal
 */
export function extractCompaniesFromTrackings(trackings: any[]): Company[] {
  if (!trackings || !Array.isArray(trackings)) {
    console.warn('⚠️ Trackings inválidos para extração de empresas');
    return [];
  }

  console.log(`🔍 Extraindo empresas STRICT MODE de ${trackings.length} trackings...`);
  
  const companySet = new Set<string>();
  let validCount = 0;
  let rejectedCount = 0;
  
  trackings.forEach((tracking, index) => {
    const title = tracking.name || tracking.title || '';
    if (!title) return;

    const extractedCompany = extractCompanyFromTitleStrict(title);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      validCount++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [${index + 1}] "${title}" → "${extractedCompany}"`);
      }
    } else {
      rejectedCount++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`❌ [${index + 1}] "${title}" → REJEITADO (sem padrão número+empresa)`);
      }
    }
  });

  // Converter Set para Array de Company objects
  const companiesArray = Array.from(companySet)
    .sort()
    .map((name, index) => ({
      id: generateCompanyId(name),
      name: name,
      displayName: formatDisplayName(name)
    }));

  console.log(`\n📊 RESULTADO EXTRAÇÃO STRICT:`);
  console.log(`   ✅ Válidas: ${validCount}`);
  console.log(`   ❌ Rejeitadas: ${rejectedCount}`);
  console.log(`   🏢 Empresas únicas: ${companiesArray.length}`);
  console.log(`   📋 Lista:`, companiesArray.map(c => c.name));
  
  return companiesArray;
}

/**
 * ✅ EXTRAÇÃO ESTRITA DE EMPRESA DE UM TÍTULO INDIVIDUAL
 * PADRÃO: "número + empresa" OU "número + empresa + (detalhes)"
 */
function extractCompanyFromTitleStrict(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  // ✅ Limpar título (remover timestamps se houver)
  let cleanTitle = title.trim();
  cleanTitle = cleanTitle.replace(/^\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}:\d{2}\s+[A-Z]{3,4}\s+/, '').trim();
  
  // ✅ PADRÃO ESTRITO: APENAS "número + empresa" ou "número + empresa + (detalhes)"
  // ✅ Aceitos: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "13º.1 NATURALLY"
  // ❌ Rejeitados: "DURI TRADING", "EXPOFRUT (IMPORTAÇÃO)", qualquer coisa sem número
  
  const strictPattern = /^\d+º(?:\.\d+)?\s+([A-Z][A-Za-z\s&.'-]+?)(?:\s*\(.*)?$/i;
  const match = cleanTitle.match(strictPattern);
  
  if (match && match[1]) {
    let company = match[1].trim().toUpperCase();
    
    // ✅ Validações de qualidade
    if (company.length >= 2 &&           // Mínimo 2 caracteres
        company.length <= 50 &&          // Máximo 50 caracteres  
        company.match(/[A-Z]/) &&        // Deve ter pelo menos uma letra
        !company.match(/^[\d\s]*$/)) {   // Não pode ser só números/espaços
      
      return company;
    }
  }
  
  return null;
}

/**
 * Gera ID único para a empresa baseado no nome
 */
function generateCompanyId(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove tudo que não for letra ou número
    .substring(0, 20) // Limita tamanho
    || `company_${Date.now()}`; // Fallback se o nome for muito limpo
}

/**
 * Formata o nome para display mais amigável
 */
function formatDisplayName(companyName: string): string {
  // Para nomes curtos ou siglas, manter como está
  if (companyName.length <= 6) {
    return companyName;
  }
  
  return companyName
    .split(/[\s&-]+/) // Split por espaços, & e -
    .map(word => {
      if (word.length <= 3) return word; // Manter siglas como estão
      
      // Primeira letra maiúscula, resto minúsculo
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Extrai empresa de um tracking individual (compatibilidade)
 */
function extractCompanyFromTracking(tracking: any): string | null {
  const title = tracking.name || tracking.title || '';
  return extractCompanyFromTitleStrict(title);
}

/**
 * Obtém estatísticas das empresas nos trackings (só empresas válidas)
 */
export function getCompanyStats(trackings: any[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const companyName = extractCompanyFromTracking(tracking);
    if (companyName) {
      stats[companyName] = (stats[companyName] || 0) + 1;
    }
  });
  
  return stats;
}

/**
 * ✅ FUNÇÃO DE TESTE - Verifica se um título segue o padrão strict
 */
export function testStrictPattern(title: string): { 
  valid: boolean; 
  company: string | null; 
  reason: string;
} {
  const company = extractCompanyFromTitleStrict(title);
  
  if (company) {
    return {
      valid: true,
      company: company,
      reason: `Segue padrão "número + empresa": "${company}"`
    };
  } else {
    return {
      valid: false,
      company: null,
      reason: 'Não segue padrão "número + empresa" (ex: "122º WCB")'
    };
  }
}

/**
 * ✅ FUNÇÃO HELPER - Lista todas as empresas válidas de uma lista de títulos
 */
export function previewExtractionResults(titles: string[]): {
  valid: Array<{ title: string; company: string }>;
  invalid: Array<{ title: string; reason: string }>;
  summary: { validCount: number; invalidCount: number; uniqueCompanies: number };
} {
  const valid: Array<{ title: string; company: string }> = [];
  const invalid: Array<{ title: string; reason: string }> = [];
  const companies = new Set<string>();

  titles.forEach(title => {
    const result = testStrictPattern(title);
    
    if (result.valid && result.company) {
      valid.push({ title, company: result.company });
      companies.add(result.company);
    } else {
      invalid.push({ title, reason: result.reason });
    }
  });

  return {
    valid,
    invalid,
    summary: {
      validCount: valid.length,
      invalidCount: invalid.length,
      uniqueCompanies: companies.size
    }
  };
}