// src/lib/auth.ts - Versão com debug e mais flexível
'use client';

export interface Company {
  id: string;
  name: string;
  displayName: string;
  trackingCount: number;
}

export function extractCompaniesFromTrackings(trackings: any[]): Company[] {
  const companies = new Map<string, Company>();
  
  console.log('=== DEBUG: Analisando trackings ===');
  console.log('Total de trackings:', trackings.length);
  
  trackings.forEach((tracking, index) => {
    console.log(`${index + 1}. "${tracking.title}"`);
    
    // Primeiro tenta o padrão com parêntese: "número + nome + (observação)"
    let companyMatch = tracking.title.match(/^\d+º\s+(.+?)\s*\(/);
    
    // Se não encontrou, tenta padrão sem parêntese: "número + nome"
    if (!companyMatch) {
      companyMatch = tracking.title.match(/^\d+º\s+(.+?)$/);
    }
    
    // Se ainda não encontrou, tenta padrão com hífen: "número + nome - resto"
    if (!companyMatch) {
      companyMatch = tracking.title.match(/^\d+º\s+(.+?)\s*-/);
    }
    
    if (companyMatch) {
      const companyName = companyMatch[1].trim();
      const companyId = companyName.toLowerCase().replace(/\s+/g, '');
      
      console.log(`   ✅ Extraído: "${companyName}" (ID: ${companyId})`);
      
      if (companies.has(companyId)) {
        companies.get(companyId)!.trackingCount++;
        console.log(`   📈 Incrementado contador para "${companyName}"`);
      } else {
        companies.set(companyId, {
          id: companyId,
          name: companyName,
          displayName: companyName,
          trackingCount: 1
        });
        console.log(`   ✨ Nova empresa criada: "${companyName}"`);
      }
    } else {
      console.log(`   ❌ Não corresponde ao padrão: "${tracking.title}"`);
    }
  });
  
  const result = Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name));
  console.log('=== Empresas finais ===');
  result.forEach(company => {
    console.log(`${company.displayName}: ${company.trackingCount} processo(s)`);
  });
  
  return result;
}

export function filterTrackingsByCompany(trackings: any[], companyName: string): any[] {
  return trackings.filter(tracking => {
    // Tenta os três padrões
    let companyMatch = tracking.title.match(/^\d+º\s+(.+?)\s*\(/);
    if (!companyMatch) {
      companyMatch = tracking.title.match(/^\d+º\s+(.+?)$/);
    }
    if (!companyMatch) {
      companyMatch = tracking.title.match(/^\d+º\s+(.+?)\s*-/);
    }
    
    if (companyMatch) {
      const trackingCompany = companyMatch[1].trim();
      return trackingCompany.toLowerCase() === companyName.toLowerCase();
    }
    return false;
  });
}

export function setCurrentCompany(company: Company): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentCompany', JSON.stringify(company));
  }
}

export function getCurrentCompany(): Company | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentCompany');
    return stored ? JSON.parse(stored) : null;
  }
  return null;
}

export function clearCurrentCompany(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentCompany');
  }
}