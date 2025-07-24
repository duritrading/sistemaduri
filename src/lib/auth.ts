// src/lib/auth.ts - ARQUIVO DE COMPATIBILIDADE DURANTE MIGRAÇÃO
// Mantém funções antigas funcionando enquanto migramos para Supabase

export interface Company {
  id: string;
  name: string;
  displayName: string;
}

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
 * Extrai empresas dos títulos REAIS do Asana seguindo os padrões identificados:
 * - "122º WCB" → "WCB"
 * - "28º AGRIVALE" → "AGRIVALE" 
 * - "17º AMZ (IMPORTAÇÃO)" → "AMZ"
 * - "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)" → "EXPOFRUT"
 */
export function extractCompaniesFromTrackings(trackings: any[]): Company[] {
  if (!trackings || !Array.isArray(trackings)) {
    console.warn('⚠️ Trackings inválidos para extração de empresas');
    return [];
  }

  console.log(`🔍 Extraindo empresas de ${trackings.length} trackings...`);
  console.log('📋 Primeiros 5 títulos para análise:', trackings.slice(0, 5).map(t => t.name || t.title));
  
  const companySet = new Set<string>();
  
  trackings.forEach((tracking, index) => {
    const title = tracking.name || tracking.title || '';
    if (!title) return;

    const extractedCompany = extractCompanyFromTitle(title);
    
    if (extractedCompany) {
      companySet.add(extractedCompany);
      console.log(`✅ [${index + 1}] "${title}" → "${extractedCompany}"`);
    } else {
      console.log(`⚠️ [${index + 1}] "${title}" → NÃO EXTRAÍDO`);
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

  console.log(`✅ ${companiesArray.length} empresas únicas extraídas:`, 
    companiesArray.map(c => c.name));
  
  return companiesArray;
}

/**
 * Extrai empresa de um título individual usando múltiplos padrões
 * Handles: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)"
 */
function extractCompanyFromTitle(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  
  const cleanTitle = title.trim();
  
  // Padrão 1: "122º WCB", "28º AGRIVALE", "17º AMZ (IMPORTAÇÃO)", "13º.1 NATURALLY"
  // Captura tudo após "número º" até encontrar "(" ou fim da string
  const pattern1 = /^\d+º(?:\.\d+)?\s+([^(]+?)(?:\s*\(.*)?$/i;
  const match1 = cleanTitle.match(pattern1);
  
  if (match1 && match1[1]) {
    const company = match1[1].trim().toUpperCase();
    // Validar se não é só números ou espaços
    if (company.length >= 2 && !company.match(/^[\d\s]*$/) && company.match(/[A-Z]/)) {
      return company;
    }
  }

  // Padrão 2: "EXPOFRUT (IMPORTAÇÃO DIRETA 01.2025)" - empresa no início sem número
  // Captura empresa no início até encontrar "(" ou fim da string
  const pattern2 = /^([A-Z][^(]*?)(?:\s*\(.*)?$/i;
  const match2 = cleanTitle.match(pattern2);
  
  if (match2 && match2[1] && !match2[1].match(/^\d/)) {
    const company = match2[1].trim().toUpperCase();
    // Validar tamanho e que contém letras
    if (company.length >= 2 && company.length <= 50 && company.match(/[A-Z]/)) {
      return company;
    }
  }

  // Padrão 3: Fallback - qualquer sequência de letras maiúsculas
  const pattern3 = /([A-Z]{2,}(?:\s+[A-Z]+)*)/;
  const match3 = cleanTitle.match(pattern3);
  
  if (match3 && match3[1]) {
    const company = match3[1].trim().toUpperCase();
    if (company.length >= 2 && company.length <= 30) {
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
 * Extrai empresa de um tracking individual
 */
function extractCompanyFromTracking(tracking: any): string | null {
  const title = tracking.name || tracking.title || '';
  return extractCompanyFromTitle(title);
}

/**
 * Obtém estatísticas das empresas nos trackings
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