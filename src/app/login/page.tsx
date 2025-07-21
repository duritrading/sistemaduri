// src/app/login/page.tsx - Login com Lista de Empresas Extraídas do Asana
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

      // Lista de endpoints para tentar em ordem de prioridade
      const endpoints = [
        '/api/asana/unified',
        '/api/asana/trackings',
        '/api/asana/enhanced-trackings',
        '/api/asana/comprehensive-trackings'
      ];

      let response = null;
      let result = null;
      
      // Tentar cada endpoint até encontrar um que funcione
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentando endpoint: ${endpoint}`);
          
          response = await fetch(endpoint, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(15000) // 15s timeout
          });

          if (response.ok) {
            result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
              console.log(`✅ Endpoint ${endpoint} funcionou! ${result.data.length} itens recebidos`);
              break;
            } else {
              console.warn(`⚠️ Endpoint ${endpoint} retornou dados vazios:`, result);
            }
          } else {
            console.warn(`⚠️ Endpoint ${endpoint} falhou: ${response.status} ${response.statusText}`);
          }
        } catch (endpointError) {
          console.warn(`❌ Endpoint ${endpoint} erro:`, endpointError instanceof Error ? endpointError.message : endpointError);
          continue;
        }
      }

      if (!result || !result.success || !result.data) {
        throw new Error(`Todos os endpoints falharam. Último erro: ${response?.status || 'No response'}`);
      }

      console.log(`📊 ${result.data.length} trackings recebidos do Asana`);
      console.log('📋 Primeiros 3 títulos para análise:', result.data.slice(0, 3).map(t => t.name || t.title || 'NO TITLE'));

      // Usar a função de extração corrigida
      const { extractCompaniesFromTrackings } = await import('@/lib/auth');
      const extractedCompanies = extractCompaniesFromTrackings(result.data);
      
      if (extractedCompanies.length === 0) {
        console.warn('⚠️ Nenhuma empresa extraída dos dados');
        console.log('🔍 Debug - Títulos recebidos:', result.data.slice(0, 10).map(t => t.name || t.title || 'NO TITLE'));
        
        // Tentar fallback com empresas padrão
        throw new Error('Nenhuma empresa encontrada nos títulos dos dados do Asana');
      }

      console.log(`✅ ${extractedCompanies.length} empresas extraídas com sucesso`);
      setCompanies(extractedCompanies);
      setSystemStatus('online');

    } catch (error) {
      console.error('❌ Erro ao carregar empresas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setSystemStatus('offline');
      
      // Fallback: usar empresas padrão
      const { defaultCompanies } = await import('@/lib/auth');
      setCompanies(defaultCompanies);
      console.log('🔄 Usando empresas padrão como fallback:', defaultCompanies.map(c => c.name));
    } finally {
      setLoading(false);
    }
  };

  // Usar a função de extração atualizada
  const extractCompaniesFromTitles = (trackings: any[]): Company[] => {
    // Importar função de extração corrigida
    const { extractCompaniesFromTrackings } = require('@/lib/auth');
    return extractCompaniesFromTrackings(trackings);
  };

  const formatCompanyDisplayName = (name: string): string => {
    // Formatação para display mais amigável
    return name
      .split(/[\s&]+/)
      .map(word => 
        word.length > 2 
          ? word.charAt(0) + word.slice(1).toLowerCase() 
          : word
      )
      .join(' ');
  };

  const getDefaultCompanies = (): Company[] => {
    return [
      { id: 'univar', name: 'UNIVAR', displayName: 'UNIVAR Solutions' },
      { id: 'wanhua', name: 'WANHUA', displayName: 'WANHUA Chemical' },
      { id: 'dow', name: 'DOW', displayName: 'DOW Chemical' },
      { id: 'totalenergies', name: 'TOTALENERGIES', displayName: 'TotalEnergies' }
    ];
  };

  const handleCompanySelection = async (company: Company) => {
    try {
      console.log('🏢 Empresa selecionada:', company.name);
      
      // Salvar empresa selecionada
      setCurrentCompany(company);
      
      // Redirecionar para dashboard
      console.log('🚀 Redirecionando para dashboard...');
      router.push('/dashboard');
      
    } catch (error) {
      console.error('❌ Erro na seleção da empresa:', error);
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
            <p className="text-gray-600">Conectando com Asana e extraindo empresas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full">
        
        {/* Header */}
        <div className="text-center p-8 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Tracking Marítimo</h1>
          <p className="text-gray-600">Selecione sua empresa para acessar os processos</p>
          
          {/* System Status */}
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
              {systemStatus === 'online' ? `${companies.length} empresas detectadas` :
               systemStatus === 'offline' ? 'Sistema offline - usando dados padrão' :
               'Verificando sistema...'}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-8 mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <div>
                  <strong>Erro na conexão:</strong> {error}
                  <div className="mt-2 space-x-3">
                    <button 
                      onClick={loadCompaniesFromAsana}
                      className="text-red-600 hover:text-red-800 font-medium underline"
                    >
                      Tentar novamente
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                      <button 
                        onClick={handleDiagnosis}
                        className="text-red-600 hover:text-red-800 font-medium underline"
                      >
                        🔧 Diagnóstico
                      </button>
                    )}
                  </div>
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              <p className="text-gray-600 mb-4">
                Não foi possível extrair empresas dos dados do Asana.
              </p>
              <button
                onClick={loadCompaniesFromAsana}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 Recarregar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 text-center text-sm text-gray-500">
          <p>Sistema integrado com Asana • Dados em tempo real</p>
          {systemStatus === 'online' && (
            <p className="mt-1">Última sincronização: {new Date().toLocaleString('pt-BR')}</p>
          )}
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
      className="group bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <div className="flex flex-col items-center text-center">
        {/* Company Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <span className="text-white font-bold text-xl">
            {company.name.charAt(0)}
          </span>
        </div>
        
        {/* Company Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
          {company.name}
        </h3>
        
        {/* Display Name */}
        <p className="text-sm text-gray-500 group-hover:text-gray-700">
          {company.displayName}
        </p>
        
        {/* Hover Indicator */}
        <div className="mt-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-sm font-medium">Clique para acessar →</span>
        </div>
      </div>
    </button>
  );
}