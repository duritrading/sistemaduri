// src/lib/auth.ts - Update to use title extraction only
'use client';

export interface Company {
  id: string;
  name: string;
  displayName: string;
  trackingCount: number;
}

export function extractCompaniesFromTrackings(trackings: any[]): Company[] {
  console.log('\n=== EXTRACTING COMPANIES FROM TRACKINGS ===');
  console.log(`Total trackings received: ${trackings?.length || 0}`);
  
  if (!trackings || !Array.isArray(trackings)) {
    console.log('Invalid trackings data');
    return [];
  }

  const companies = new Map<string, Company>();
  
  trackings.forEach((tracking, index) => {
    console.log(`\nTracking ${index}:`);
    console.log(`  Title: "${tracking?.title || 'N/A'}"`);
    console.log(`  Company field: "${tracking?.company || 'N/A'}"`);
    
    // Company ALWAYS comes from the title, not from Exportador field
    const companyName = tracking?.company || '';
    
    if (companyName && companyName.trim()) {
      const companyId = normalizeCompanyName(companyName);
      console.log(`  Normalized ID: "${companyId}"`);
      
      if (companies.has(companyId)) {
        companies.get(companyId)!.trackingCount++;
        console.log(`  Incremented count for existing company`);
      } else {
        companies.set(companyId, {
          id: companyId,
          name: companyName,
          displayName: companyName,
          trackingCount: 1
        });
        console.log(`  Created new company entry`);
      }
    } else {
      console.log(`  No valid company name found`);
    }
  });
  
  const result = Array.from(companies.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  console.log('\n=== FINAL COMPANIES EXTRACTED ===');
  result.forEach((company, index) => {
    console.log(`${index + 1}. "${company.name}" (${company.trackingCount} trackings)`);
  });
  
  return result;
}

export function filterTrackingsByCompany(trackings: any[], companyName: string): any[] {
  console.log(`\n=== FILTERING BY COMPANY: "${companyName}" ===`);
  
  if (!trackings || !Array.isArray(trackings)) {
    console.log('Invalid trackings data for filtering');
    return [];
  }
  
  const filtered = trackings.filter((tracking, index) => {
    if (!tracking) return false;
    
    // Use company field (which comes from title extraction)
    const trackingCompany = tracking.company || '';
    const normalizedTracking = normalizeCompanyName(trackingCompany);
    const normalizedFilter = normalizeCompanyName(companyName);
    
    const matches = normalizedTracking === normalizedFilter;
    
    console.log(`Tracking ${index}: "${tracking.title}" -> Company: "${trackingCompany}" -> Matches: ${matches}`);
    
    return matches;
  });
  
  console.log(`Filtered ${filtered.length} trackings for company "${companyName}"`);
  return filtered;
}

function normalizeCompanyName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  return name.toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
}

export function setCurrentCompany(company: Company): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentCompany', JSON.stringify(company));
    console.log('Set current company:', company);
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