// src/app/dashboard/page.tsx - Dashboard com debugger integrado
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';
import { ProcessesList } from '@/components/dashboard/ProcessesList';
import { NewMetricsCards } from '@/components/dashboard/NewMetricsCards';
import { NewChartsGrid } from '@/components/dashboard/NewChartsGrid';
import { AsanaDebugger } from '@/components/AsanaDebugger';
import { RefreshCw, AlertCircle, Bug, Settings } from 'lucide-react';

export default function DashboardPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [trackings, setTrackings] = useState<any[]>([]);
  const [filteredTrackings, setFilteredTrackings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [showDebugger, setShowDebugger] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (!company) {
      router.push('/login');
      return;
    }
    setCurrentCompany(company);
    fetchRobustData();
  }, [router]);

  const fetchRobustData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      console.log('🔄 Tentando API robusta...');
      
      // Tentar primeira a nova API robusta
      const robustResponse = await fetch(`/api/asana/robust?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (robustResponse.ok) {
        const result = await robustResponse.json();
        
        if (result.success) {
          console.log('✅ API Robusta funcionou!', result.meta);
          
          setTrackings(result.data);
          
          const company = getCurrentCompany();
          if (company) {
            // Filtrar por empresa
            const companyTrackings = result.data.filter((tracking: any) => 
              tracking.company && 
              tracking.company.toLowerCase().includes(company.name.toLowerCase())
            );
            
            console.log(`📊 Filtrados ${companyTrackings.length} trackings para ${company.name}`);
            
            setFilteredTrackings(companyTrackings);
            setMetrics(result.metrics);
            setLastSync(new Date().toLocaleTimeString('pt-BR'));
            setDebugMode(false); // Dados OK, não precisa de debug
          }
          
          return; // Sucesso, não tentar outras APIs
        }
      }
      
      console.log('⚠️ API Robusta falhou, tentando API original...');
      
      // Fallback para API original
      const fallbackResponse = await fetch(`/api/asana/fixed-trackings?t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      const result = await fallbackResponse.json();
      
      if (result.success) {
        console.log('✅ API original funcionou');
        
        setTrackings(result.data);
        
        const company = getCurrentCompany();
        if (company) {
          const companyTrackings = filterTrackingsByCompany(result.data, company.name);
          setFilteredTrackings(companyTrackings);
          
          const calculatedMetrics = recalculateMetricsForCompany(companyTrackings);
          setMetrics(calculatedMetrics);
        }
        
        setLastSync(new Date().toLocaleTimeString('pt-BR'));
        
        // Se chegou aqui mas dados estão vazios, ativar debug mode
        if (result.data.length === 0 || !result.data.some((t: any) => t.transport?.exporter)) {
          setDebugMode(true);
        }
      } else {
        throw new Error(result.error || 'Falha na API');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      setDebugMode(true); // Ativar debug quando há erro
      console.error('❌ Erro ao buscar dados:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const recalculateMetricsForCompany = (companyTrackings: any[]) => {
    // Implementação simplificada das métricas
    const total = companyTrackings.length;
    const completed = companyTrackings.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    
    return {
      totalOperations: total,
      activeOperations: active,
      completedOperations: completed,
      effectiveRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalContainers: 0,
      uniqueExporters: 0,
      uniqueShippingLines: 0,
      uniqueTerminals: 0,
      statusDistribution: {},
      exporterDistribution: {},
      armadorDistribution: {},
      productDistribution: {},
      orgaosAnuentesDistribution: {},
      etdTimeline: {}
    };
  };

  const handleLogout = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentCompany?.displayName || 'Dashboard'}
                {debugMode && (
                  <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                    MODO DEBUG
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600">
                Gestão de Processos de Importação
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowDebugger(!showDebugger)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <Bug className="h-4 w-4" />
                <span>{showDebugger ? 'Ocultar' : 'Debugger'}</span>
              </button>
              <button
                onClick={fetchRobustData}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          
          {/* Debug Info */}
          {lastSync && (
            <div className={`px-4 py-2 border rounded-lg ${
              debugMode 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm ${
                debugMode 
                  ? 'text-yellow-800' 
                  : 'text-green-800'
              }`}>
                {debugMode ? '⚠️ ' : '✅ '}
                Última sincronização: {lastSync} - {filteredTrackings.length} processos
                {debugMode && ' (DADOS INCOMPLETOS - USE O DEBUGGER)'}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="font-medium text-red-800">Erro na Integração</span>
              </div>
              <p className="text-red-700 mt-2">{error}</p>
              <button
                onClick={() => setShowDebugger(true)}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Abrir Debugger
              </button>
            </div>
          )}

          {/* Debugger */}
          {showDebugger && (
            <AsanaDebugger />
          )}

          {/* Dashboard Content */}
          {!error && (
            <>
              {/* 1. PROCESSOS DE IMPORTAÇÃO - PRIMEIRO */}
              <ProcessesList 
                trackings={filteredTrackings}
                company={currentCompany}
              />
              
              {/* 2. CARDS DE MÉTRICAS - SEGUNDO */}
              <NewMetricsCards metrics={metrics} />
              
              {/* 3. GRÁFICOS - TERCEIRO */}
              <NewChartsGrid metrics={metrics} />
            </>
          )}

          {/* Instruções quando em modo debug */}
          {debugMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                <Settings className="mr-2" />
                Como Corrigir os Dados do Asana
              </h3>
              <div className="space-y-3 text-blue-800">
                <p><strong>1.</strong> Clique no botão "Debugger" acima</p>
                <p><strong>2.</strong> Execute o "Diagnóstico Completo" para ver exatamente o que está faltando</p>
                <p><strong>3.</strong> Teste a "API Robusta" para ver se consegue extrair mais dados</p>
                <p><strong>4.</strong> Verifique se os custom fields no Asana estão preenchidos corretamente</p>
                <p><strong>5.</strong> Confirme se o projeto "Operacional" tem as tasks atualizadas</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}