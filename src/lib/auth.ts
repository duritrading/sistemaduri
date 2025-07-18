// src/lib/auth.ts - Corrected filtering
'use client';

export interface Company {
  id: string;
  name: string;
  displayName: string;
  trackingCount: number;
}

export function extractCompaniesFromTrackings(trackings: any[]): Company[] {
  const companies = new Map<string, Company>();
  
  console.log('\n=== EXTRACTING COMPANIES ===');
  
  trackings.forEach((tracking, index) => {
    const companyName = tracking.company || 'Não identificado';
    console.log(`Tracking ${index}: "${tracking.title}" -> Company: "${companyName}"`);
    
    if (companyName && companyName !== 'Não identificado') {
      const companyId = companyName.toLowerCase().replace(/\s+/g, '');
      
      if (companies.has(companyId)) {
        companies.get(companyId)!.trackingCount++;
      } else {
        companies.set(companyId, {
          id: companyId,
          name: companyName,
          displayName: companyName,
          trackingCount: 1
        });
      }
    }
  });
  
  const result = Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name));
  console.log('Extracted companies:', result);
  
  return result;
}

export function filterTrackingsByCompany(trackings: any[], companyName: string): any[] {
  console.log(`\n=== FILTERING BY COMPANY: "${companyName}" ===`);
  
  const filtered = trackings.filter((tracking, index) => {
    const trackingCompany = tracking.company || 'Não identificado';
    const matches = trackingCompany.toLowerCase() === companyName.toLowerCase();
    
    console.log(`Tracking ${index}: "${tracking.title}" -> Company: "${trackingCompany}" -> Matches: ${matches}`);
    
    return matches;
  });
  
  console.log(`Filtered ${filtered.length} trackings for company "${companyName}"`);
  return filtered;
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