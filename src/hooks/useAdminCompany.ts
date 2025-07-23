// src/hooks/useAdminCompany.ts - HOOK PARA SELEÇÃO DE EMPRESA PELO ADMIN
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Company {
  id: string;
  name: string;
  displayName: string;
}

export function useAdminCompany() {
  const { profile, company: userCompany } = useAuth();
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  // ✅ CARREGAR EMPRESAS DO ASANA (APENAS PARA ADMINS)
  const loadCompanies = useCallback(async () => {
    if (!isAdmin) {
      setAvailableCompanies([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/companies');
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar empresas');
      }

      setAvailableCompanies(result.companies || []);

    } catch (err) {
      console.error('❌ Erro ao carregar empresas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas');
      setAvailableCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // ✅ CARREGAR EMPRESAS QUANDO ADMIN FIZER LOGIN
  useEffect(() => {
    if (isAdmin) {
      loadCompanies();
    }
  }, [isAdmin, loadCompanies]);

  // ✅ SELECIONAR EMPRESA
  const selectCompany = useCallback((company: Company | null) => {
    setSelectedCompany(company);
  }, []);

  // ✅ RESETAR PARA EMPRESA DO USUÁRIO
  const resetToUserCompany = useCallback(() => {
    setSelectedCompany(null);  
  }, []);

  // ✅ EMPRESA EFETIVA (para usar no dashboard)
  const effectiveCompany = selectedCompany || userCompany;

  return {
    // Estado
    availableCompanies,
    selectedCompany,
    loading,
    error,
    isAdmin,
    
    // Empresa efetiva
    effectiveCompany,
    
    // Ações
    selectCompany,
    resetToUserCompany,
    reloadCompanies: loadCompanies,
    
    // Helpers
    hasSelectedCompany: !!selectedCompany,
    isCompanySelected: (companyName: string) => selectedCompany?.name === companyName
  };
}