// src/app/login/page.tsx - Login Simplificado com Empresas do Asana
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setCurrentCompany, getCurrentCompany, Company } from '@/lib/auth';

export default function CompanySelectionLoginPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const router = useRouter();

  useEffect(() => {
    checkExistingAuth();
    loadCompaniesFromAsana();
  }, []);

  const checkExistingAuth = () => {
    const currentCompany = getCurrentCompany();
    if (currentCompany) {
      console.log('✅ Usuário já autenticado:', currentCompany.name);
      router.push('/dashboard');
    }
  };

  const loadCompaniesFromAsana = async () => {
    try {
      console.log('🔍 Carregando empresas do Asana...');
      setLoading(true);
      setSystemStatus('checking');

      const response = await fetch('/api/asana/unified', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        throw new Error('Nenhum dado retornado da API');
      }

      console.log(`📊 ${result.data.length} trackings recebidos do Asana`);

      // Extrair empresas dos títulos
      const { extractCompaniesFromTrackings } = await import('@/lib/auth');
      const extractedCompanies = extractCompaniesFromTrackings(result.data);
      
      if (extractedCompanies.length === 0) {
        throw new Error('Nenhuma empresa encontrada nos dados');
      }

      console.log(`✅ ${extractedCompanies.length} empresas extraídas`);
      setCompanies(extractedCompanies);
      setSystemStatus('online');

    } catch (error) {
      console.error('❌ Erro ao carregar empresas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setSystemStatus('offline');
      
      // Fallback: usar empresas padrão
      const fallbackCompanies = [
        { id: 'wcb', name: 'WCB', displayName: 'WCB' },
        { id: 'agrivale', name: 'AGRIVALE', displayName: 'Agrivale' },
        { id: 'naturally', name: 'NATURALLY', displayName: 'Naturally' },
        { id: 'amz', name: 'AMZ', displayName: 'AMZ' }
      ];
      setCompanies(fallbackCompanies);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelection = (company: Company) => {
    try {
      console.log('🏢 Empresa selecionada:', company.name);
      setCurrentCompany(company);
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Erro na seleção:', error);
      setError('Erro ao selecionar empresa. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando Sistema</h2>
            <p className="text-gray-600">Conectando com Asana...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full">
        
        {/* Header */}
        <div className="text-center p-8 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Tracking Marítimo</h1>
          <p className="text-gray-600">Selecione sua empresa para acessar os processos</p>
          
          {/* Status */}
          <div className={`mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            systemStatus === 'online' ? 'bg-green-100 text-green-800' :
            systemStatus === 'offline' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            <span className="mr-2">
              {systemStatus === 'online' ? '🟢' : 
               systemStatus === 'offline' ? '🔴' : 
               '🟡'}
            </span>
            <span>
              {systemStatus === 'online' ? `${companies.length} empresas disponíveis` :
               systemStatus === 'offline' ? 'Sistema offline - dados limitados' :
               'Verificando sistema...'}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-8 mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              <div>
                <strong>Erro:</strong> {error}
                <button 
                  onClick={loadCompaniesFromAsana}
                  className="ml-4 text-red-600 hover:text-red-800 font-medium underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Companies Grid */}
        <div className="p-8">
          {companies.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                Empresas Disponíveis ({companies.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onClick={() => handleCompanySelection(company)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma Empresa Encontrada</h3>
              <p className="text-gray-600 mb-4">Erro ao conectar com o sistema.</p>
              <button
                onClick={loadCompaniesFromAsana}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                🔄 Recarregar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 text-center text-sm text-gray-500">
          <p>Sistema integrado com Asana • Dados em tempo real</p>
        </div>
      </div>
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  onClick: () => void;
}

function CompanyCard({ company, onClick }: CompanyCardProps) {
  return (
    <button
      onClick={onClick}
      className="group bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all duration-200 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <div className="flex flex-col items-center">
        {/* Company Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <span className="text-white font-bold text-lg">
            {company.name.charAt(0)}
          </span>
        </div>
        
        {/* Company Name */}
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">
          {company.name}
        </h3>
        
        {/* Hover Indicator */}
        <div className="mt-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium">Acessar →</span>
        </div>
      </div>
    </button>
  );
}