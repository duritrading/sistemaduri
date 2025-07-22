// src/hooks/useAuth.ts - HOOK SIMPLIFICADO (ZERO ERRORS)
'use client';

import { useState, useEffect, useCallback } from 'react';

// ✅ EXPORT DO HOOK PRINCIPAL (SEM DUPLICAÇÃO)
export { useAuth } from '@/contexts/AuthContext';
export type { User, UserProfile, Company, AuthContextType } from '@/contexts/AuthContext';

// ✅ HOOK PARA TRACKING DATA
export function useTrackingData(filters?: { status?: string; reference?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { useAuth } = require('@/contexts/AuthContext');
  const { company } = useAuth();

  const fetchData = useCallback(async () => {
    if (!company) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      queryParams.append('company', company.slug);
      
      if (filters?.status) {
        queryParams.append('status', filters.status);
      }
      if (filters?.reference) {
        queryParams.append('reference', filters.reference);
      }

      const response = await fetch(`/api/asana/unified?${queryParams}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao carregar dados');
      }
      
    } catch (err) {
      console.error('Error loading tracking data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [company, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ✅ HOOK PARA PERMISSÕES
export function usePermissions() {
  const { useAuth } = require('@/contexts/AuthContext');
  const { profile } = useAuth();

  return {
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isOperator: ['operator', 'manager', 'admin'].includes(profile?.role || ''),
    canView: !!profile?.active,
    canEdit: ['operator', 'manager', 'admin'].includes(profile?.role || ''),
    canDelete: ['manager', 'admin'].includes(profile?.role || ''),
    canManageUsers: profile?.role === 'admin'
  };
}