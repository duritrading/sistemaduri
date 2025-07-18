// src/lib/auth.ts - Integração corrigida para filtragem por empresa
export interface Company {
  id: string;
  name: string;
  displayName: string;
}

export const companies: Company[] = [
  { id: 'univar', name: 'UNIVAR', displayName: 'UNIVAR Solutions' },
  { id: 'wanhua', name: 'WANHUA', displayName: 'WANHUA Chemical' },
  { id: 'shadong', name: 'SHADONG', displayName: 'SHADONG Luwei' },
  { id: 'totalenergies', name: 'TOTALENERGIES', displayName: 'TotalEnergies' },
  { id: 'dow', name: 'DOW', displayName: 'DOW Chemical' },
  { id: 'nemenggu', name: 'NEMENGGU', displayName: 'Nemenggu Fufeng' },
  { id: 'sinosweet', name: 'SINOSWEET', displayName: 'Sinosweet' },
  { id: 'ims', name: 'IMS', displayName: 'IMS Corporation' }
];

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
}

export function clearCurrentCompany(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('currentCompany');
}

export function validateUser(email: string, password: string): Company | null {
  // Validação simples por email
  const companyMap: Record<string, string> = {
    'univar@duri.com.br': 'UNIVAR',
    'wanhua@duri.com.br': 'WANHUA',
    'shadong@duri.com.br': 'SHADONG',
    'totalenergies@duri.com.br': 'TOTALENERGIES',
    'dow@duri.com.br': 'DOW',
    'nemenggu@duri.com.br': 'NEMENGGU',
    'sinosweet@duri.com.br': 'SINOSWEET',
    'ims@duri.com.br': 'IMS'
  };

  if (password === 'duri123') {
    const companyName = companyMap[email];
    if (companyName) {
      const company = companies.find(c => c.name === companyName);
      if (company) {
        return company;
      }
    }
  }

  return null;
}

export function filterTrackingsByCompany(trackings: any[], companyName: string): any[] {
  if (!trackings || !Array.isArray(trackings)) {
    console.log('⚠️ Trackings inválidos para filtragem');
    return [];
  }

  console.log(`🔍 Filtrando ${trackings.length} trackings para empresa: ${companyName}`);
  
  const filtered = trackings.filter(tracking => {
    // Filtrar baseado no campo 'company' extraído do título
    const trackingCompany = tracking.company;
    
    if (!trackingCompany) {
      console.log(`⚠️ Tracking sem empresa: ${tracking.title}`);
      return false;
    }
    
    // Comparação case-insensitive e parcial
    const match = trackingCompany.toLowerCase().includes(companyName.toLowerCase()) ||
                  companyName.toLowerCase().includes(trackingCompany.toLowerCase());
    
    if (match) {
      console.log(`✅ Match: "${trackingCompany}" para empresa "${companyName}"`);
    }
    
    return match;
  });

  console.log(`📊 Resultado: ${filtered.length} trackings filtrados de ${trackings.length} total`);
  
  return filtered;
}

export function extractCompanyFromTitle(title: string): string {
  // Padrões para extrair nome da empresa do título
  const patterns = [
    /^(\d+)º?\s+([^(\-]+?)(?:\s*\(|$)/, // 661º UNIVAR (PO 4527659420)
    /^(\d+)\s*[-–]\s*([^(\-]+)/, // 661 - UNIVAR
    /^(\d+)\s+([A-Z][^(\-\d]*)/ // 661 UNIVAR
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const company = (match[2] || '').trim();
      if (company && company.length > 0) {
        return company;
      }
    }
  }
  
  return 'Não identificado';
}

export function debugCompanyExtraction(trackings: any[]): void {
  console.log('\n=== DEBUG EXTRAÇÃO DE EMPRESAS ===');
  
  const companyCount: Record<string, number> = {};
  
  trackings.slice(0, 10).forEach((tracking, index) => {
    const extractedCompany = extractCompanyFromTitle(tracking.title || '');
    const trackingCompany = tracking.company;
    
    console.log(`${index + 1}. "${tracking.title}"`);
    console.log(`   Extraído: "${extractedCompany}"`);
    console.log(`   Campo company: "${trackingCompany}"`);
    
    if (trackingCompany) {
      companyCount[trackingCompany] = (companyCount[trackingCompany] || 0) + 1;
    }
  });
  
  console.log('\n=== DISTRIBUIÇÃO DE EMPRESAS ===');
  Object.entries(companyCount)
    .sort(([,a], [,b]) => b - a)
    .forEach(([company, count]) => {
      console.log(`${company}: ${count} trackings`);
    });
}