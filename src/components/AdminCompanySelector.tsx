// src/components/AdminCompanySelector.tsx - SELETOR SIMPLES DE EMPRESA PARA ADMIN
'use client';

import { useAdminCompany } from '@/hooks/useAdminCompany';

export function AdminCompanySelector() {
  const {
    availableCompanies,
    selectedCompany,
    loading,
    error,
    isAdmin,
    selectCompany,
    resetToUserCompany,
    hasSelectedCompany
  } = useAdminCompany();

  // ✅ NÃO RENDERIZAR SE NÃO FOR ADMIN
  if (!isAdmin) {
    return null;
  }

  // ✅ LOADING STATE
  if (loading) {
    return (
      <select disabled className="text-sm border rounded px-2 py-1">
        <option>Carregando empresas...</option>
      </select>
    );
  }

  // ✅ ERROR STATE  
  if (error) {
    return (
      <select disabled className="text-sm border rounded px-2 py-1">
        <option>Erro ao carregar</option>
      </select>
    );
  }

  // ✅ HANDLE SELECTION
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === '') {
      resetToUserCompany();
    } else {
      const company = availableCompanies.find(c => c.name === value);
      if (company) {
        selectCompany(company);
      }
    }
  };

  return (
    <select 
      value={selectedCompany?.name || ''} 
      onChange={handleChange}
      className="text-sm border rounded px-2 py-1"
    >
      <option value="">Minha Empresa</option>
      {availableCompanies.map((company) => (
        <option key={company.name} value={company.name}>
          {company.displayName}
        </option>
      ))}
    </select>
  );
}