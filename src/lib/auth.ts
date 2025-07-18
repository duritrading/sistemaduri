// src/lib/auth.ts - Criar se não existir
'use client';

export interface Company {
  id: string;
  name: string;
  displayName: string;
  trackingCount: number;
}

export function extractCompaniesFromTrackings(trackings: any[]): Company[] {
  const companies = new Map<string, Company>();
  
  trackings.forEach(tracking => {
    const companyMatch = tracking.title.match(/^\d+º\s+([^-]+)/);
    if (companyMatch) {
      const companyName = companyMatch[1].trim();
      const companyId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
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
  
  return Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function filterTrackingsByCompany(trackings: any[], companyName: string): any[] {
  return trackings.filter(tracking => {
    const companyMatch = tracking.title.match(/^\d+º\s+([^-]+)/);
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