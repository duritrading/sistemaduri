// src/app/login/page.tsx - Fix company extraction
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractCompaniesFromTrackings, setCurrentCompany, type Company } from '@/lib/auth';

export default function LoginPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching companies from Asana...');
      
      // Use the accurate endpoint
      const response = await fetch('/api/asana/accurate-trackings');
      const result = await response.json();
      
      console.log('API Response:', result);
      
      if (result.success && result.data) {
        console.log(`Found ${result.data.length} trackings`);
        
        // Log sample data for debugging
        if (result.data.length > 0) {
          console.log('Sample tracking:', result.data[0]);
        }
        
        const extractedCompanies = extractCompaniesFromTrackings(result.data);
        console.log('Extracted companies:', extractedCompanies);
        
        setCompanies(extractedCompanies);
      } else {
        setError(result.error || 'Erro ao carregar empresas');
        console.error('API Error:', result.error);
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyLogin = (company: Company) => {
    console.log('Selected company:', company);
    setCurrentCompany(company);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Tracking
          </h1>
          <p className="text-gray-600">
            Selecione sua empresa para acessar os processos
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Carregando empresas...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">❌ Erro:</p>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchCompanies}
              className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {!loading && !error && companies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Nenhuma empresa encontrada</p>
            <button 
              onClick={fetchCompanies}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Recarregar
            </button>
            <div className="mt-4 text-xs text-gray-500">
              📊 Dados sincronizados do Asana
            </div>
          </div>
        )}

        {!loading && !error && companies.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Empresas disponíveis ({companies.length}):
            </h2>
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleCompanyLogin(company)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {company.displayName}
                </div>
                <div className="text-sm text-gray-500">
                  {company.trackingCount} {company.trackingCount === 1 ? 'processo' : 'processos'}
                </div>
              </button>
            ))}
            
            <div className="mt-6 text-center text-xs text-gray-500">
              📊 Dados sincronizados do Asana
            </div>
          </div>
        )}
      </div>
    </div>
  );
}